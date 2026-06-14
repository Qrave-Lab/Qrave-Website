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

  const renderRoleBadge = (role: string) => {
    const r = role.toLowerCase();
    if (r === "owner") {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-100">
          Owner
        </span>
      );
    }
    if (r === "admin") {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100">
          Admin
        </span>
      );
    }
    if (r === "cashier") {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-100">
          Cashier
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-50 text-slate-600 border border-slate-200/60">
        {role}
      </span>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
      <StaffSidebar />
      <div className="flex-1 flex flex-col min-w-0 relative">
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-8 sticky top-0 z-10 shrink-0">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-gray-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#fe5c13]" />
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
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50 transition-all shadow-sm cursor-pointer hover:border-slate-300"
            >
              <RefreshCw className="h-4 w-4 text-slate-500" />
              Refresh
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50 relative">

            {isLoading ? (
              <div className="flex min-h-[50vh] items-center justify-center py-12">
                <div className="flex flex-col items-center gap-2">
                  <Clock className="h-8 w-8 animate-spin text-[#fe5c13]" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Syncing Shift Deck...</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col min-h-full">
                {/* Active Shift Status Banner */}
                {!isClockedIn || !activeShift ? (
                  <div className="border-b border-slate-200 bg-white px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-slate-300" />
                    
                    <div className="flex flex-col md:flex-row md:items-center gap-6 pl-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 border border-slate-100 shrink-0">
                        <LogOut className="h-6 w-6" />
                      </div>
                      
                      <div className="space-y-1">
                        <h3 className="text-base font-extrabold text-slate-900">You are Clocked Out</h3>
                        <p className="text-xs text-slate-500 font-medium">
                          Start a new shift and define your register float to begin sales operations.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setFloatVal("");
                        setNotesVal("");
                        setModalType("clock_in");
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 hover:bg-slate-900 px-6 py-3.5 text-xs font-black uppercase tracking-wider text-white transition-all shadow-md shrink-0 active:scale-95 cursor-pointer"
                    >
                      <LogIn className="h-4 w-4" />
                      Clock In Shift
                    </button>
                  </div>
                ) : (
                  <div className="border-b border-slate-200 bg-white px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500" />
                    
                    <div className="flex flex-col md:flex-row md:items-center gap-6 pl-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 relative shrink-0">
                        <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                        <Clock className="h-6 w-6" />
                      </div>
                      
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2.5">
                          <h3 className="text-base font-extrabold text-slate-900">
                            {activeShift.user_name}
                          </h3>
                          {renderRoleBadge(activeShift.role)}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs font-medium text-slate-500">
                          <span className="flex items-center gap-1.5">
                            <span className="text-slate-400">Clocked in:</span> 
                            <span className="font-bold text-slate-700">{new Date(activeShift.clocked_in_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="text-slate-400">Starting Float:</span> 
                            <span className="font-extrabold text-[#fe5c13]">{fmtINR(activeShift.opening_float)}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setFloatVal("");
                        setNotesVal("");
                        setModalType("clock_out");
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-50 px-5 py-3 text-xs font-black uppercase tracking-wider text-rose-700 transition-all shrink-0 hover:shadow-sm cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" />
                      Clock Out Shift
                    </button>
                  </div>
                )}

                {/* Shift History & Audits Full-width Table */}
                <div className="bg-white min-h-full flex flex-col">
                  <div className="border-b border-slate-100 px-8 py-4.5 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-2.5">
                      <History className="h-4.5 w-4.5 text-slate-400" />
                      <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Shift History & Audits</h2>
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md">
                      {shifts.length} Total Logs
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">
                          <th className="px-8 py-4">Date</th>
                          <th className="px-8 py-4">Staff Member</th>
                          <th className="px-8 py-4">Role</th>
                          <th className="px-8 py-4">Hours Active</th>
                          <th className="px-8 py-4">Float (Start / End)</th>
                          <th className="px-8 py-4">Remarks & Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                        {shifts.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-8 py-12 text-center text-slate-400 font-bold uppercase tracking-wider">
                              No shifts logged in database yet.
                            </td>
                          </tr>
                        ) : (
                          shifts.map((s) => (
                            <tr key={s.id} className="hover:bg-slate-50/40 transition-colors">
                              <td className="px-8 py-4 font-extrabold text-slate-400">
                                {new Date(s.clocked_in_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                              </td>
                              <td className="px-8 py-4 font-bold text-slate-900">{s.user_name}</td>
                              <td className="px-8 py-4">{renderRoleBadge(s.role)}</td>
                              <td className="px-8 py-4 font-bold text-slate-700">
                                {fmtDuration(s.duration_mins)}
                              </td>
                              <td className="px-8 py-4">
                                <div className="flex items-center gap-2 font-bold">
                                  <span className="text-emerald-600" title="Starting Float">{fmtINR(s.opening_float)}</span>
                                  <span className="text-slate-300">/</span>
                                  <span className={s.closing_float !== undefined ? "text-slate-800" : "text-slate-400 italic"} title="Closing Float">
                                    {s.closing_float !== undefined ? fmtINR(s.closing_float) : "Open"}
                                  </span>
                                </div>
                              </td>
                              <td className="px-8 py-4 font-semibold text-slate-400 max-w-[200px] truncate" title={s.notes}>
                                {s.notes || "--"}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Shift Modal */}
            {modalType && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="w-full max-w-md rounded-2xl border border-slate-150 bg-white p-6 shadow-2xl overflow-y-auto animate-in zoom-in-95 duration-200">
                  <h3 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3.5 mb-4.5 uppercase tracking-wider">
                    {modalType === "clock_in" ? "Clock In Shift & Open Till" : "Clock Out Shift & Settle Till"}
                  </h3>

                  <form onSubmit={modalType === "clock_in" ? handleClockIn : handleClockOut} className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Your Full Name</label>
                      <input
                        type="text"
                        required
                        value={staffName}
                        onChange={(e) => setStaffName(e.target.value)}
                        placeholder="Staff Name"
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-sm focus:border-[#fe5c13] focus:ring-4 focus:ring-[#fe5c13]/10 focus:outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">
                        {modalType === "clock_in" ? "Starting Drawer Float (₹)" : "Closing Drawer Float (₹)"}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={floatVal}
                        onChange={(e) => setFloatVal(e.target.value)}
                        placeholder="0.00"
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-sm focus:border-[#fe5c13] focus:ring-4 focus:ring-[#fe5c13]/10 focus:outline-none transition-all"
                      />
                    </div>

                    {modalType === "clock_out" && (
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">End-of-shift Remarks</label>
                        <textarea
                          value={notesVal}
                          onChange={(e) => setNotesVal(e.target.value)}
                          placeholder="Reconciliation notes, shortages, drops, etc."
                          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm focus:border-[#fe5c13] focus:ring-4 focus:ring-[#fe5c13]/10 focus:outline-none h-20 resize-none transition-all"
                        />
                      </div>
                    )}

                    <div className="flex gap-3 pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setModalType(null);
                          setFloatVal("");
                          setNotesVal("");
                        }}
                        className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isActionLoading}
                        className="flex-1 rounded-xl bg-slate-950 py-3 text-xs font-black uppercase tracking-wider text-white hover:bg-slate-900 shadow-md transition-all disabled:opacity-50 cursor-pointer"
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
  );
}
