"use client";

import CashCounter, {
  fmtINR,
  VarianceBanner,
} from "@/app/components/cash/CashCounter";
import { DateRangePicker } from "@/app/components/ui/DateRangePicker";
import StaffSidebar from "@/app/components/StaffSidebar";
import { api } from "@/app/lib/api";
import {
  Download,
  FileText,
  Loader2,
  Lock,
  Minus,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Unlock,
  X,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";

type EventType =
  | "open"
  | "close"
  | "cash_in"
  | "cash_out"
  | "sale"
  | "no_sale";

type CashDrawerEvent = {
  id: string;
  event_type: EventType | string;
  amount: number;
  note: string;
  user_name: string;
  created_at: string;
};

type CashDrawerSummary = {
  opening_float: number;
  total_cash_in: number;
  total_cash_out: number;
  total_sales: number;
  expected_cash: number;
  is_open: boolean;
  opened_at?: string;
  events: CashDrawerEvent[];
  last_closed_amount?: number;
  last_expected_amount?: number;
  last_discrepancy?: number;
  last_closed_at?: string;
  last_closed_by?: string;
};

type ActiveShift = { id: string; user_name: string; role: string };

type ModalType = "open" | "cash_in" | "cash_out" | "close";

const CATEGORIES: Record<"cash_in" | "cash_out", string[]> = {
  cash_in: ["Change / float top-up", "Owner deposit", "Tips received", "Other"],
  cash_out: [
    "Petty cash",
    "Supplier payment",
    "Staff advance",
    "Tips payout",
    "Safe drop / bank deposit",
    "Other",
  ],
};

const MODAL_META: Record<
  ModalType,
  { title: string; amountLabel: string; cta: string; tone: string }
> = {
  open: {
    title: "Open cash drawer",
    amountLabel: "Starting float",
    cta: "Open drawer",
    tone: "",
  },
  cash_in: {
    title: "Pay in to drawer",
    amountLabel: "Amount added",
    cta: "Record pay-in",
    tone: "",
  },
  cash_out: {
    title: "Pay out from drawer",
    amountLabel: "Amount taken out",
    cta: "Record pay-out",
    tone: "",
  },
  close: {
    title: "Close and reconcile",
    amountLabel: "Counted cash",
    cta: "Close drawer",
    tone: "",
  },
};

const EVENT_LABEL: Record<string, string> = {
  open: "Opened",
  close: "Closed",
  cash_in: "Pay in",
  cash_out: "Pay out",
  sale: "Cash sale",
  no_sale: "No sale",
};

const EVENT_DOT: Record<string, string> = {
  open: "bg-[#0F1117]",
  close: "bg-[#9CA3AF]",
  cash_in: "bg-emerald-500",
  cash_out: "bg-amber-500",
  sale: "bg-emerald-500",
  no_sale: "bg-[#D6D6CF]",
};

const DISCREPANCY_RE = /^\[Discrepancy: ([^\]]+)\]\s*/;

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const localDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const dayStartIso = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
};
const dayEndIso = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
};

