"use client";

import React, { useEffect, useState } from "react";
import { Clock, Key, LogIn, LogOut, CheckCircle2, History, AlertCircle, RefreshCw, Calendar } from "lucide-react";
import StaffSidebar from "@/app/components/StaffSidebar";
import { api } from "@/app/lib/api";
import { toast } from "react-hot-toast";

type StaffShift = {
  id: string;
  user_name: string;
  role: string;
  clocked_in_at: string;
  clocked_out_at?: string;
  opening_float: number;
  closing_float?: number;
  notes: string;
  duration_mins?: number;
};

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<StaffShift[]>([]);
  const [activeShift, setActiveShift] = useState<StaffShift | null>(null);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Form states
  const [floatVal, setFloatVal] = useState<string>("");
  const [notesVal, setNotesVal] = useState<string>("");
  const [staffName, setStaffName] = useState<string>("");

  // Modal control
  const [modalType, setModalType] = useState<"clock_in" | "clock_out" | null>(null);

  const fetchShiftsData = async () => {
    try {
      const [historyRes, activeRes, meRes] = await Promise.all([
        api<{ shifts: StaffShift[] }>("/api/admin/shifts").catch(() => ({ shifts: [] })),
        api<{ shift: StaffShift | null; is_clocked_in: boolean }>("/api/admin/shifts/active"),
        api<{ name?: string }>("/api/admin/me").catch(() => ({ name: "" })),
      ]);

      if (historyRes?.shifts) {
        setShifts(historyRes.shifts);
      }
      if (activeRes) {
        setIsClockedIn(activeRes.is_clocked_in);
        setActiveShift(activeRes.shift);
      }
      if (meRes?.name) {
        setStaffName(meRes.name);
      }
    } catch {
      toast.error("Failed to load shift records");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShiftsData();
  }, []);

  const handleClockIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const floatNum = parseFloat(floatVal);
    if (isNaN(floatNum) || floatNum < 0) {
      toast.error("Please enter a valid starting float");
      return;
    }

    setIsActionLoading(true);
    try {
      // 1. Clock in staff shift
      const res = await api<StaffShift>("/api/admin/shifts/clock-in", {
        method: "POST",
        headers: staffName ? { "X-User-Name": staffName } : {},
        body: JSON.stringify({
          opening_float: floatNum,
        }),
      });

      // 2. Proactively open the cash drawer float
      await api("/api/admin/cash-drawer/event", {
        method: "POST",
        body: JSON.stringify({
          event_type: "open",
          amount: floatNum,
          note: `Auto-opened on Shift Clock-In for ${staffName || "Staff"}`,
          shift_id: res.id,
        }),
      });

      toast.success("Clocked in & Cash drawer opened!");
      setFloatVal("");
      setNotesVal("");
      setModalType(null);
      await fetchShiftsData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to clock in");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleClockOut = async (e: React.FormEvent) => {
    e.preventDefault();
    const floatNum = parseFloat(floatVal);
    if (isNaN(floatNum) || floatNum < 0) {
      toast.error("Please enter a valid closing float");
      return;
    }

    setIsActionLoading(true);
    try {
      // 1. Clock out shift
      await api("/api/admin/shifts/clock-out", {
        method: "POST",
        body: JSON.stringify({
          closing_float: floatNum,
          notes: notesVal,
        }),
      });

      // 2. Proactively log closing event in cash drawer
      await api("/api/admin/cash-drawer/event", {
        method: "POST",
        body: JSON.stringify({
          event_type: "close",
          amount: floatNum,
          note: `Auto-closed on Shift Clock-Out: ${notesVal || "No remarks"}`,
          shift_id: activeShift?.id || "",
        }),
      });

      toast.success("Clocked out & Cash drawer closed!");
      setFloatVal("");
      setNotesVal("");
      setModalType(null);
      await fetchShiftsData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to clock out");
    } finally {
      setIsActionLoading(false);
    }
  };

  const fmtINR = (n: number) =>
    `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const fmtDuration = (mins?: number) => {
    if (mins === undefined) return "--";
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
      <StaffSidebar />
      <div className="flex-1 flex flex-col min-w-0 relative">
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-8 sticky top-0 z-10 shrink-0">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-gray-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#E8900A]" />
              Shift Clock-In & History
            </h2>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>Clock in/out to open register drawers and audit shift times.</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchShiftsData}
              className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 relative">
          <div className="mx-auto max-w-7xl space-y-6">

            {isLoading ? (
              <div className="flex min-h-[50vh] items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <Clock className="h-8 w-8 animate-spin text-orange-500" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Syncing Shift Deck...</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Clock Status Dashboard */}
                <div className="lg:col-span-1 space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">Shift Guard</h2>

                    {!isClockedIn || !activeShift ? (
                      <div className="text-center py-6">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3 border">
                          <LogIn className="h-5 w-5" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900">You are Clocked Out</h3>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-[200px] mx-auto">
                          Clock in now with your register float to start receiving guests.
                        </p>
                        <button
                          onClick={() => setModalType("clock_in")}
                          className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-slate-800 transition-all shadow-sm"
                        >
                          Clock In Shift
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-2.5 w-2.5 items-center justify-center rounded-full bg-emerald-100">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                            </span>
                            <span className="text-xs font-bold text-emerald-800 uppercase">Shift Active</span>
                          </div>
                          <div className="mt-3 space-y-1.5 text-xs text-slate-700">
                            <div>
                              <span className="text-[#888] font-medium">Logged in: </span>
                              <span className="font-bold">{activeShift.user_name} ({activeShift.role})</span>
                            </div>
                            <div>
                              <span className="text-[#888] font-medium">Clocked in: </span>
                              <span className="font-bold">{new Date(activeShift.clocked_in_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                            </div>
                            <div>
                              <span className="text-[#888] font-medium">Starting Float: </span>
                              <span className="font-extrabold text-emerald-700">{fmtINR(activeShift.opening_float)}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => setModalType("clock_out")}
                          className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold uppercase tracking-wider text-rose-700 hover:bg-rose-100 transition-all"
                        >
                          <LogOut className="h-4 w-4" />
                          Clock Out Shift
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Past Shifts History Table */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="border-b px-5 py-4 flex items-center gap-2 bg-slate-50/50">
                      <History className="h-4.5 w-4.5 text-slate-400" />
                      <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Shift History & Audits</h2>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400">
                            <th className="px-5 py-3">Date</th>
                            <th className="px-5 py-3">Staff</th>
                            <th className="px-5 py-3">Role</th>
                            <th className="px-5 py-3">Hours</th>
                            <th className="px-5 py-3">Float (Start/End)</th>
                            <th className="px-5 py-3">Remarks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y text-slate-700 text-xs">
                          {shifts.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-5 py-8 text-center text-slate-400 font-semibold">
                                No shifts logged in database yet.
                              </td>
                            </tr>
                          ) : (
                            shifts.map((s) => (
                              <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-5 py-3 font-semibold text-slate-400">
                                  {new Date(s.clocked_in_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                                </td>
                                <td className="px-5 py-3 font-bold text-slate-900">{s.user_name}</td>
                                <td className="px-5 py-3 uppercase text-[10px] font-black text-slate-500">{s.role}</td>
                                <td className="px-5 py-3 font-medium text-slate-700">
                                  {fmtDuration(s.duration_mins)}
                                </td>
                                <td className="px-5 py-3 font-bold text-slate-800">
                                  {fmtINR(s.opening_float)} / {s.closing_float !== undefined ? fmtINR(s.closing_float) : "--"}
                                </td>
                                <td className="px-5 py-3 font-medium text-slate-400 truncate max-w-[120px]" title={s.notes}>{s.notes || "--"}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Shift Modal */}
            {modalType && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
                <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl overflow-y-auto">
                  <h3 className="text-lg font-black text-slate-900 border-b pb-3 mb-4 uppercase tracking-wider">
                    {modalType === "clock_in" ? "Clock In Shift & Open Till" : "Clock Out Shift & Settle Till"}
                  </h3>

                  <form onSubmit={modalType === "clock_in" ? handleClockIn : handleClockOut} className="space-y-4">
                    <div>
                      <label className="text-xs font-black uppercase tracking-wider text-slate-400">Your Full Name</label>
                      <input
                        type="text"
                        required
                        value={staffName}
                        onChange={(e) => setStaffName(e.target.value)}
                        placeholder="Staff Name"
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-sm focus:border-orange-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-black uppercase tracking-wider text-slate-400">
                        {modalType === "clock_in" ? "Starting Drawer Float (₹)" : "Closing Drawer Float (₹)"}
                      </label>
                      <input
                        type="number"
                        required
                        value={floatVal}
                        onChange={(e) => setFloatVal(e.target.value)}
                        placeholder="0.00"
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-sm focus:border-orange-500 focus:outline-none"
                      />
                    </div>

                    {modalType === "clock_out" && (
                      <div>
                        <label className="text-xs font-black uppercase tracking-wider text-slate-400">End-of-shift Remarks</label>
                        <textarea
                          value={notesVal}
                          onChange={(e) => setNotesVal(e.target.value)}
                          placeholder="Reconciliation notes, shortages, drops, etc."
                          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm focus:border-orange-500 focus:outline-none h-20 resize-none"
                        />
                      </div>
                    )}

                    <div className="flex gap-2 pt-3 border-t">
                      <button
                        type="button"
                        onClick={() => {
                          setModalType(null);
                          setFloatVal("");
                          setNotesVal("");
                        }}
                        className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50 shadow-sm"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isActionLoading}
                        className="flex-1 rounded-xl bg-[#090A0F] py-3 text-xs font-black uppercase tracking-wider text-white hover:bg-slate-800 shadow-md disabled:opacity-50"
                      >
                        {isActionLoading ? "Recording..." : modalType === "clock_in" ? "Clock In" : "Clock Out"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
