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
  if (mins === undefined || mins === null) return "--";
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

const ROLE_STYLES: Record<string, string> = {
  owner: "bg-purple-50 text-purple-700 border-purple-100",
  manager: "bg-blue-50 text-blue-700 border-blue-100",
  admin: "bg-blue-50 text-blue-700 border-blue-100",
  cashier: "bg-amber-50 text-amber-700 border-amber-100",
  waiter: "bg-sky-50 text-sky-700 border-sky-100",
  captain: "bg-teal-50 text-teal-700 border-teal-100",
  kitchen: "bg-rose-50 text-rose-700 border-rose-100",
};

const RoleBadge = ({ role }: { role: string }) => (
  <span
    className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${ROLE_STYLES[role.toLowerCase()] || "bg-slate-50 text-slate-600 border-slate-200/60"}`}
  >
    {role}
  </span>
);

const PERIODS: { id: Period; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "all", label: "All" },
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

  const inputCls =
    "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-sm focus:border-[#fe5c13] focus:ring-4 focus:ring-[#fe5c13]/10 focus:outline-none transition-all";
  const labelCls =
    "text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1";

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 font-sans text-gray-900">
      <StaffSidebar />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-8">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-gray-900">
              <Clock className="h-5 w-5 text-[#fe5c13]" />
              Shifts &amp; Attendance
            </h2>
            <p className="text-xs text-gray-500">
              Clock in, take breaks, count the till and audit every shift.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canSeeHistory && (
              <button
                type="button"
                onClick={exportCsv}
                disabled={filtered.length === 0}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 disabled:opacity-40"
              >
                <Download className="h-4 w-4 text-slate-500" /> CSV
              </button>
            )}
            <button
              type="button"
              onClick={() => void fetchAll()}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4 text-slate-500" /> Refresh
            </button>
          </div>
        </header>

        <div className="relative flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex min-h-[50vh] items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Clock className="h-8 w-8 animate-spin text-[#fe5c13]" />
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Loading shifts…
                </p>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-7xl space-y-6 p-6 md:p-8">
              {/* ── Active shift hero ── */}
              {!activeShift ? (
                <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                  <div className="absolute inset-y-0 left-0 w-1.5 bg-slate-300" />
                  <div className="flex flex-col justify-between gap-6 pl-2 md:flex-row md:items-center">
                    <div className="flex items-center gap-5">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-slate-400">
                        <LogOut className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-extrabold text-slate-900">
                          You&apos;re clocked out
                        </h3>
                        <p className="mt-0.5 text-xs font-medium text-slate-500">
                          Start your shift and enter the opening float to begin
                          taking cash.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        resetModal();
                        setModalType("clock_in");
                      }}
                      className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-950 px-7 py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-md transition-all hover:bg-slate-800 active:scale-95"
                    >
                      <LogIn className="h-4 w-4" /> Clock in
                    </button>
                  </div>
                </section>
              ) : (
                <section
                  className={`relative overflow-hidden rounded-3xl border bg-white p-6 shadow-sm md:p-8 ${openBreak ? "border-amber-200" : "border-emerald-200"}`}
                >
                  <div
                    className={`absolute inset-y-0 left-0 w-1.5 ${openBreak ? "bg-amber-400" : "bg-emerald-500"}`}
                  />
                  <div className="flex flex-col gap-6 pl-2 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-5">
                      <div
                        className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${openBreak ? "border-amber-100 bg-amber-50 text-amber-600" : "border-emerald-100 bg-emerald-50 text-emerald-600"}`}
                      >
                        {openBreak ? (
                          <Coffee className="h-6 w-6" />
                        ) : (
                          <Timer className="h-6 w-6" />
                        )}
                        <span className="absolute right-1.5 top-1.5 flex h-2.5 w-2.5">
                          <span
                            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${openBreak ? "bg-amber-400" : "bg-emerald-400"}`}
                          />
                          <span
                            className={`relative inline-flex h-2.5 w-2.5 rounded-full ${openBreak ? "bg-amber-500" : "bg-emerald-500"}`}
                          />
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h3 className="text-lg font-extrabold text-slate-900">
                            {activeShift.user_name}
                          </h3>
                          <RoleBadge role={activeShift.role} />
                          {openBreak && (
                            <span className="rounded-lg bg-amber-100 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-amber-800">
                              On {openBreak.is_paid ? "paid" : "unpaid"} break
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs font-medium text-slate-500">
                          Since {fmtTime(activeShift.clocked_in_at)} ·{" "}
                          {fmtDate(activeShift.clocked_in_at)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[560px]">
                      {[
                        {
                          label: "Time on shift",
                          value: fmtClock(elapsedSecs),
                          tone: "text-slate-900",
                        },
                        {
                          label: "Break time",
                          value: fmtClock(breakSecsTotal),
                          tone: "text-amber-600",
                        },
                        {
                          label: "Opening float",
                          value: fmtINR(activeShift.opening_float),
                          tone: "text-slate-900",
                        },
                        {
                          label: "Expected in till",
                          value:
                            expectedCash === null ? "--" : fmtINR(expectedCash),
                          tone: "text-[#fe5c13]",
                        },
                      ].map((k) => (
                        <div
                          key={k.label}
                          className="rounded-2xl border border-slate-100 bg-slate-50/70 px-3.5 py-3"
                        >
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                            {k.label}
                          </p>
                          <p
                            className={`mt-1 font-mono text-sm font-extrabold tabular-nums ${k.tone}`}
                          >
                            {k.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center gap-2.5 border-t border-slate-100 pt-5 pl-2">
                    {openBreak ? (
                      <button
                        onClick={() => void handleBreak(true)}
                        disabled={isActionLoading}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-sm transition-all hover:bg-amber-600 disabled:opacity-50"
                      >
                        <Play className="h-4 w-4" /> End break
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => void handleBreak(true)}
                          disabled={isActionLoading}
                          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-50"
                        >
                          <Coffee className="h-4 w-4 text-slate-500" /> Paid break
                        </button>
                        <button
                          onClick={() => void handleBreak(false)}
                          disabled={isActionLoading}
                          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-50"
                        >
                          <Coffee className="h-4 w-4 text-slate-500" /> Unpaid
                          break
                        </button>
                      </>
                    )}
                    <div className="flex-1" />
                    <button
                      onClick={() => {
                        resetModal();
                        setModalType("clock_out");
                      }}
                      disabled={!!openBreak}
                      title={openBreak ? "End your break first" : undefined}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-rose-700 transition-all hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <LogOut className="h-4 w-4" /> Clock out
                    </button>
                  </div>
                </section>
              )}

              {/* ── History ── */}
              {!canSeeHistory ? (
                <section className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                  <History className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-3 text-sm font-bold text-slate-700">
                    Shift history is visible to owners and managers.
                  </p>
                </section>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                    {[
                      {
                        icon: Users,
                        label: "Staff on record",
                        value: String(stats.people),
                      },
                      {
                        icon: Clock,
                        label: "Hours worked",
                        value: `${(stats.mins / 60).toFixed(1)} h`,
                      },
                      {
                        icon: Wallet,
                        label: "Net cash variance",
                        value: fmtINR(stats.netVar),
                        tone:
                          stats.netVar < 0
                            ? "text-rose-600"
                            : stats.netVar > 0
                              ? "text-amber-600"
                              : "text-emerald-600",
                      },
                      {
                        icon: AlertTriangle,
                        label: "Shifts short",
                        value: String(stats.shortages),
                        tone: stats.shortages ? "text-rose-600" : undefined,
                      },
                      {
                        icon: IndianRupee,
                        label: "Labour cost (est.)",
                        value: stats.labour ? fmtINR(stats.labour) : "--",
                      },
                    ].map((k) => (
                      <div
                        key={k.label}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex items-center gap-2 text-slate-400">
                          <k.icon className="h-3.5 w-3.5" />
                          <span className="text-[10px] font-black uppercase tracking-widest">
                            {k.label}
                          </span>
                        </div>
                        <p
                          className={`mt-2 text-xl font-black tabular-nums ${k.tone || "text-slate-900"}`}
                        >
                          {k.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/50 px-6 py-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-2.5">
                        <History className="h-4 w-4 text-slate-400" />
                        <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">
                          Shift history
                        </h2>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          {filtered.length}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                          <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search staff or role"
                            className="w-52 rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs font-semibold text-slate-700 focus:border-[#fe5c13] focus:outline-none focus:ring-4 focus:ring-[#fe5c13]/10"
                          />
                        </div>
                        <div className="flex rounded-xl bg-slate-100 p-0.5">
                          {PERIODS.map((p) => (
                            <button
                              key={p.id}
                              onClick={() => setPeriod(p.id)}
                              className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all ${period === p.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => setVarianceOnly((v) => !v)}
                          className={`rounded-xl border px-3 py-2 text-[11px] font-bold transition-all ${varianceOnly ? "border-rose-200 bg-rose-50 text-rose-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                        >
                          Variance only
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-black uppercase tracking-wider text-slate-400">
                            <th className="w-10 px-4 py-3.5" />
                            <th className="px-4 py-3.5">Date</th>
                            <th className="px-4 py-3.5">Staff</th>
                            <th className="px-4 py-3.5">In – Out</th>
                            <th className="px-4 py-3.5">Hours</th>
                            <th className="px-4 py-3.5 text-right">Expected</th>
                            <th className="px-4 py-3.5 text-right">Counted</th>
                            <th className="px-4 py-3.5 text-right">Variance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {filtered.length === 0 ? (
                            <tr>
                              <td
                                colSpan={8}
                                className="px-8 py-14 text-center font-bold uppercase tracking-wider text-slate-400"
                              >
                                No shifts match these filters.
                              </td>
                            </tr>
                          ) : (
                            filtered.map((s) => {
                              const open = !s.clocked_out_at;
                              const v = s.cash_discrepancy;
                              const isOpen = expanded === s.id;
                              return (
                                <React.Fragment key={s.id}>
                                  <tr
                                    onClick={() =>
                                      setExpanded(isOpen ? null : s.id)
                                    }
                                    className="cursor-pointer transition-colors hover:bg-slate-50/60"
                                  >
                                    <td className="px-4 py-3.5 text-slate-300">
                                      {isOpen ? (
                                        <ChevronDown className="h-4 w-4" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4" />
                                      )}
                                    </td>
                                    <td className="px-4 py-3.5 font-bold text-slate-500">
                                      {fmtDate(s.clocked_in_at)}
                                    </td>
                                    <td className="px-4 py-3.5">
                                      <div className="flex items-center gap-2.5">
                                        <span className="font-bold text-slate-900">
                                          {s.user_name}
                                        </span>
                                        <RoleBadge role={s.role} />
                                      </div>
                                    </td>
                                    <td className="px-4 py-3.5 font-semibold">
                                      {fmtTime(s.clocked_in_at)} –{" "}
                                      {open ? (
                                        <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-black uppercase text-emerald-700">
                                          Live
                                        </span>
                                      ) : (
                                        fmtTime(s.clocked_out_at as string)
                                      )}
                                    </td>
                                    <td className="px-4 py-3.5 font-bold">
                                      {fmtDuration(s.duration_mins)}
                                    </td>
                                    <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-slate-500">
                                      {s.expected_cash != null
                                        ? fmtINR(s.expected_cash)
                                        : "--"}
                                    </td>
                                    <td className="px-4 py-3.5 text-right font-bold tabular-nums">
                                      {s.closing_float != null
                                        ? fmtINR(s.closing_float)
                                        : "--"}
                                    </td>
                                    <td className="px-4 py-3.5 text-right">
                                      {v == null ? (
                                        <span className="text-slate-300">--</span>
                                      ) : v === 0 ? (
                                        <span className="rounded-md bg-emerald-50 px-2 py-1 font-black text-emerald-700">
                                          Balanced
                                        </span>
                                      ) : (
                                        <span
                                          className={`rounded-md px-2 py-1 font-black tabular-nums ${v < 0 ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}
                                        >
                                          {v > 0 ? "+" : "−"}
                                          {fmtINR(Math.abs(v))}
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                  {isOpen && (
                                    <tr className="bg-slate-50/60">
                                      <td />
                                      <td colSpan={7} className="px-4 py-4">
                                        <div className="grid gap-4 text-xs md:grid-cols-3">
                                          <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                              Float
                                            </p>
                                            <p className="mt-1 font-semibold">
                                              Opened with{" "}
                                              {fmtINR(s.opening_float)}
                                            </p>
                                            {(s.payable_hours ?? 0) > 0 && (
                                              <p className="mt-0.5 text-slate-500">
                                                Payable{" "}
                                                {(s.payable_hours || 0).toFixed(2)}{" "}
                                                h
                                                {s.hourly_rate
                                                  ? ` × ${fmtINR(s.hourly_rate)}/h`
                                                  : ""}
                                              </p>
                                            )}
                                          </div>
                                          <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                              Breaks ({breakMins(s)}m)
                                            </p>
                                            {(s.breaks || []).length === 0 ? (
                                              <p className="mt-1 text-slate-400">
                                                None taken
                                              </p>
                                            ) : (
                                              <ul className="mt-1 space-y-0.5 font-semibold">
                                                {s.breaks!.map((b) => (
                                                  <li key={b.id}>
                                                    {fmtTime(b.start_time)} –{" "}
                                                    {b.end_time
                                                      ? fmtTime(b.end_time)
                                                      : "ongoing"}{" "}
                                                    <span className="font-medium text-slate-400">
                                                      (
                                                      {b.is_paid
                                                        ? "paid"
                                                        : "unpaid"}
                                                      )
                                                    </span>
                                                  </li>
                                                ))}
                                              </ul>
                                            )}
                                          </div>
                                          <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                              Remarks
                                            </p>
                                            <p className="mt-1 whitespace-pre-wrap font-medium text-slate-600">
                                              {s.notes || "--"}
                                            </p>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </>
              )}
            </div>
          )}

          {/* ── Modal ── */}
          {modalType && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
              <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
                <h3 className="mb-4 border-b border-slate-100 pb-3.5 text-base font-black uppercase tracking-wider text-slate-900">
                  {modalType === "clock_in"
                    ? "Clock in & open till"
                    : "Clock out & settle till"}
                </h3>

                {modalType === "clock_in" ? (
                  <form onSubmit={handleClockIn} className="space-y-4">
                    <div>
                      <label className={labelCls}>Name on shift</label>
                      <input
                        value={staffName}
                        onChange={(e) => setStaffName(e.target.value)}
                        placeholder="Staff name"
                        required
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Opening float (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        autoFocus
                        value={floatVal}
                        onChange={(e) => setFloatVal(e.target.value)}
                        placeholder="0.00 — leave empty if you don't handle cash"
                        className={inputCls}
                      />
                      <div className="mt-2 flex gap-1.5">
                        {[500, 1000, 2000, 5000].map((q) => (
                          <button
                            key={q}
                            type="button"
                            onClick={() => setFloatVal(String(q))}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-100"
                          >
                            ₹{q.toLocaleString("en-IN")}
                          </button>
                        ))}
                      </div>
                    </div>
                    <ModalActions
                      onCancel={resetModal}
                      loading={isActionLoading}
                      label="Clock in"
                    />
                  </form>
                ) : (
                  <form onSubmit={handleClockOut} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-3">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                          Opening float
                        </p>
                        <p className="mt-1 text-sm font-extrabold">
                          {fmtINR(activeShift?.opening_float ?? 0)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-orange-100 bg-orange-50 px-3.5 py-3">
                        <p className="text-[9px] font-black uppercase tracking-widest text-orange-400">
                          Expected in till
                        </p>
                        <p className="mt-1 text-sm font-extrabold text-[#fe5c13]">
                          {expectedCash === null ? "--" : fmtINR(expectedCash)}
                        </p>
                      </div>
                    </div>

                    {skipCount ? (
                      <p className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-xs font-medium text-slate-500">
                        Skipping the cash count — this shift didn&apos;t handle
                        the till.
                      </p>
                    ) : (
                      <CashCounter
                        onChange={setCounted}
                                                autoFocus
                      />
                    )}
                    {!handlesCash && (
                      <button
                        type="button"
                        onClick={() => {
                          setSkipCount((v) => !v);
                          setCounted(null);
                        }}
                        className="text-[11px] font-bold text-slate-500 underline underline-offset-2 hover:text-slate-800"
                      >
                        {skipCount ? "Count the drawer instead" : "I didn't handle cash — skip count"}
                      </button>
                    )}

                    {expectedCash !== null && (
                      <VarianceBanner expected={expectedCash} counted={counted} />
                    )}

                    <div>
                      <label className={labelCls}>
                        End-of-shift remarks
                        {variance ? " (required)" : ""}
                      </label>
                      <textarea
                        value={notesVal}
                        onChange={(e) => setNotesVal(e.target.value)}
                        placeholder="Reconciliation notes, shortages, drops, handover…"
                        className={`${inputCls} h-20 resize-none font-medium`}
                      />
                    </div>

                    {needsPin && (
                      <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5">
                        <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-rose-700">
                          <KeyRound className="h-3.5 w-3.5" /> Manager PIN
                          required
                        </label>
                        <input
                          type="password"
                          inputMode="numeric"
                          autoFocus
                          value={managerPin}
                          onChange={(e) => setManagerPin(e.target.value)}
                          placeholder="••••"
                          className="mt-2 w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-bold tracking-widest focus:border-rose-400 focus:outline-none focus:ring-4 focus:ring-rose-100"
                        />
                      </div>
                    )}

                    <ModalActions
                      onCancel={resetModal}
                      loading={isActionLoading}
                      label={needsPin ? "Approve & clock out" : "Clock out"}
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
    <div className="flex gap-3 border-t border-slate-100 pt-4">
      <button
        type="button"
        onClick={onCancel}
        className="flex-1 cursor-pointer rounded-xl border border-slate-200 bg-white py-3 text-xs font-bold uppercase tracking-wider text-slate-700 shadow-sm transition-all hover:bg-slate-50"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={loading}
        className="flex-1 cursor-pointer rounded-xl bg-slate-950 py-3 text-xs font-black uppercase tracking-wider text-white shadow-md transition-all hover:bg-slate-800 disabled:opacity-50"
      >
        {loading ? "Saving…" : label}
      </button>
    </div>
  );
}