const fmtDateTime = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}, ${d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`;
};

const isOutflow = (t: string) => t === "cash_out";
const isInflow = (t: string) => t === "cash_in" || t === "sale" || t === "open";

function summarize(events: CashDrawerEvent[]) {
  let cashIn = 0;
  let cashOut = 0;
  let sales = 0;
  let shortages = 0;
  let overages = 0;
  let closings = 0;
  let noSales = 0;
  events.forEach((ev) => {
    if (ev.event_type === "cash_in") cashIn += ev.amount;
    if (ev.event_type === "cash_out") cashOut += ev.amount;
    if (ev.event_type === "sale") sales += ev.amount;
    if (ev.event_type === "no_sale") noSales++;
    if (ev.event_type === "close") {
      closings++;
      const m = (ev.note || "").match(/^\[Discrepancy: (\w+) of ₹([^ ]+) /);
      if (m) {
        const amt = parseFloat(m[2].replace(/,/g, ""));
        if (!isNaN(amt)) {
          if (m[1].toLowerCase() === "shortage") shortages += amt;
          else overages += amt;
        }
      }
    }
  });
  return { cashIn, cashOut, sales, shortages, overages, closings, noSales };
}

export default function CashDrawerPage() {
  const [summary, setSummary] = useState<CashDrawerSummary | null>(null);
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);
  const [userRole, setUserRole] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  // modal form
  const [modal, setModal] = useState<ModalType | null>(null);
  const [amount, setAmount] = useState("");
  const [counted, setCounted] = useState<number | null>(null);
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");

  // ledger filters
  const [activeTab, setActiveTab] = useState<"today" | "history">("today");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // history
  const [rangeStart, setRangeStart] = useState(localDay(new Date()));
  const [rangeEnd, setRangeEnd] = useState(localDay(new Date()));
  const [rangeEvents, setRangeEvents] = useState<CashDrawerEvent[]>([]);
  const [isRangeLoading, setIsRangeLoading] = useState(false);
  const [hasQueriedRange, setHasQueriedRange] = useState(false);

  const canAudit = ["owner", "manager"].includes(userRole.toLowerCase());

  const fetchDrawerData = useCallback(async (silent = false) => {
    try {
      const [sumRes, shiftRes, meRes] = await Promise.all([
        api<CashDrawerSummary>("/api/admin/cash-drawer/summary", {
          noCache: true,
        }),
        api<{ shift: ActiveShift | null; is_clocked_in: boolean }>(
          "/api/admin/shifts/active",
        ).catch(() => ({ shift: null, is_clocked_in: false })),
        api<{ role?: string }>("/api/admin/me").catch(() => null),
      ]);
      if (sumRes) setSummary({ ...sumRes, events: sumRes.events || [] });
      setActiveShift(shiftRes?.is_clocked_in ? shiftRes.shift : null);
      if (meRes?.role) setUserRole(meRes.role);
      setLastSynced(new Date());
    } catch {
      if (!silent) toast.error("Failed to load cash drawer");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDrawerData();
    const t = setInterval(() => void fetchDrawerData(true), 30000);
    return () => clearInterval(t);
  }, [fetchDrawerData]);

  const queryRange = useCallback(async (start: string, end: string) => {
    if (start > end) {
      toast.error("Start date is after end date");
      return;
    }
    setIsRangeLoading(true);
    try {
      const data = await api<CashDrawerEvent[]>(
        `/api/admin/cash-drawer/events/range?start=${encodeURIComponent(dayStartIso(start))}&end=${encodeURIComponent(dayEndIso(end))}`,
        { noCache: true },
      );
      setRangeEvents(Array.isArray(data) ? data : []);
      setHasQueriedRange(true);
    } catch {
      toast.error("Failed to load historical audits");
    } finally {
      setIsRangeLoading(false);
    }
  }, []);

  const applyPreset = (days: number, yesterday = false) => {
    const end = new Date();
    if (yesterday) end.setDate(end.getDate() - 1);
    const start = new Date(end);
    start.setDate(start.getDate() - days);
    const s = localDay(start);
    const e = localDay(end);
    setRangeStart(s);
    setRangeEnd(e);
    void queryRange(s, e);
  };

  const openModal = (type: ModalType) => {
    setModal(type);
    setNote("");
    setCategory("");
    setCounted(null);
    setAmount(
      type === "open" && summary?.last_closed_amount
        ? String(summary.last_closed_amount)
        : "",
    );
  };

  const closeModal = () => {
    setModal(null);
    setAmount("");
    setCounted(null);
    setNote("");
    setCategory("");
  };

  const expected = summary?.expected_cash ?? 0;
  const parsedAmount =
    modal === "close" ? counted : amount === "" ? null : parseFloat(amount);
  const closeDiff =
    modal === "close" && counted !== null
      ? Math.round((counted - expected) * 100) / 100
      : 0;

  const handleRecordEvent = async (
    e?: React.FormEvent,
    forcedType?: "no_sale",
  ) => {
    e?.preventDefault();
    const type = forcedType || modal;
    if (!type) return;

    let amt = 0;
    let finalNote = note.trim();

    if (type !== "no_sale") {
      if (parsedAmount === null || isNaN(parsedAmount) || parsedAmount < 0) {
        toast.error(
          modal === "close"
            ? "Count the cash in the drawer first"
            : "Enter a valid amount",
        );
        return;
      }
      amt = parsedAmount;
      if ((type === "cash_in" || type === "cash_out") && !category) {
        toast.error("Choose a reason category");
        return;
      }
      if (type === "cash_out" && amt > expected) {
        toast.error(
          `Only ${fmtINR(expected)} is expected in the drawer — you can't pay out more.`,
        );
        return;
      }
      if (type === "close" && closeDiff !== 0 && !finalNote) {
        toast.error("Explain the cash difference before closing");
        return;
      }
      if (type === "cash_in" || type === "cash_out") {
        finalNote = `[${category}]${finalNote ? " " + finalNote : ""}`;
      }
      if (type === "close" && closeDiff !== 0) {
        finalNote = `[Discrepancy: ${closeDiff < 0 ? "Shortage" : "Overage"} of ${fmtINR(Math.abs(closeDiff))} (Expected: ${fmtINR(expected)}, Actual: ${fmtINR(amt)})] ${finalNote}`.trim();
      }
    }

    setIsActionLoading(true);
    try {
      await api("/api/admin/cash-drawer/event", {
        method: "POST",
        body: JSON.stringify({
          event_type: type,
          amount: amt,
          note: finalNote,
          shift_id: activeShift?.id || "",
        }),
      });
      toast.success(
        {
          open: "Drawer opened",
          close: "Drawer closed",
          cash_in: "Pay-in recorded",
          cash_out: "Pay-out recorded",
          no_sale: "No-sale logged",
        }[type] || "Recorded",
      );
      closeModal();
      await fetchDrawerData(true);
    } catch (err) {
      toast.error((err as Error)?.message || "Failed to record event");
    } finally {
      setIsActionLoading(false);
    }
  };

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return (summary?.events || []).filter((ev) => {
      if (typeFilter !== "all" && ev.event_type !== typeFilter) return false;
      if (!q) return true;
      return (
        ev.user_name.toLowerCase().includes(q) ||
        (EVENT_LABEL[ev.event_type] || ev.event_type).toLowerCase().includes(q) ||
        (ev.note || "").toLowerCase().includes(q) ||
        String(ev.amount).includes(q)
      );
    });
  }, [summary, typeFilter, searchQuery]);

  const rangeStats = useMemo(() => summarize(rangeEvents), [rangeEvents]);

  const exportCsv = (events: CashDrawerEvent[], name: string) => {
    const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const rows = [
      ["Time", "User", "Type", "Amount", "Note"],
      ...events.map((ev) => [
        new Date(ev.created_at).toLocaleString("en-IN"),
        ev.user_name,
        EVENT_LABEL[ev.event_type] || ev.event_type,
        ev.amount,
        ev.note || "",
      ]),
    ];
    const blob = new Blob([rows.map((r) => r.map(q).join(",")).join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${name}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const printReport = (events: CashDrawerEvent[], start: string, end: string) => {
    const w = window.open("", "_blank");
    if (!w) {
      toast.error("Allow popups to generate the report");
      return;
    }
    const s = summarize(events);
    const money = (n: number) =>
      n.toLocaleString("en-IN", { minimumFractionDigits: 2 });
    const rowsHtml = events
      .map((ev) => {
        const raw = ev.note || "";
        const m = raw.match(DISCREPANCY_RE);
        const noteHtml = m
          ? `<b style="color:${m[1].toLowerCase().startsWith("short") ? "#be123c" : "#b45309"}">⚠ ${esc(m[1])}</b><br/>${esc(raw.replace(DISCREPANCY_RE, ""))}`
          : esc(raw) || "--";
        return `<tr><td>${esc(new Date(ev.created_at).toLocaleString("en-IN"))}</td><td>${esc(ev.user_name)}</td><td>${esc(EVENT_LABEL[ev.event_type] || ev.event_type)}</td><td style="text-align:right;font-weight:700">${isOutflow(ev.event_type) ? "−" : ""}₹${money(ev.amount)}</td><td>${noteHtml}</td></tr>`;
      })
      .join("");
    const net = s.overages - s.shortages;
    w.document.write(`<html><head><title>Cash drawer report ${esc(start)} to ${esc(end)}</title>
<style>
body{font-family:-apple-system,Segoe UI,sans-serif;color:#0f172a;padding:32px;font-size:12px}
h1{margin:0;font-size:22px}.sub{color:#64748b;margin:4px 0 20px}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px}
.card{border:1px solid #e2e8f0;border-radius:10px;padding:12px;background:#f8fafc;print-color-adjust:exact}
.card small{display:block;text-transform:uppercase;letter-spacing:.06em;font-size:9px;color:#94a3b8;font-weight:800}
.card b{font-size:17px}
table{width:100%;border-collapse:collapse}th{text-align:left;background:#f1f5f9;padding:8px;font-size:10px;text-transform:uppercase;color:#64748b;print-color-adjust:exact}
td{padding:8px;border-bottom:1px solid #f1f5f9;vertical-align:top}
</style></head><body>
<h1>Cash drawer audit report</h1>
<div class="sub">${esc(start)} to ${esc(end)} · generated ${esc(new Date().toLocaleString("en-IN"))} · ${s.closings} closing(s)</div>
<div class="grid">
<div class="card"><small>Cash sales</small><b>₹${money(s.sales)}</b></div>
<div class="card"><small>Pay-ins</small><b style="color:#059669">+₹${money(s.cashIn)}</b></div>
<div class="card"><small>Pay-outs</small><b style="color:#d97706">−₹${money(s.cashOut)}</b></div>
<div class="card"><small>Net variance</small><b style="color:${net < 0 ? "#be123c" : "#059669"}">${net < 0 ? "−" : "+"}₹${money(Math.abs(net))}</b></div>
</div>
<table><thead><tr><th>Time</th><th>User</th><th>Type</th><th style="text-align:right">Amount</th><th>Note</th></tr></thead><tbody>${rowsHtml}</tbody></table>
<script>window.onload=function(){window.print()}</script></body></html>`);
    w.document.close();
  };

  const renderNote = (raw: string) => {
    const m = (raw || "").match(DISCREPANCY_RE);
    const rest = (raw || "").replace(DISCREPANCY_RE, "");
    if (!m) {
      if (!raw) return <span className="text-[#C4C4BE]">—</span>;
      const cat = raw.match(/^\[([^\]]+)\]\s*(.*)$/);
      if (!cat) return <span className="text-[#4B5563]">{raw}</span>;
      return (
        <div>
          <span className="text-[#0F1117]">{cat[1]}</span>
          {cat[2] && <p className="mt-0.5 text-[#6B7280]">{cat[2]}</p>}
        </div>
      );
    }
    const short = m[1].toLowerCase().startsWith("short");
    return (
      <div>
        <span className={`font-medium ${short ? "text-rose-700" : "text-amber-700"}`}>{m[1]}</span>
        {rest && <p className="mt-0.5 text-[#6B7280]">{rest}</p>}
      </div>
    );
  };

  const EventTable = ({ events, emptyText }: { events: CashDrawerEvent[]; emptyText: string }) => (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-[14px]">
        <thead>
          <tr className="border-b border-[#F0F0EB] text-[12px] font-medium text-[#6B7280]">
            <th className="px-6 py-3 font-medium">Time</th>
            <th className="px-6 py-3 font-medium">By</th>
            <th className="px-6 py-3 font-medium">Entry</th>
            <th className="px-6 py-3 text-right font-medium">Amount</th>
            <th className="px-6 py-3 font-medium">Reason</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F0F0EB]">
          {events.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-6 py-16 text-center text-[14px] text-[#6B7280]">
                {emptyText}
              </td>
            </tr>
          ) : (
            events.map((ev) => {
              const out = isOutflow(ev.event_type);
              const inn = isInflow(ev.event_type);
              return (
                <tr key={ev.id} className="transition-colors hover:bg-[#FAFAF7]/70">
                  <td className="whitespace-nowrap px-6 py-4 tabular-nums text-[#6B7280]">
                    {fmtDateTime(ev.created_at)}
                  </td>
                  <td className="px-6 py-4 capitalize text-[#0F1117]">{ev.user_name}</td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className="inline-flex items-center gap-2 text-[#374151]">
                      <span className={`h-1.5 w-1.5 rounded-full ${EVENT_DOT[ev.event_type] || "bg-[#D6D6CF]"}`} />
                      {EVENT_LABEL[ev.event_type] || ev.event_type}
                    </span>
                  </td>
                  <td
                    className={`whitespace-nowrap px-6 py-4 text-right font-medium tabular-nums ${out ? "text-amber-700" : inn ? "text-emerald-700" : "text-[#C4C4BE]"}`}
                  >
                    {ev.event_type === "no_sale"
                      ? "—"
                      : `${out ? "−" : inn ? "+" : ""}${fmtINR(ev.amount)}`}
                  </td>
                  <td className="max-w-xs px-6 py-4">{renderNote(ev.note)}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );

  const btnSecondary =
    "inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-[#E8E8E3] bg-white px-3.5 text-[13px] font-semibold text-[#0F1117] transition-colors hover:border-[#D6D6CF] hover:bg-[#FAFAF7] disabled:cursor-not-allowed disabled:opacity-50";
  const btnPrimary =
    "inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-[#0F1117] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-50";
  const segWrap = "inline-flex h-9 flex-wrap items-center gap-0.5 rounded-xl bg-[#F3F3EF] p-1";
  const seg = (active: boolean) =>
    `flex h-7 items-center whitespace-nowrap rounded-lg px-3 text-[12px] font-medium transition-colors ${active ? "bg-white font-semibold text-[#0F1117] shadow-[0_1px_2px_rgba(15,17,23,0.06)]" : "text-[#6B7280] hover:text-[#0F1117]"}`;
  const field =
    "h-10 rounded-xl border border-[#E8E8E3] bg-white px-3.5 text-[14px] text-[#0F1117] outline-none transition-colors placeholder:text-[#9CA3AF] hover:border-[#D6D6CF]";

  const isOpen = !!summary?.is_open;
  const breakdown = summary
    ? [
        { label: "Opening float", op: "", value: summary.opening_float },
        { label: "Cash sales", op: "+", value: summary.total_sales },
        { label: "Pay-ins", op: "+", value: summary.total_cash_in },
        { label: "Pay-outs", op: "−", value: summary.total_cash_out },
      ]
    : [];

  return (
    <div className="flex h-screen overflow-hidden bg-[#FAFAF7] text-[#0F1117]">
      <StaffSidebar />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="shrink-0 border-b border-[#E8E8E3] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-8 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[22px] font-bold leading-none tracking-[-0.02em] text-[#0F1117]">Cash drawer</h1>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium leading-none ${isOpen ? "bg-emerald-50 text-emerald-700" : "bg-[#F3F3EF] text-[#6B7280]"}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${isOpen ? "bg-emerald-500" : "bg-[#9CA3AF]"}`} />
                {isOpen ? "Open" : "Closed"}
              </span>
              {isOpen && summary?.opened_at && (
                <span className="text-[13px] text-[#6B7280]">since {fmtDateTime(summary.opened_at)}</span>
              )}
              {activeShift && (
                <span className="border-l border-[#E8E8E3] pl-3 text-[13px] text-[#6B7280]">
                  <span className="font-medium capitalize text-[#374151]">{activeShift.user_name}</span> on shift
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isOpen ? (
                <>
                  <button onClick={() => openModal("cash_in")} className={btnSecondary}>
                    <Plus className="h-4 w-4 text-[#9CA3AF]" /> Pay in
                  </button>
                  <button onClick={() => openModal("cash_out")} className={btnSecondary}>
                    <Minus className="h-4 w-4 text-[#9CA3AF]" /> Pay out
                  </button>
                  <button
                    onClick={() => void handleRecordEvent(undefined, "no_sale")}
                    disabled={isActionLoading}
                    title="Log that the drawer was opened without a sale"
                    className={btnSecondary}
                  >
                    No sale
                  </button>
                  <button onClick={() => openModal("close")} className={`${btnPrimary} ml-2`}>
                    <Lock className="h-4 w-4" /> Close drawer
                  </button>
                </>
              ) : (
                <button onClick={() => openModal("open")} className={btnPrimary}>
                  <Unlock className="h-4 w-4" /> Open drawer
                </button>
              )}
              <button
                onClick={async () => {
                  setIsRefreshing(true);
                  await fetchDrawerData();
                  setIsRefreshing(false);
                }}
                title={lastSynced ? `Synced ${lastSynced.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}. Refreshes every 30 seconds.` : "Refresh"}
                aria-label="Refresh"
                className="ml-1 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-[#9CA3AF] transition-colors hover:bg-[#F3F3EF] hover:text-[#0F1117]"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {isOpen && summary && (
            <div className="px-8 pb-8">
              <div className="grid gap-8 rounded-2xl border border-[#E8E8E3] bg-[#FAFAF7] px-8 py-7 lg:grid-cols-[minmax(240px,0.9fr)_2fr] lg:items-end">
                <div>
                  <p className="text-[13px] font-medium text-[#6B7280]">Expected in drawer</p>
                  <p className="mt-2.5 text-[40px] font-bold leading-none tracking-[-0.03em] tabular-nums text-[#0F1117]">
                    {fmtINR(summary.expected_cash)}
                  </p>
                </div>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-[#E8E8E3] pt-6 sm:grid-cols-4 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
                  {breakdown.map((b) => (
                    <div key={b.label}>
                      <dt className="text-[13px] text-[#6B7280]">{b.label}</dt>
                      <dd className={`mt-1.5 text-[18px] font-medium tabular-nums ${b.value ? "text-[#0F1117]" : "text-[#9CA3AF]"}`}>
                        {b.op && <span className="mr-1 text-[#9CA3AF]">{b.op}</span>}
                        {fmtINR(b.value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          )}

          {!isOpen && !!summary?.last_discrepancy && summary.last_discrepancy !== 0 && (
            <div className="px-8 pb-8">
              <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-[#E8E8E3] bg-white px-6 py-5">
                <div className="flex items-start gap-3">
                  <ShieldAlert className={`mt-0.5 h-5 w-5 shrink-0 ${summary.last_discrepancy < 0 ? "text-rose-600" : "text-amber-600"}`} />
                  <div>
                    <p className="text-[14px] font-medium text-[#0F1117]">
                      Last close was {fmtINR(Math.abs(summary.last_discrepancy))}{" "}
                      {summary.last_discrepancy < 0 ? "short" : "over"}
                    </p>
                    <p className="mt-1 text-[13px] text-[#6B7280]">
                      Expected {fmtINR(summary.last_expected_amount || 0)}, counted{" "}
                      {fmtINR(summary.last_closed_amount || 0)}.
                    </p>
                  </div>
                </div>
                {summary.last_closed_at && (
                  <p className="text-[13px] text-[#6B7280]">
                    Closed by <span className="capitalize text-[#374151]">{summary.last_closed_by || "unknown"}</span>,{" "}
                    {fmtDateTime(summary.last_closed_at)}
                  </p>
                )}
              </div>
            </div>
          )}

          {canAudit && (
            <nav className="flex gap-7 overflow-x-auto px-8">
              {(
                [
                  ["today", "This session"],
                  ["history", "Audit explorer"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => {
                    setActiveTab(id);
                    if (id === "history" && !hasQueriedRange) void queryRange(rangeStart, rangeEnd);
                  }}
                  className={`-mb-px cursor-pointer whitespace-nowrap border-b-2 py-3.5 text-[14px] transition-colors ${activeTab === id ? "border-[#fe5c13] font-semibold text-[#0F1117]" : "border-transparent font-medium text-[#6B7280] hover:text-[#0F1117]"}`}
                >
                  {label}
                </button>
              ))}
            </nav>
          )}
        </header>

        <main className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex min-h-[50vh] items-center justify-center gap-2 text-[14px] text-[#6B7280]">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading the drawer
            </div>
          ) : activeTab === "today" || !canAudit ? (
            <div className="px-8 py-8">
              {!isOpen && (summary?.events.length ?? 0) === 0 ? (
                <div className="mx-auto mt-8 max-w-md rounded-2xl border border-[#E8E8E3] bg-white px-8 py-12 text-center">
                  <h3 className="text-[18px] font-bold tracking-[-0.01em] text-[#0F1117]">The drawer is closed</h3>
                  <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-[#6B7280]">
                    Count the starting float and open the drawer to track cash sales, pay-ins and pay-outs.
                  </p>
                  <button onClick={() => openModal("open")} className={`${btnPrimary} mt-6`}>
                    <Unlock className="h-4 w-4" /> Open drawer
                  </button>
                </div>
              ) : (
                <section className="rounded-2xl border border-[#E8E8E3] bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0F0EB] px-6 py-4">
                    <div className={segWrap} role="tablist" aria-label="Filter entries">
                      {["all", "sale", "cash_in", "cash_out", "no_sale", "open", "close"].map((t) => (
                        <button key={t} role="tab" aria-selected={typeFilter === t} onClick={() => setTypeFilter(t)} className={seg(typeFilter === t)}>
                          {t === "all" ? "All" : EVENT_LABEL[t]}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                        <input
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search entries"
                          aria-label="Search entries"
                          className={`${field} w-56 pl-10`}
                        />
                      </div>
                      <button
                        onClick={() => exportCsv(filteredEvents, `cash-drawer-${localDay(new Date())}`)}
                        disabled={filteredEvents.length === 0}
                        className={btnSecondary}
                      >
                        <Download className="h-4 w-4 text-[#9CA3AF]" /> Export CSV
                      </button>
                    </div>
                  </div>
                  <EventTable
                    events={filteredEvents}
                    emptyText={searchQuery || typeFilter !== "all" ? "No entries match these filters." : "Nothing recorded in this session yet."}
                  />
                  {filteredEvents.length > 0 && (
                    <p className="border-t border-[#F0F0EB] px-6 py-3 text-[13px] text-[#6B7280]">
                      {filteredEvents.length} {filteredEvents.length === 1 ? "entry" : "entries"}
                    </p>
                  )}
                </section>
              )}
            </div>
          ) : (
            <div className="space-y-6 px-8 py-8">
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#E8E8E3] bg-white px-5 py-4">
                <div className={segWrap} role="tablist" aria-label="Quick ranges">
                  {(
                    [
                      ["Today", 0, false],
                      ["Yesterday", 0, true],
                      ["Last 7 days", 6, false],
                      ["Last 30 days", 29, false],
                    ] as const
                  ).map(([label, days, yest]) => {
                    const end = new Date();
                    if (yest) end.setDate(end.getDate() - 1);
                    const start = new Date(end);
                    start.setDate(start.getDate() - days);
                    const active = localDay(start) === rangeStart && localDay(end) === rangeEnd;
                    return (
                      <button
                        key={label}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => applyPreset(days, yest)}
                        className={seg(active)}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <DateRangePicker
                  from={rangeStart}
                  to={rangeEnd}
                  onChange={(f, t) => {
                    setRangeStart(f);
                    setRangeEnd(t);
                    void queryRange(f, t);
                  }}
                />
                {isRangeLoading && (
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-[#6B7280]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading
                  </span>
                )}
                <div className="flex-1" />
                <button
                  type="button"
                  disabled={rangeEvents.length === 0}
                  onClick={() => exportCsv(rangeEvents, `cash-drawer-${rangeStart}_${rangeEnd}`)}
                  className={btnSecondary}
                >
                  <Download className="h-4 w-4 text-[#6B7280]" /> Export CSV
                </button>
                <button
                  type="button"
                  disabled={rangeEvents.length === 0}
                  onClick={() => printReport(rangeEvents, rangeStart, rangeEnd)}
                  className={btnSecondary}
                >
                  <FileText className="h-4 w-4 text-[#6B7280]" /> Print report
                </button>
              </div>

              {hasQueriedRange && (
                <>
                  <dl className="grid grid-cols-2 divide-[#F0F0EB] rounded-2xl border border-[#E8E8E3] bg-white sm:grid-cols-5 sm:divide-x">
                    {[
                      { l: "Cash sales", v: rangeStats.sales, op: "" , tone: "" },
                      { l: "Pay-ins", v: rangeStats.cashIn, op: "+", tone: "" },
                      { l: "Pay-outs", v: rangeStats.cashOut, op: "−", tone: "" },
                      { l: "Shortages", v: rangeStats.shortages, op: "", tone: rangeStats.shortages ? "text-rose-700" : "" },
                      { l: "Overages", v: rangeStats.overages, op: "", tone: rangeStats.overages ? "text-amber-700" : "" },
                    ].map((k) => (
                      <div key={k.l} className="px-6 py-5">
                        <dt className="text-[13px] text-[#6B7280]">{k.l}</dt>
                        <dd className={`mt-1.5 text-[18px] font-medium tabular-nums ${k.tone || (k.v ? "text-[#0F1117]" : "text-[#9CA3AF]")}`}>
                          {k.op && <span className="mr-1 text-[#9CA3AF]">{k.op}</span>}
                          {fmtINR(k.v)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <section className="rounded-2xl border border-[#E8E8E3] bg-white">
                    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#F0F0EB] px-6 py-4">
                      <h2 className="text-[15px] font-semibold text-[#0F1117]">Audit log</h2>
                      <span className="text-[13px] text-[#6B7280]">
                        {rangeEvents.length} {rangeEvents.length === 1 ? "entry" : "entries"}, {rangeStats.closings}{" "}
                        {rangeStats.closings === 1 ? "closing" : "closings"}
                        {rangeStats.noSales ? `, ${rangeStats.noSales} no-sale` : ""}
                      </span>
                    </div>
                    <EventTable events={rangeEvents} emptyText="No drawer activity in this date range." />
                  </section>
                </>
              )}
            </div>
          )}

          {modal && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F1117]/50 p-4 backdrop-blur-sm"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget && !isActionLoading) closeModal();
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="drawer-modal-title"
                className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-[24px] bg-white shadow-[0_40px_100px_-30px_rgba(15,17,23,0.5)]"
              >
                <div className="flex items-start justify-between gap-4 px-7 pt-7">
                  <div>
                    <h3 id="drawer-modal-title" className="text-[20px] font-bold leading-tight tracking-[-0.02em] text-[#0F1117]">
                      {MODAL_META[modal].title}
                    </h3>
                    {(modal === "cash_out" || modal === "close") && (
                      <p className="mt-1.5 text-[14px] text-[#6B7280]">
                        {fmtINR(expected)} expected in the drawer
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={closeModal}
                    aria-label="Close"
                    className="-mr-2 rounded-full p-2 text-[#9CA3AF] transition-colors hover:bg-[#F3F3EF] hover:text-[#0F1117]"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleRecordEvent} className="space-y-6 px-7 pb-7 pt-6">
                  {modal === "close" ? (
                    <>
                      <CashCounter onChange={setCounted} autoFocus />
                      <VarianceBanner expected={expected} counted={counted} />
                    </>
                  ) : (
                    <div>
                      <label htmlFor="drawer-amount" className="mb-2 block text-[13px] font-medium text-[#4B5563]">
                        {MODAL_META[modal].amountLabel}
                      </label>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-[#9CA3AF]">₹</span>
                        <input
                          id="drawer-amount"
                          type="number"
                          step="0.01"
                          min={0}
                          inputMode="decimal"
                          autoFocus
                          required
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.00"
                          className="h-14 w-full rounded-xl border border-[#E8E8E3] bg-[#FAFAF7] pl-10 pr-4 text-[24px] font-medium tabular-nums text-[#0F1117] outline-none placeholder:text-[#C4C4BE] hover:border-[#D6D6CF] focus:bg-white"
                        />
                      </div>
                    </div>
                  )}

                  {(modal === "cash_in" || modal === "cash_out") && (
                    <div>
                      <span className="mb-2 block text-[13px] font-medium text-[#4B5563]">Reason</span>
                      <div className="flex flex-wrap gap-2">
                        {CATEGORIES[modal].map((c) => (
                          <button
                            key={c}
                            type="button"
                            aria-pressed={category === c}
                            onClick={() => setCategory(c)}
                            className={`rounded-lg border px-3 py-2 text-[13px] font-medium transition-colors ${category === c ? "border-[#0F1117] bg-[#0F1117] text-white" : "border-[#E8E8E3] bg-white text-[#4B5563] hover:border-[#D6D6CF] hover:text-[#0F1117]"}`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label htmlFor="drawer-note" className="mb-2 block text-[13px] font-medium text-[#4B5563]">
                      Note{modal === "close" && closeDiff !== 0 ? " (required for a difference)" : " (optional)"}
                    </label>
                    <textarea
                      id="drawer-note"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder={
                        modal === "close"
                          ? "Explain any difference, handover details"
                          : modal === "open"
                            ? "Anything the next person should know"
                            : "Bill number, vendor, who received it"
                      }
                      className="h-24 w-full resize-none rounded-xl border border-[#E8E8E3] bg-[#FAFAF7] px-4 py-3 text-[14px] leading-relaxed text-[#0F1117] outline-none placeholder:text-[#9CA3AF] hover:border-[#D6D6CF] focus:bg-white"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="h-11 cursor-pointer rounded-xl px-5 text-[14px] font-medium text-[#4B5563] transition-colors hover:text-[#0F1117]"
                    >
                      Cancel
                    </button>
                    <button type="submit" disabled={isActionLoading} className={`${btnPrimary} h-11 px-6`}>
                      {isActionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                      {isActionLoading ? "Saving" : MODAL_META[modal].cta}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
