"use client";

import CashCounter, {
  fmtINR,
  VarianceBanner,
} from "@/app/components/cash/CashCounter";
import StaffSidebar from "@/app/components/StaffSidebar";
import { api } from "@/app/lib/api";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Clock,
  Coffee,
  Download,
  History,
  IndianRupee,
  KeyRound,
  Loader2,
  LogIn,
  LogOut,
  Play,
  RefreshCw,
  Search,
  Timer,
  Users,
  Wallet,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";

type ShiftBreak = {
  id: string;
  start_time: string;
  end_time?: string | null;
  is_paid: boolean;
};

type StaffShift = {
  id: string;
  user_name: string;
  role: string;
  clocked_in_at: string;
  clocked_out_at?: string | null;
  opening_float: number;
  closing_float?: number | null;
  expected_cash?: number | null;
  cash_discrepancy?: number | null;
  notes: string;
  duration_mins?: number | null;
  hourly_rate?: number;
  payable_hours?: number;
  breaks?: ShiftBreak[];
};

type Period = "today" | "7d" | "30d" | "all";

const fmtDuration = (mins?: number | null) => {
  if (mins === undefined || mins === null) return "—";
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

const fmtClock = (secs: number) => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
};

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const breakMins = (s: StaffShift) =>
  Math.round(
    (s.breaks || []).reduce((sum, b) => {
      const end = b.end_time ? new Date(b.end_time).getTime() : Date.now();
      return sum + (end - new Date(b.start_time).getTime()) / 60000;
    }, 0),
  );

const roleLabel = (role: string) =>
  role ? role.charAt(0).toUpperCase() + role.slice(1).toLowerCase() : "Staff";

const RoleBadge = ({ role }: { role: string }) => (
  <span className="inline-flex items-center rounded-full bg-[#F3F3EF] px-2 py-0.5 text-[12px] font-medium text-[#4B5563]">
    {roleLabel(role)}
  </span>
);

