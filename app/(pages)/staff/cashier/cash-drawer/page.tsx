"use client";

import CashCounter, {
  fmtINR,
  VarianceBanner,
} from "@/app/components/cash/CashCounter";
import StaffSidebar from "@/app/components/StaffSidebar";
import { api } from "@/app/lib/api";
import {
  Banknote,
  Calendar,
  CircleDollarSign,
  Clock,
  Download,
  FileText,
  History,
  Landmark,
  Lock,
  MinusCircle,
  PlusCircle,
  RefreshCw,
  Search,
  ShieldAlert,
  Unlock,
  XCircle,
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
    amountLabel: "Starting float (₹)",
    cta: "Open drawer",
    tone: "bg-emerald-600 hover:bg-emerald-700",
  },
  cash_in: {
    title: "Pay in to drawer",
    amountLabel: "Amount added (₹)",
    cta: "Record pay-in",
    tone: "bg-emerald-600 hover:bg-emerald-700",
  },
  cash_out: {
    title: "Pay out from drawer",
    amountLabel: "Amount taken out (₹)",
    cta: "Record pay-out",
    tone: "bg-amber-600 hover:bg-amber-700",
  },
  close: {
    title: "Close & reconcile",
    amountLabel: "Counted cash",
    cta: "Close drawer",
    tone: "bg-rose-600 hover:bg-rose-700",
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

const EVENT_BADGE: Record<string, string> = {
  open: "bg-indigo-50 text-indigo-700 border-indigo-100",
  close: "bg-rose-50 text-rose-700 border-rose-100",
  cash_in: "bg-emerald-50 text-emerald-700 border-emerald-100",
  cash_out: "bg-amber-50 text-amber-700 border-amber-100",
  sale: "bg-sky-50 text-sky-700 border-sky-100",
  no_sale: "bg-slate-100 text-slate-600 border-slate-200",
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

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

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
    if (!m) return <span className="text-slate-500">{raw || "--"}</span>;
    const short = m[1].toLowerCase().startsWith("short");
    return (
      <div>
        <span
          className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-black ${short ? "border-rose-200 bg-rose-50 text-rose-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}
        >
          {m[1]}
        </span>
        {raw.replace(DISCREPANCY_RE, "") && (
          <p className="mt-1 text-slate-500">{raw.replace(DISCREPANCY_RE, "")}</p>
        )}
      </div>
    );
  };

  const EventTable = ({ events }: { events: CashDrawerEvent[] }) => (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-black uppercase tracking-wider text-slate-400">
            <th className="px-6 py-3.5">Time</th>
            <th className="px-6 py-3.5">User</th>
            <th className="px-6 py-3.5">Type</th>
            <th className="px-6 py-3.5 text-right">Amount</th>
            <th className="px-6 py-3.5">Reason / context</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {events.length === 0 ? (
            <tr>
              <td
                colSpan={5}
                className="px-6 py-14 text-center text-xs font-bold uppercase tracking-wider text-slate-400"
              >
                No events to show
              </td>
            </tr>
          ) : (
            events.map((ev) => (
              <tr key={ev.id} className="hover:bg-slate-50/60">
                <td className="whitespace-nowrap px-6 py-3.5 font-medium text-slate-500">
                  {fmtDateTime(ev.created_at)}
                </td>
                <td className="px-6 py-3.5 font-bold text-slate-800">
                  {ev.user_name}
                </td>
                <td className="px-6 py-3.5">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${EVENT_BADGE[ev.event_type] || "bg-slate-50 text-slate-700 border-slate-200"}`}
                  >
                    {EVENT_LABEL[ev.event_type] || ev.event_type}
                  </span>
                </td>
                <td
                  className={`px-6 py-3.5 text-right font-mono text-[13px] font-bold tabular-nums ${isOutflow(ev.event_type) ? "text-amber-600" : isInflow(ev.event_type) ? "text-emerald-700" : "text-slate-700"}`}
                >
                  {ev.event_type === "no_sale"
                    ? "--"
                    : `${isOutflow(ev.event_type) ? "−" : isInflow(ev.event_type) ? "+" : ""}${fmtINR(ev.amount)}`}
                </td>
                <td className="max-w-xs px-6 py-3.5">{renderNote(ev.note)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const btn =
    "inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shadow-sm";

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans text-slate-900">
      <StaffSidebar />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="shrink-0 border-b border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-4 px-8 pb-3 pt-5">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-600">
                <CircleDollarSign size={22} className="stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl font-bold tracking-tight">Cash drawer</h1>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${summary?.is_open ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-500"}`}
                  >
                    {summary?.is_open ? (
                      <Unlock className="h-3 w-3" />
                    ) : (
                      <Lock className="h-3 w-3" />
                    )}
                    {summary?.is_open ? "Open" : "Closed"}
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-500">
                  {summary?.is_open && summary.opened_at
                    ? `Open since ${fmtDateTime(summary.opened_at)}`
                    : "Float, pay-ins, pay-outs and end-of-day count"}
                  {activeShift ? ` · shift: ${activeShift.user_name}` : ""}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {summary?.is_open ? (
                <>
                  <button
                    onClick={() => openModal("cash_in")}
                    className={`${btn} border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}
                  >
                    <PlusCircle className="h-4 w-4" /> Pay in
                  </button>
                  <button
                    onClick={() => openModal("cash_out")}
                    className={`${btn} border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100`}
                  >
                    <MinusCircle className="h-4 w-4" /> Pay out
                  </button>
                  <button
                    onClick={() => void handleRecordEvent(undefined, "no_sale")}
                    disabled={isActionLoading}
                    title="Log a drawer opening with no sale"
                    className={`${btn} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50`}
                  >
                    <XCircle className="h-4 w-4" /> No sale
                  </button>
                  <button
                    onClick={() => openModal("close")}
                    className={`${btn} bg-rose-600 text-white hover:bg-rose-700`}
                  >
                    <Lock className="h-3.5 w-3.5" /> Close drawer
                  </button>
                </>
              ) : (
                <button
                  onClick={() => openModal("open")}
                  className={`${btn} bg-emerald-600 px-4 text-white hover:bg-emerald-700`}
                >
                  <Unlock className="h-4 w-4" /> Open drawer
                </button>
              )}
              <div className="mx-0.5 h-5 w-px bg-slate-200" />
              <button
                onClick={() => void fetchDrawerData()}
                className={`${btn} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
              >
                <RefreshCw className="h-3.5 w-3.5" /> Refresh
              </button>
            </div>
          </div>

          {summary?.is_open && (
            <div className="px-8 pb-5">
              <div className="grid grid-cols-2 divide-x divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-5">
                {[
                  {
                    label: "Opening float",
                    value: fmtINR(summary.opening_float),
                    tone: "text-slate-900",
                  },
                  {
                    label: "Cash sales",
                    value: fmtINR(summary.total_sales),
                    tone: "text-sky-600",
                  },
                  {
                    label: "Pay-ins",
                    value: `+${fmtINR(summary.total_cash_in)}`,
                    tone: "text-emerald-600",
                  },
                  {
                    label: "Pay-outs",
                    value: `−${fmtINR(summary.total_cash_out)}`,
                    tone: "text-amber-600",
                  },
                ].map((k) => (
                  <div key={k.label} className="bg-slate-50/50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      {k.label}
                    </p>
                    <p className={`mt-1 font-mono text-lg font-bold tabular-nums ${k.tone}`}>
                      {k.value}
                    </p>
                  </div>
                ))}
                <div className="relative col-span-2 overflow-hidden bg-slate-950 p-4 text-white lg:col-span-1">
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent" />
                  <p className="relative text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Expected in drawer
                  </p>
                  <p className="relative mt-1 font-mono text-xl font-bold tabular-nums text-amber-400">
                    {fmtINR(summary.expected_cash)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {!summary?.is_open &&
            !!summary?.last_discrepancy &&
            summary.last_discrepancy !== 0 && (
              <div className="px-8 pb-5">
                <div
                  className={`flex items-center justify-between gap-4 rounded-2xl border p-4 ${summary.last_discrepancy < 0 ? "border-rose-200 bg-rose-50/60 text-rose-900" : "border-amber-200 bg-amber-50/60 text-amber-900"}`}
                >
                  <div className="flex items-center gap-3">
                    <ShieldAlert className="h-5 w-5 shrink-0" />
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider">
                        Last close was out of balance
                      </h4>
                      <p className="mt-0.5 text-xs font-medium">
                        {summary.last_discrepancy < 0 ? "Shortage" : "Overage"} of{" "}
                        {fmtINR(Math.abs(summary.last_discrepancy))} — expected{" "}
                        {fmtINR(summary.last_expected_amount || 0)}, counted{" "}
                        {fmtINR(summary.last_closed_amount || 0)}
                      </p>
                    </div>
                  </div>
                  {summary.last_closed_at && (
                    <p className="text-right text-[11px] text-slate-500">
                      {summary.last_closed_by || "Unknown"} ·{" "}
                      {fmtDateTime(summary.last_closed_at)}
                    </p>
                  )}
                </div>
              </div>
            )}

          {canAudit && (
            <nav className="flex items-center overflow-x-auto border-t border-slate-100 px-8">
              {(
                [
                  ["today", "Today's ledger", History],
                  ["history", "Audit explorer", Calendar],
                ] as const
              ).map(([id, label, Icon]) => (
                <button
                  key={id}
                  onClick={() => {
                    setActiveTab(id);
                    if (id === "history" && !hasQueriedRange)
                      void queryRange(rangeStart, rangeEnd);
                  }}
                  className={`-mb-px flex cursor-pointer items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-3.5 text-xs font-bold transition-colors ${activeTab === id ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}
                >
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              ))}
            </nav>
          )}
        </header>

        <main className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex min-h-[50vh] items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Clock className="h-8 w-8 animate-spin text-emerald-600" />
                <p className="text-xs font-semibold text-slate-400">Syncing drawer…</p>
              </div>
            </div>
          ) : activeTab === "today" || !canAudit ? (
            <div className="p-6 md:p-8">
              {!summary?.is_open && (summary?.events.length ?? 0) === 0 ? (
                <div className="mx-auto mt-10 max-w-md rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
                  <Banknote className="mx-auto h-10 w-10 text-slate-300" />
                  <h3 className="mt-4 text-base font-extrabold">Drawer is closed</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Open the drawer with a starting float to start tracking cash
                    sales and pay-outs for today.
                  </p>
                  <button
                    onClick={() => openModal("open")}
                    className={`${btn} mt-5 bg-emerald-600 px-5 py-2.5 text-white hover:bg-emerald-700`}
                  >
                    <Unlock className="h-4 w-4" /> Open drawer
                  </button>
                </div>
              ) : (
                <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-sm font-black uppercase tracking-wider">
                        Today&apos;s ledger
                      </h2>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">
                        {filteredEvents.length}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                        <input
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search"
                          className="w-44 rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs font-semibold focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                        />
                      </div>
                      <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-0.5">
                        {["all", "sale", "cash_in", "cash_out", "no_sale", "open", "close"].map(
                          (t) => (
                            <button
                              key={t}
                              onClick={() => setTypeFilter(t)}
                              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-all ${typeFilter === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                            >
                              {t === "all" ? "All" : EVENT_LABEL[t]}
                            </button>
                          ),
                        )}
                      </div>
                      <button
                        onClick={() =>
                          exportCsv(filteredEvents, `cash-drawer-${localDay(new Date())}`)
                        }
                        disabled={filteredEvents.length === 0}
                        className={`${btn} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40`}
                      >
                        <Download className="h-3.5 w-3.5" /> CSV
                      </button>
                    </div>
                  </div>
                  <EventTable events={filteredEvents} />
                </section>
              )}
            </div>
          ) : (
            <div className="space-y-5 p-6 md:p-8">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void queryRange(rangeStart, rangeEnd);
                }}
                className="flex flex-wrap items-end gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                {(
                  [
                    ["From", rangeStart, setRangeStart],
                    ["To", rangeEnd, setRangeEnd],
                  ] as const
                ).map(([label, val, set]) => (
                  <label key={label} className="min-w-[160px]">
                    <span className="mb-1.5 block pl-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      {label}
                    </span>
                    <input
                      type="date"
                      value={val}
                      max={localDay(new Date())}
                      onChange={(e) => set(e.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-xs font-bold text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                    />
                  </label>
                ))}
                <div className="flex gap-1 rounded-xl bg-slate-100 p-0.5">
                  {[
                    ["Today", () => applyPreset(0)],
                    ["Yesterday", () => applyPreset(0, true)],
                    ["7 days", () => applyPreset(6)],
                    ["30 days", () => applyPreset(29)],
                  ].map(([label, fn]) => (
                    <button
                      key={label as string}
                      type="button"
                      onClick={fn as () => void}
                      className="rounded-lg px-3 py-2 text-[11px] font-bold text-slate-600 hover:bg-white hover:shadow-sm"
                    >
                      {label as string}
                    </button>
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={isRangeLoading}
                  className={`${btn} h-11 bg-slate-900 px-5 text-white hover:bg-slate-800 disabled:opacity-50`}
                >
                  {isRangeLoading ? "Loading…" : "Run audit"}
                </button>
                <div className="flex-1" />
                <button
                  type="button"
                  disabled={rangeEvents.length === 0}
                  onClick={() => exportCsv(rangeEvents, `cash-drawer-${rangeStart}_${rangeEnd}`)}
                  className={`${btn} h-11 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40`}
                >
                  <Download className="h-4 w-4" /> CSV
                </button>
                <button
                  type="button"
                  disabled={rangeEvents.length === 0}
                  onClick={() => printReport(rangeEvents, rangeStart, rangeEnd)}
                  className={`${btn} h-11 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40`}
                >
                  <FileText className="h-4 w-4" /> PDF report
                </button>
              </form>

              {hasQueriedRange && (
                <>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                    {[
                      { l: "Cash sales", v: fmtINR(rangeStats.sales), t: "text-sky-600" },
                      { l: "Pay-ins", v: `+${fmtINR(rangeStats.cashIn)}`, t: "text-emerald-600" },
                      { l: "Pay-outs", v: `−${fmtINR(rangeStats.cashOut)}`, t: "text-amber-600" },
                      {
                        l: "Shortages",
                        v: fmtINR(rangeStats.shortages),
                        t: rangeStats.shortages ? "text-rose-600" : "text-slate-900",
                      },
                      {
                        l: "Overages",
                        v: fmtINR(rangeStats.overages),
                        t: rangeStats.overages ? "text-amber-600" : "text-slate-900",
                      },
                    ].map((k) => (
                      <div key={k.l} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          {k.l}
                        </p>
                        <p className={`mt-1.5 font-mono text-lg font-bold tabular-nums ${k.t}`}>
                          {k.v}
                        </p>
                      </div>
                    ))}
                  </div>
                  <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                      <h2 className="text-sm font-black uppercase tracking-wider">
                        Audit log
                      </h2>
                      <span className="text-[11px] font-bold text-slate-400">
                        {rangeEvents.length} events · {rangeStats.closings} closings
                        {rangeStats.noSales ? ` · ${rangeStats.noSales} no-sales` : ""}
                      </span>
                    </div>
                    <EventTable events={rangeEvents} />
                  </section>
                </>
              )}
            </div>
          )}

          {modal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
              <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
                <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-3.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    {modal === "close" ? <Lock className="h-4 w-4" /> : <Landmark className="h-4 w-4" />}
                  </div>
                  <h3 className="text-base font-black uppercase tracking-wider">
                    {MODAL_META[modal].title}
                  </h3>
                </div>

                <form onSubmit={handleRecordEvent} className="space-y-4">
                  {modal === "close" ? (
                    <>
                      <div className="flex items-center justify-between rounded-xl border border-orange-100 bg-orange-50 px-4 py-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-orange-500">
                          Expected in drawer
                        </span>
                        <span className="text-base font-extrabold text-[#fe5c13]">
                          {fmtINR(expected)}
                        </span>
                      </div>
                      <CashCounter onChange={setCounted} autoFocus />
                      <VarianceBanner expected={expected} counted={counted} />
                    </>
                  ) : (
                    <div>
                      <label className="pl-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {MODAL_META[modal].amountLabel}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        autoFocus
                        required
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 text-lg font-extrabold shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                      />
                      {modal === "cash_out" && (
                        <p className="mt-1.5 pl-1 text-[11px] font-medium text-slate-400">
                          Available in drawer: {fmtINR(expected)}
                        </p>
                      )}
                    </div>
                  )}

                  {(modal === "cash_in" || modal === "cash_out") && (
                    <div>
                      <label className="pl-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Reason
                      </label>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {CATEGORIES[modal].map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setCategory(c)}
                            className={`rounded-lg border px-3 py-1.5 text-[11px] font-bold transition-all ${category === c ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="pl-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Notes{modal === "close" && closeDiff !== 0 ? " (required)" : ""}
                    </label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder={
                        modal === "close"
                          ? "Explain any difference, handover details…"
                          : modal === "open"
                            ? "Opening remarks…"
                            : "Bill no., vendor, who received it…"
                      }
                      className="mt-1.5 h-20 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                    />
                  </div>

                  <div className="flex gap-3 border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="flex-1 cursor-pointer rounded-xl border border-slate-200 bg-white py-3 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isActionLoading}
                      className={`flex-1 cursor-pointer rounded-xl py-3 text-xs font-bold text-white shadow-sm transition-all disabled:opacity-50 ${MODAL_META[modal].tone}`}
                    >
                      {isActionLoading ? "Saving…" : MODAL_META[modal].cta}
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