const PERIODS: { id: Period; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "all", label: "All time" },
];

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<StaffShift[]>([]);
  const [activeShift, setActiveShift] = useState<StaffShift | null>(null);
  const [expectedCash, setExpectedCash] = useState<number | null>(null);
  const [role, setRole] = useState("");
  const [staffName, setStaffName] = useState("");
  const [canSeeHistory, setCanSeeHistory] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // modal state
  const [modalType, setModalType] = useState<"clock_in" | "clock_out" | null>(
    null,
  );
  const [floatVal, setFloatVal] = useState("");
  const [counted, setCounted] = useState<number | null>(null);
  const [skipCount, setSkipCount] = useState(false);
  const [notesVal, setNotesVal] = useState("");
  const [managerPin, setManagerPin] = useState("");
  const [needsPin, setNeedsPin] = useState(false);

  // history filters
  const [period, setPeriod] = useState<Period>("7d");
  const [query, setQuery] = useState("");
  const [varianceOnly, setVarianceOnly] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchActive = useCallback(async () => {
    const res = await api<{ shift: StaffShift | null; is_clocked_in: boolean }>(
      "/api/admin/shifts/active",
    );
    const shift = res?.is_clocked_in ? res.shift : null;
    setActiveShift(shift);
    if (shift) {
      try {
        const sum = await api<{ expected_cash: number }>(
          "/api/admin/shifts/active/summary",
          { noCache: true },
        );
        setExpectedCash(sum?.expected_cash ?? null);
      } catch {
        setExpectedCash(null);
      }
    } else {
      setExpectedCash(null);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      const [historyRes, meRes] = await Promise.all([
        api<{ shifts: StaffShift[] }>("/api/admin/shifts", {
          noCache: true,
          suppressErrorLog: true,
        }).catch(() => null),
        api<{ name?: string; role?: string }>("/api/admin/me").catch(
          () => ({}) as { name?: string; role?: string },
        ),
      ]);
      setCanSeeHistory(historyRes !== null);
      setShifts(historyRes?.shifts || []);
      if (meRes?.name) setStaffName(meRes.name);
      if (meRes?.role) setRole(meRes.role);
      await fetchActive();
    } catch {
      toast.error("Failed to load shift records");
    } finally {
      setIsLoading(false);
    }
  }, [fetchActive]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  // live ticker + periodic refresh of expected cash while on shift
  useEffect(() => {
    if (!activeShift) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const poll = setInterval(() => void fetchActive().catch(() => {}), 30000);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [activeShift, fetchActive]);

  const openBreak = activeShift?.breaks?.find((b) => !b.end_time) || null;
  const elapsedSecs = activeShift
    ? Math.max(
        0,
        Math.floor((now - new Date(activeShift.clocked_in_at).getTime()) / 1000),
      )
    : 0;
  const breakSecsTotal = activeShift
    ? Math.floor(
        (activeShift.breaks || []).reduce((sum, b) => {
          const end = b.end_time ? new Date(b.end_time).getTime() : now;
          return sum + (end - new Date(b.start_time).getTime());
        }, 0) / 1000,
      )
    : 0;

  const handlesCash =
    !!activeShift && (activeShift.opening_float > 0 || role === "cashier");

  const resetModal = () => {
    setModalType(null);
    setFloatVal("");
    setCounted(null);
    setSkipCount(false);
    setNotesVal("");
    setManagerPin("");
    setNeedsPin(false);
  };

  const handleClockIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const floatNum = parseFloat(floatVal || "0");
    if (isNaN(floatNum) || floatNum < 0) {
      toast.error("Enter a valid starting float");
      return;
    }
    setIsActionLoading(true);
    try {
      const res = await api<StaffShift>("/api/admin/shifts/clock-in", {
        method: "POST",
        headers: staffName ? { "X-User-Name": staffName } : {},
        body: JSON.stringify({ opening_float: floatNum }),
      });
      if (floatNum > 0) {
        try {
          await api("/api/admin/cash-drawer/event", {
            method: "POST",
            body: JSON.stringify({
              event_type: "open",
              amount: floatNum,
              note: `Opened on shift clock-in for ${staffName || "staff"}`,
              shift_id: res.id,
            }),
          });
        } catch {
          toast.error(
            "Clocked in, but the drawer open entry failed. Log it from the Cash Drawer page.",
          );
        }
      }
      toast.success("Clocked in");
      resetModal();
      await fetchAll();
    } catch (err) {
      toast.error((err as Error)?.message || "Failed to clock in");
    } finally {
      setIsActionLoading(false);
    }
  };

  const needsCount = handlesCash && !skipCount;
  const variance =
    counted !== null && expectedCash !== null
      ? Math.round((counted - expectedCash) * 100) / 100
      : null;

  const handleClockOut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) return;
    if (needsCount && counted === null) {
      toast.error("Count the cash in the drawer first");
      return;
    }
    if (variance !== null && variance !== 0 && !notesVal.trim()) {
      toast.error("Explain the cash difference before closing");
      return;
    }
    setIsActionLoading(true);
    try {
      await api("/api/admin/shifts/clock-out", {
        method: "POST",
        headers: managerPin ? { "X-Manager-Pin": managerPin } : {},
        body: JSON.stringify({
          closing_float: counted,
          notes: notesVal.trim(),
        }),
      });
      if (counted !== null) {
        await api("/api/admin/cash-drawer/event", {
          method: "POST",
          body: JSON.stringify({
            event_type: "close",
            amount: counted,
            note: `${
              variance
                ? `[Discrepancy: ${variance < 0 ? "Shortage" : "Overage"} of ${fmtINR(Math.abs(variance))} (Expected: ${fmtINR(expectedCash ?? 0)}, Actual: ${fmtINR(counted)})] `
                : ""
            }Closed on shift clock-out${notesVal.trim() ? `: ${notesVal.trim()}` : ""}`,
            shift_id: activeShift.id,
          }),
        }).catch(() => {
          toast.error("Shift closed, but the drawer close entry failed.");
        });
      }
      toast.success("Clocked out");
      resetModal();
      await fetchAll();
    } catch (err) {
      const msg = (err as Error)?.message || "";
      if (msg.includes("MANAGER_PIN_REQUIRED")) {
        setNeedsPin(true);
        toast.error("Difference is above the limit — enter a manager PIN");
      } else {
        if (msg.toLowerCase().includes("invalid manager pin")) setManagerPin("");
        toast.error(msg || "Failed to clock out");
      }
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleBreak = async (paid: boolean) => {
    setIsActionLoading(true);
    try {
      if (openBreak) {
        await api("/api/admin/shifts/break-end", { method: "POST" });
        toast.success("Break ended");
      } else {
        await api("/api/admin/shifts/break-start", {
          method: "POST",
          body: JSON.stringify({ is_paid: paid }),
        });
        toast.success(paid ? "Paid break started" : "Unpaid break started");
      }
      await fetchActive();
    } catch (err) {
      toast.error((err as Error)?.message || "Break action failed");
    } finally {
      setIsActionLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const cutoff = (() => {
      const d = new Date();
      if (period === "today") return new Date(d.setHours(0, 0, 0, 0)).getTime();
      if (period === "7d") return Date.now() - 7 * 86400000;
      if (period === "30d") return Date.now() - 30 * 86400000;
      return 0;
    })();
    const q = query.trim().toLowerCase();
    return shifts.filter((s) => {
      if (new Date(s.clocked_in_at).getTime() < cutoff) return false;
      if (varianceOnly && !(s.cash_discrepancy && s.cash_discrepancy !== 0))
        return false;
      if (
        q &&
        !(s.user_name.toLowerCase().includes(q) || s.role.toLowerCase().includes(q))
      )
        return false;
      return true;
    });
  }, [shifts, period, query, varianceOnly]);

  const stats = useMemo(() => {
    let mins = 0;
    let netVar = 0;
    let shortages = 0;
    let labour = 0;
    const people = new Set<string>();
    filtered.forEach((s) => {
      people.add(s.user_name);
      mins += s.duration_mins || 0;
      const v = s.cash_discrepancy || 0;
      netVar += v;
      if (v < 0) shortages++;
      labour += (s.payable_hours || 0) * (s.hourly_rate || 0);
    });
    return { mins, netVar, shortages, labour, people: people.size };
  }, [filtered]);

  const exportCsv = () => {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const rows = [
      [
        "Date",
        "Staff",
        "Role",
        "Clock In",
        "Clock Out",
        "Duration (min)",
        "Break (min)",
        "Opening Float",
        "Expected Cash",
        "Counted Cash",
        "Variance",
        "Notes",
      ],
      ...filtered.map((s) => [
        fmtDate(s.clocked_in_at),
        s.user_name,
        s.role,
        fmtTime(s.clocked_in_at),
        s.clocked_out_at ? fmtTime(s.clocked_out_at) : "open",
        s.duration_mins ?? "",
        breakMins(s),
        s.opening_float,
        s.expected_cash ?? "",
        s.closing_float ?? "",
        s.cash_discrepancy ?? "",
        s.notes || "",
      ]),
    ];
    const blob = new Blob([rows.map((r) => r.map(esc).join(",")).join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `shifts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const INPUT =
    "h-10 w-full rounded-xl border border-[#E8E8E3] bg-white px-3.5 text-[14px] text-[#0F1117] outline-none transition-colors placeholder:text-[#9CA3AF] hover:border-[#D6D6CF] focus:border-[#fe5c13]";
  const LABEL = "mb-1.5 block text-[13px] font-medium text-[#4B5563]";
  const BTN_SECONDARY =
    "inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-[#E8E8E3] bg-white px-3.5 text-[13px] font-semibold text-[#374151] transition-colors hover:border-[#D6D6CF] hover:bg-[#FAFAF7] hover:text-[#0F1117] disabled:cursor-not-allowed disabled:opacity-50";
  const BTN_PRIMARY =
    "inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#fe5c13] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#e44e0b] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fe5c13]/40 focus-visible:ring-offset-2";
  const SEG_ON = "bg-white font-semibold text-[#0F1117] shadow-[0_1px_2px_rgba(15,17,23,0.06)]";
  const SEG_OFF = "text-[#6B7280] hover:text-[#0F1117]";

  return (
    <div className="flex h-screen overflow-hidden bg-[#FAFAF7] text-[#0F1117]">
      <StaffSidebar />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="shrink-0 border-b border-[#E8E8E3] bg-white px-8 py-4">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <div className="flex items-center gap-3">
              <h1 className="text-[22px] font-bold leading-none tracking-[-0.02em] text-[#0F1117]">
                Shifts and attendance
              </h1>
              {!isLoading && (
                activeShift ? (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium leading-none ring-1 ring-inset ${openBreak ? "bg-amber-50 text-amber-800 ring-amber-200/70" : "bg-emerald-50 text-emerald-700 ring-emerald-200/70"}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${openBreak ? "bg-amber-500" : "bg-emerald-500"}`} />
                    {openBreak ? "On break" : "On shift"}
                  </span>
                ) : (
                  <span className="rounded-full bg-[#F3F3EF] px-2.5 py-1 text-[12px] font-medium leading-none text-[#6B7280]">
                    Clocked out
                  </span>
                )
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void fetchAll()}
                aria-label="Refresh shifts"
                title="Refresh shifts"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E8E8E3] bg-white text-[#6B7280] transition-colors hover:border-[#D6D6CF] hover:bg-[#FAFAF7] hover:text-[#0F1117]"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              {canSeeHistory && (
                <button type="button" onClick={exportCsv} disabled={filtered.length === 0} className={BTN_SECONDARY}>
                  <Download className="h-4 w-4 text-[#6B7280]" /> Export CSV
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="relative flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex min-h-[50vh] items-center justify-center gap-2 text-[14px] text-[#6B7280]">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading shifts
            </div>
          ) : (
            <div className="mx-auto max-w-7xl space-y-6 px-8 py-6">
              {/* Your shift */}
              {!activeShift ? (
                <section className="flex flex-col justify-between gap-5 rounded-2xl border border-[#E8E8E3] bg-white px-6 py-5 md:flex-row md:items-center">
                  <div>
                    <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-[#0F1117]">
                      You&apos;re clocked out
                    </h2>
                    <p className="mt-1 text-[13px] text-[#6B7280]">
                      Clock in to start your shift. If you&apos;re taking cash, you&apos;ll enter the opening float next.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      resetModal();
                      setModalType("clock_in");
                    }}
                    className={BTN_PRIMARY}
                  >
                    <LogIn className="h-4 w-4" /> Clock in
                  </button>
                </section>
              ) : (
                <section className="rounded-2xl border border-[#E8E8E3] bg-white">
                  <div className="flex flex-col gap-6 px-6 pb-5 pt-6 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-[#0F1117]">
                          {activeShift.user_name}
                        </h2>
                        <RoleBadge role={activeShift.role} />
                        {openBreak && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/70 bg-amber-50 px-2 py-0.5 text-[12px] font-medium text-amber-800">
                            <Coffee className="h-3.5 w-3.5" /> On {openBreak.is_paid ? "a paid" : "an unpaid"} break
                          </span>
                        )}
                      </div>
                      <p className="mt-4 text-[12px] font-medium text-[#6B7280]">Time on shift</p>
                      <p className="mt-1 text-[40px] font-bold leading-none tabular-nums tracking-[-0.03em] text-[#0F1117]">
                        {fmtClock(elapsedSecs)}
                      </p>
                      <p className="mt-2 text-[13px] tabular-nums text-[#6B7280]">
                        Clocked in at {fmtTime(activeShift.clocked_in_at)} on {fmtDate(activeShift.clocked_in_at)}
                      </p>
                    </div>

                    <dl className="grid grid-cols-3 divide-x divide-[#F0F0EB] rounded-xl border border-[#E8E8E3] lg:min-w-[480px]">
                      {[
                        {
                          label: "Break time",
                          value: fmtClock(breakSecsTotal),
                          tone: breakSecsTotal ? "text-amber-700" : "text-[#9CA3AF]",
                        },
                        {
                          label: "Opening float",
                          value: fmtINR(activeShift.opening_float),
                          tone: "text-[#0F1117]",
                        },
                        {
                          label: "Expected in till",
                          value: expectedCash === null ? "—" : fmtINR(expectedCash),
                          tone: expectedCash === null ? "text-[#9CA3AF]" : "text-[#0F1117]",
                        },
                      ].map((k) => (
                        <div key={k.label} className="px-4 py-3">
                          <dt className="text-[12px] font-medium text-[#6B7280]">{k.label}</dt>
                          <dd className={`mt-1 text-[16px] font-semibold tabular-nums ${k.tone}`}>{k.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-t border-[#F0F0EB] px-6 py-4">
                    {openBreak ? (
                      <button
                        onClick={() => void handleBreak(true)}
                        disabled={isActionLoading}
                        className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#0F1117] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#1F2937] disabled:opacity-50"
                      >
                        <Play className="h-4 w-4" /> End break
                      </button>
                    ) : (
                      <>
                        <button onClick={() => void handleBreak(true)} disabled={isActionLoading} className={BTN_SECONDARY}>
                          <Coffee className="h-4 w-4 text-[#6B7280]" /> Paid break
                        </button>
                        <button onClick={() => void handleBreak(false)} disabled={isActionLoading} className={BTN_SECONDARY}>
                          <Coffee className="h-4 w-4 text-[#6B7280]" /> Unpaid break
                        </button>
                      </>
                    )}
                    <div className="flex-1" />
                    {openBreak && (
                      <span className="text-[12px] text-[#9CA3AF]">End your break to clock out</span>
                    )}
                    <button
                      onClick={() => {
                        resetModal();
                        setModalType("clock_out");
                      }}
                      disabled={!!openBreak}
                      title={openBreak ? "End your break first" : undefined}
                      className={`${BTN_SECONDARY} text-rose-700 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700`}
                    >
                      <LogOut className="h-4 w-4" /> Clock out
                    </button>
                  </div>
                </section>
              )}

              {/* History */}
              {!canSeeHistory ? (
                <section className="rounded-2xl border border-[#E8E8E3] bg-white px-6 py-12 text-center">
                  <History className="mx-auto h-6 w-6 text-[#C4C4BE]" />
                  <p className="mt-3 text-[15px] font-semibold text-[#0F1117]">Shift history is for owners and managers</p>
                  <p className="mt-1 text-[13px] text-[#6B7280]">Ask one of them if you need to check a past shift.</p>
                </section>
              ) : (
                <>
                  <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-[#0F1117]">Shift history</h2>
                      <span className="rounded-full bg-[#F3F3EF] px-2.5 py-1 text-[12px] font-medium leading-none tabular-nums text-[#6B7280]">
                        {filtered.length} {filtered.length === 1 ? "shift" : "shifts"}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative w-56">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                        <input
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Search staff or role"
                          aria-label="Search staff or role"
                          className="h-9 w-full rounded-xl border border-[#E8E8E3] bg-white pl-9 pr-3 text-[13px] text-[#0F1117] outline-none transition-colors placeholder:text-[#9CA3AF] hover:border-[#D6D6CF] focus:border-[#fe5c13]"
                        />
                      </div>
                      <div className="inline-flex h-9 items-center gap-0.5 rounded-xl bg-[#F3F3EF] p-1" role="tablist" aria-label="Period">
                        {PERIODS.map((p) => (
                          <button
                            key={p.id}
                            role="tab"
                            aria-selected={period === p.id}
                            onClick={() => setPeriod(p.id)}
                            className={`flex h-7 items-center whitespace-nowrap rounded-lg px-3 text-[12px] font-medium transition-colors ${period === p.id ? SEG_ON : SEG_OFF}`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setVarianceOnly((v) => !v)}
                        aria-pressed={varianceOnly}
                        className={`inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-[12px] font-medium transition-colors ${varianceOnly ? "border-[#0F1117] bg-[#0F1117] text-white" : "border-[#E8E8E3] bg-white text-[#4B5563] hover:border-[#D6D6CF] hover:text-[#0F1117]"}`}
                      >
                        <Wallet className="h-3.5 w-3.5" /> Cash differences only
                      </button>
                    </div>
                  </div>

                  <dl className="grid grid-cols-2 overflow-hidden rounded-2xl border border-[#E8E8E3] bg-white lg:grid-cols-5">
                    {[
                      { label: "Staff", value: String(stats.people), tone: "text-[#0F1117]" },
                      { label: "Hours worked", value: `${(stats.mins / 60).toFixed(1)} h`, tone: "text-[#0F1117]" },
                      {
                        label: "Net cash difference",
                        value:
                          stats.netVar === 0
                            ? "Balanced"
                            : `${stats.netVar > 0 ? "+" : "−"}${fmtINR(Math.abs(stats.netVar))}`,
                        tone: stats.netVar < 0 ? "text-rose-600" : stats.netVar > 0 ? "text-amber-700" : "text-emerald-700",
                      },
                      {
                        label: "Shifts short on cash",
                        value: String(stats.shortages),
                        tone: stats.shortages ? "text-rose-600" : "text-[#9CA3AF]",
                      },
                      {
                        label: "Labour cost, estimated",
                        value: stats.labour ? fmtINR(stats.labour) : "—",
                        tone: stats.labour ? "text-[#0F1117]" : "text-[#9CA3AF]",
                      },
                    ].map((k, i) => (
                      <div
                        key={k.label}
                        className={`px-6 py-4 ${i % 2 === 1 ? "border-l border-[#F0F0EB]" : ""} ${i > 1 ? "border-t border-[#F0F0EB] lg:border-t-0" : ""} ${i > 0 ? "lg:border-l lg:border-[#F0F0EB]" : ""}`}
                      >
                        <dt className="text-[12px] font-medium text-[#6B7280]">{k.label}</dt>
                        <dd className={`mt-1 text-[20px] font-bold tabular-nums tracking-[-0.02em] ${k.tone}`}>{k.value}</dd>
                      </div>
                    ))}
                  </dl>

                  <section className="overflow-hidden rounded-2xl border border-[#E8E8E3] bg-white">
                    {filtered.length === 0 ? (
                      <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                        <History className="h-6 w-6 text-[#C4C4BE]" />
                        <p className="mt-3 text-[15px] font-semibold text-[#0F1117]">No shifts match these filters</p>
                        <p className="mt-1 max-w-sm text-[13px] text-[#6B7280]">Try a longer period or clear the search.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] border-collapse text-left">
                          <thead>
                            <tr className="border-b border-[#F0F0EB] text-[12px] text-[#6B7280]">
                              <th className="w-10 py-3 pl-4" />
                              <th className="px-4 py-3 font-medium">Staff</th>
                              <th className="px-4 py-3 font-medium">Date</th>
                              <th className="px-4 py-3 font-medium">In and out</th>
                              <th className="px-4 py-3 text-right font-medium">Hours</th>
                              <th className="px-4 py-3 text-right font-medium">Expected cash</th>
                              <th className="px-4 py-3 text-right font-medium">Counted</th>
                              <th className="px-4 py-3 text-right font-medium">Difference</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#F0F0EB] text-[13px] text-[#4B5563]">
                            {filtered.map((s) => {
                              const open = !s.clocked_out_at;
                              const v = s.cash_discrepancy;
                              const isOpen = expanded === s.id;
                              return (
                                <React.Fragment key={s.id}>
                                  <tr
                                    onClick={() => setExpanded(isOpen ? null : s.id)}
                                    aria-expanded={isOpen}
                                    className={`cursor-pointer transition-colors hover:bg-[#FAFAF7] ${isOpen ? "bg-[#FAFAF7]" : ""}`}
                                  >
                                    <td className="py-3.5 pl-4 text-[#9CA3AF]">
                                      {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    </td>
                                    <td className="px-4 py-3.5">
                                      <div className="flex items-center gap-2.5">
                                        <span className="text-[14px] font-semibold text-[#0F1117]">{s.user_name}</span>
                                        <RoleBadge role={s.role} />
                                      </div>
                                    </td>
                                    <td className="px-4 py-3.5 tabular-nums">{fmtDate(s.clocked_in_at)}</td>
                                    <td className="px-4 py-3.5 tabular-nums text-[#0F1117]">
                                      {fmtTime(s.clocked_in_at)} to{" "}
                                      {open ? (
                                        <span className="ml-0.5 inline-flex items-center gap-1.5 rounded-full border border-emerald-200/70 bg-emerald-50 px-2 py-0.5 text-[12px] font-medium text-emerald-700">
                                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> On shift
                                        </span>
                                      ) : (
                                        fmtTime(s.clocked_out_at as string)
                                      )}
                                    </td>
                                    <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-[#0F1117]">
                                      {fmtDuration(s.duration_mins)}
                                    </td>
                                    <td className="px-4 py-3.5 text-right tabular-nums">
                                      {s.expected_cash != null ? fmtINR(s.expected_cash) : <span className="text-[#C4C4BE]">—</span>}
                                    </td>
                                    <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-[#0F1117]">
                                      {s.closing_float != null ? fmtINR(s.closing_float) : <span className="font-normal text-[#C4C4BE]">—</span>}
                                    </td>
                                    <td className="px-4 py-3.5 text-right">
                                      {v == null ? (
                                        <span className="text-[#C4C4BE]">—</span>
                                      ) : v === 0 ? (
                                        <span className="font-medium text-emerald-700">Balanced</span>
                                      ) : (
                                        <span className={`font-semibold tabular-nums ${v < 0 ? "text-rose-600" : "text-amber-700"}`}>
                                          {v > 0 ? "+" : "−"}
                                          {fmtINR(Math.abs(v))}
                                          <span className="ml-1 text-[12px] font-medium">{v < 0 ? "short" : "over"}</span>
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                  {isOpen && (
                                    <tr className="bg-[#FAFAF7]">
                                      <td />
                                      <td colSpan={7} className="px-4 pb-5 pt-1">
                                        <div className="grid gap-px overflow-hidden rounded-xl border border-[#E8E8E3] bg-[#F0F0EB] text-[13px] md:grid-cols-3">
                                          <div className="bg-white px-4 py-3">
                                            <p className="text-[12px] font-medium text-[#6B7280]">Cash</p>
                                            <p className="mt-1 text-[#0F1117]">
                                              Opened with <span className="font-semibold tabular-nums">{fmtINR(s.opening_float)}</span>
                                            </p>
                                            {(s.payable_hours ?? 0) > 0 && (
                                              <p className="mt-0.5 tabular-nums text-[#6B7280]">
                                                {(s.payable_hours || 0).toFixed(2)} payable hours
                                                {s.hourly_rate ? ` at ${fmtINR(s.hourly_rate)} an hour` : ""}
                                              </p>
                                            )}
                                          </div>
                                          <div className="bg-white px-4 py-3">
                                            <p className="text-[12px] font-medium text-[#6B7280]">
                                              Breaks{breakMins(s) > 0 ? `, ${fmtDuration(breakMins(s))} in total` : ""}
                                            </p>
                                            {(s.breaks || []).length === 0 ? (
                                              <p className="mt-1 text-[#9CA3AF]">None taken</p>
                                            ) : (
                                              <ul className="mt-1 space-y-0.5">
                                                {s.breaks!.map((b) => (
                                                  <li key={b.id} className="tabular-nums text-[#0F1117]">
                                                    {fmtTime(b.start_time)} to {b.end_time ? fmtTime(b.end_time) : "now"}{" "}
                                                    <span className="text-[#9CA3AF]">{b.is_paid ? "paid" : "unpaid"}</span>
                                                  </li>
                                                ))}
                                              </ul>
                                            )}
                                          </div>
                                          <div className="bg-white px-4 py-3">
                                            <p className="text-[12px] font-medium text-[#6B7280]">Remarks</p>
                                            <p className={`mt-1 whitespace-pre-wrap ${s.notes ? "text-[#0F1117]" : "text-[#9CA3AF]"}`}>
                                              {s.notes || "None"}
                                            </p>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>
          )}

          {/* Clock in / clock out */}
          {modalType && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F1117]/40 p-4 backdrop-blur-sm"
              role="dialog"
              aria-modal="true"
              aria-label={modalType === "clock_in" ? "Clock in" : "Clock out"}
            >
              <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[#E8E8E3] bg-white p-6 shadow-[0_24px_60px_-20px_rgba(15,17,23,0.35)]">
                <h3 className="text-[17px] font-bold text-[#0F1117]">
                  {modalType === "clock_in" ? "Clock in" : "Clock out and count the till"}
                </h3>
                <p className="mt-1 text-[13px] text-[#6B7280]">
                  {modalType === "clock_in"
                    ? "Enter the cash you're starting with. Leave it empty if you won't handle cash."
                    : "Count the cash in the drawer so the shift can be settled."}
                </p>

                {modalType === "clock_in" ? (
                  <form onSubmit={handleClockIn} className="mt-5 space-y-4">
                    <div>
                      <label className={LABEL} htmlFor="shift-name">Name on shift</label>
                      <input
                        id="shift-name"
                        value={staffName}
                        onChange={(e) => setStaffName(e.target.value)}
                        placeholder="Staff name"
                        required
                        className={INPUT}
                      />
                    </div>
                    <div>
                      <label className={LABEL} htmlFor="shift-float">Opening float (₹)</label>
                      <input
                        id="shift-float"
                        type="number"
                        step="0.01"
                        min={0}
                        autoFocus
                        value={floatVal}
                        onChange={(e) => setFloatVal(e.target.value)}
                        placeholder="0.00"
                        className={`${INPUT} tabular-nums`}
                      />
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {[500, 1000, 2000, 5000].map((q) => {
                          const on = floatVal === String(q);
                          return (
                            <button
                              key={q}
                              type="button"
                              onClick={() => setFloatVal(String(q))}
                              aria-pressed={on}
                              className={`h-8 rounded-lg border px-3 text-[12px] font-medium tabular-nums transition-colors ${on ? "border-[#fe5c13] bg-[#FFF4EC] text-[#0F1117]" : "border-[#E8E8E3] bg-white text-[#4B5563] hover:border-[#D6D6CF] hover:text-[#0F1117]"}`}
                            >
                              ₹{q.toLocaleString("en-IN")}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <ModalActions onCancel={resetModal} loading={isActionLoading} label="Clock in" />
                  </form>
                ) : (
                  <form onSubmit={handleClockOut} className="mt-5 space-y-4">
                    <dl className="grid grid-cols-2 divide-x divide-[#F0F0EB] rounded-xl border border-[#E8E8E3]">
                      <div className="px-4 py-3">
                        <dt className="text-[12px] font-medium text-[#6B7280]">Opening float</dt>
                        <dd className="mt-1 text-[16px] font-semibold tabular-nums text-[#0F1117]">
                          {fmtINR(activeShift?.opening_float ?? 0)}
                        </dd>
                      </div>
                      <div className="px-4 py-3">
                        <dt className="text-[12px] font-medium text-[#6B7280]">Expected in till</dt>
                        <dd className="mt-1 text-[16px] font-semibold tabular-nums text-[#0F1117]">
                          {expectedCash === null ? "—" : fmtINR(expectedCash)}
                        </dd>
                      </div>
                    </dl>

                    {skipCount ? (
                      <p className="rounded-xl border border-[#E8E8E3] bg-[#FAFAF7] px-4 py-3 text-[13px] text-[#4B5563]">
                        Skipping the cash count because this shift didn&apos;t handle the till.
                      </p>
                    ) : (
                      <CashCounter onChange={setCounted} autoFocus />
                    )}
                    {!handlesCash && (
                      <button
                        type="button"
                        onClick={() => {
                          setSkipCount((v) => !v);
                          setCounted(null);
                        }}
                        className="text-[13px] font-medium text-[#6B7280] underline decoration-[#D6D6CF] underline-offset-2 transition-colors hover:text-[#0F1117] hover:decoration-[#0F1117]"
                      >
                        {skipCount ? "Count the drawer instead" : "I didn't handle cash, skip the count"}
                      </button>
                    )}

                    {expectedCash !== null && <VarianceBanner expected={expectedCash} counted={counted} />}

                    <div>
                      <label className={LABEL} htmlFor="shift-notes">
                        Remarks{variance ? <span className="text-rose-600"> (needed to explain the difference)</span> : ""}
                      </label>
                      <textarea
                        id="shift-notes"
                        value={notesVal}
                        onChange={(e) => setNotesVal(e.target.value)}
                        placeholder="Shortages, cash drops, anything the next person should know"
                        className="h-20 w-full resize-none rounded-xl border border-[#E8E8E3] bg-white px-3.5 py-2.5 text-[14px] text-[#0F1117] outline-none transition-colors placeholder:text-[#9CA3AF] hover:border-[#D6D6CF] focus:border-[#fe5c13]"
                      />
                    </div>

                    {needsPin && (
                      <div className="rounded-xl border border-rose-200/70 bg-rose-50 p-4">
                        <label htmlFor="shift-pin" className="flex items-center gap-1.5 text-[13px] font-semibold text-rose-700">
                          <KeyRound className="h-3.5 w-3.5" /> Manager PIN needed
                        </label>
                        <p className="mt-0.5 text-[12px] text-rose-700/80">The cash difference is above the limit a manager has set.</p>
                        <input
                          id="shift-pin"
                          type="password"
                          inputMode="numeric"
                          autoFocus
                          value={managerPin}
                          onChange={(e) => setManagerPin(e.target.value)}
                          placeholder="••••"
                          className="mt-3 h-10 w-full rounded-xl border border-rose-200 bg-white px-3.5 text-[14px] tracking-widest text-[#0F1117] outline-none focus:border-rose-400"
                        />
                      </div>
                    )}

                    <ModalActions
                      onCancel={resetModal}
                      loading={isActionLoading}
                      label={needsPin ? "Approve and clock out" : "Clock out"}
                    />
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ModalActions({
  onCancel,
  loading,
  label,
}: {
  onCancel: () => void;
  loading: boolean;
  label: string;
}) {
  return (
    <div className="flex gap-2 pt-2">
      <button
        type="button"
        onClick={onCancel}
        className="h-10 flex-1 rounded-xl border border-[#E8E8E3] bg-white text-[13px] font-semibold text-[#374151] transition-colors hover:border-[#D6D6CF] hover:text-[#0F1117]"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={loading}
        className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#fe5c13] text-[14px] font-semibold text-white transition-colors hover:bg-[#e44e0b] disabled:opacity-50"
      >
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving</> : label}
      </button>
    </div>
  );
}
