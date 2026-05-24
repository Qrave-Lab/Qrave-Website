"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  CalendarCheck,
  CheckCircle2,
  Clock,
  ListPlus,
  Phone,
  Sparkles,
  Users,
  XCircle,
  Zap,
  ChevronDown,
  Settings,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";
import SettingsPageLayout from "@/app/components/settings/SettingsPageLayout";
import { api } from "@/app/lib/api";
import type { Table } from "@/app/components/settings/types";

type ReservationEntry = {
  id: string;
  guest_name: string;
  party_size: number;
  phone?: string | null;
  notes?: string | null;
  reserved_at: string;
  status: string;
  table_id?: string | null;
  table_number?: number | null;
  floor_name?: string | null;
  counter_name?: string | null;
  deposit_amount?: number;
  deposit_status?: 'unpaid' | 'paid' | 'refunded' | 'forfeited';
  payment_intent_id?: string | null;
  refund_amount?: number;
};

type AdminMeResponse = {
  currency?: string;
  reservation_deposit_required?: boolean;
  reservation_deposit_amount?: number;
};

type WaitlistEntry = {
  id: string;
  guest_name: string;
  party_size: number;
  phone?: string | null;
  quoted_minutes: number;
  status: string;
  priority: number;
  created_at: string;
  table_id?: string | null;
  table_number?: number | null;
  floor_name?: string | null;
  counter_name?: string | null;
};

type ActiveSessionAPI = {
  session_id: string;
  table_id: string;
  table_number: number;
  started_at: string;
  last_active_at: string;
};

// Returns true when a table is the "tightest fit" for the given party size:
// capacity >= partySize AND no more than 2 extra seats (to avoid over-allocating).
function isBestFit(table: Table, partySize: number): boolean {
  const cap = table.capacity ?? 4;
  return cap >= partySize && cap <= partySize + 2;
}

export default function ReservationsPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [reservations, setReservations] = useState<ReservationEntry[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [sessions, setSessions] = useState<ActiveSessionAPI[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [storeInfo, setStoreInfo] = useState<AdminMeResponse | null>(null);

  // Modals and Expands State
  const [showResModal, setShowResModal] = useState(false);
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [expandedWaitlistId, setExpandedWaitlistId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [reservationForm, setReservationForm] = useState({
    name: "",
    partySize: 2,
    date: "",
    time: "",
    tableId: "any",
    phone: "",
    notes: "",
  });

  const [waitlistForm, setWaitlistForm] = useState({
    name: "",
    partySize: 2,
    phone: "",
    quotedMins: 20,
  });

  // Per-waitlist-entry: chosen table for seating + auto_session toggle
  const [seatTable, setSeatTable] = useState<Record<string, string>>({});
  const [autoSession, setAutoSession] = useState<Record<string, boolean>>({});

  const loadData = useCallback(async () => {
    try {
      const [tablesData, reservationsRes, waitlistRes, sessionsRes, meRes] = await Promise.all([
        api<Table[]>("/api/admin/tables", { method: "GET" }),
        api<{ reservations?: ReservationEntry[] }>("/api/admin/reservations", { method: "GET" }),
        api<{ waitlist?: WaitlistEntry[] }>("/api/admin/waitlist", { method: "GET" }),
        api<{ sessions?: ActiveSessionAPI[] }>("/api/admin/sessions/active", { method: "GET" }),
        api<AdminMeResponse>("/api/admin/me", { method: "GET" }),
      ]);
      setTables(tablesData || []);
      setReservations(reservationsRes?.reservations || []);
      setWaitlist(waitlistRes?.waitlist || []);
      setSessions(sessionsRes?.sessions || []);
      setStoreInfo(meRes || null);
    } catch {
      toast.error("Failed to load reservations or waitlist");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // 10-second data poll and current-time ticker
    const interval = setInterval(() => {
      loadData().catch(() => {});
      setCurrentTime(new Date());
    }, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  const activeReservations = useMemo(() => {
    return reservations.filter((r) => r.status === "booked");
  }, [reservations]);

  const activeWaitlist = useMemo(() => {
    return waitlist.filter((w) => w.status === "waiting");
  }, [waitlist]);

  const tableOptions = useMemo(
    () => [...tables].sort((a, b) => a.table_number - b.table_number),
    [tables]
  );

  const getAvailableTablesForParty = useCallback(
    (partySize: number) => {
      const now = new Date();
      return tables.filter((table) => {
        if (!table.is_enabled) return false;
        
        const cap = table.capacity ?? 4;
        if (cap < partySize) return false;

        const hasSession = sessions.some((s) => s.table_id === table.id);
        if (hasSession) return false;

        const hasBlockingReservation = reservations.some((res) => {
          if (res.status !== "booked" || res.table_id !== table.id) return false;
          const resTime = new Date(res.reserved_at);
          const diffMs = resTime.getTime() - now.getTime();
          return diffMs > -30 * 60 * 1000 && diffMs < 120 * 60 * 1000;
        });

        return !hasBlockingReservation;
      });
    },
    [tables, sessions, reservations]
  );

  const getWaitTimerInfo = useCallback((createdAtStr: string, quotedMinutes: number) => {
    const createdAt = new Date(createdAtStr);
    const elapsedMs = currentTime.getTime() - createdAt.getTime();
    const elapsedMins = Math.max(0, Math.floor(elapsedMs / 60000));
    
    let colorClass = "bg-emerald-50 text-emerald-700 border-emerald-100/50";
    let statusText = `Waiting ${elapsedMins}m`;
    let isOverdue = false;

    if (elapsedMins >= quotedMinutes) {
      colorClass = "bg-rose-50 text-rose-700 border-rose-100/50 animate-pulse";
      statusText = `Overdue by ${elapsedMins - quotedMinutes}m`;
      isOverdue = true;
    } else if (elapsedMins >= quotedMinutes * 0.5) {
      colorClass = "bg-amber-50 text-amber-700 border-amber-100/50";
      statusText = `Waiting ${elapsedMins}m`;
    }

    return { elapsedMins, colorClass, statusText, isOverdue };
  }, [currentTime]);

  const addReservation = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reservationForm.name.trim()) { toast.error("Add guest name"); return; }
    if (!reservationForm.date || !reservationForm.time) { toast.error("Select date and time"); return; }

    const reservedAt = new Date(`${reservationForm.date}T${reservationForm.time}`);
    if (Number.isNaN(reservedAt.getTime())) { toast.error("Invalid date/time"); return; }

    try {
      await api("/api/admin/reservations", {
        method: "POST",
        body: JSON.stringify({
          guest_name: reservationForm.name.trim(),
          party_size: Math.max(1, reservationForm.partySize),
          reserved_at: reservedAt.toISOString(),
          table_id: reservationForm.tableId,
          phone: reservationForm.phone.trim() || undefined,
          notes: reservationForm.notes.trim() || undefined,
        }),
      });
      toast.success("Reservation created");
      setReservationForm((prev) => ({ ...prev, name: "", date: "", time: "", phone: "", notes: "" }));
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create reservation");
    }
  };

  const updateReservationStatus = async (id: string, status: string) => {
    try {
      await api(`/api/admin/reservations/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await loadData();
    } catch {
      toast.error("Failed to update reservation");
    }
  };

  const handleCancelReservation = async (entry: ReservationEntry) => {
    const hasPaidDeposit = entry.deposit_amount && entry.deposit_amount > 0 && entry.deposit_status === "paid";
    const msg = hasPaidDeposit
      ? `This reservation has a paid deposit. Cancelling will automatically refund ${storeInfo?.currency || "Rs."}${entry.deposit_amount}. Proceed?`
      : "Are you sure you want to cancel this reservation?";
    if (!confirm(msg)) return;

    try {
      await api(`/api/admin/reservations/${entry.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "cancelled" }),
      });
      toast.success(hasPaidDeposit ? "Reservation cancelled & deposit refunded ✓" : "Reservation cancelled");
      await loadData();
    } catch {
      toast.error("Failed to cancel reservation");
    }
  };

  const addWaitlist = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!waitlistForm.name.trim()) { toast.error("Add guest name"); return; }
    try {
      await api("/api/admin/waitlist", {
        method: "POST",
        body: JSON.stringify({
          guest_name: waitlistForm.name.trim(),
          party_size: Math.max(1, waitlistForm.partySize),
          phone: waitlistForm.phone.trim() || undefined,
          quoted_minutes: Math.max(5, waitlistForm.quotedMins),
        }),
      });
      toast.success("Added to waitlist");
      setWaitlistForm((prev) => ({ ...prev, name: "", phone: "" }));
      await loadData();
    } catch {
      toast.error("Failed to add waitlist");
    }
  };

  const seatWaitlistEntry = async (entry: WaitlistEntry) => {
    const tableId = seatTable[entry.id] || "auto";
    const shouldAutoSession = autoSession[entry.id] !== false; // default true
    try {
      const res = await api<{ session_id?: string; table_id?: string }>(
        `/api/admin/waitlist/${entry.id}/seat`,
        {
          method: "POST",
          body: JSON.stringify({ table_id: tableId, auto_session: shouldAutoSession }),
        }
      );
      if (res?.session_id) {
        toast.success(`${entry.guest_name} seated — dining session started ✓`, { duration: 4000 });
      } else {
        toast.success(`${entry.guest_name} seated`);
      }
      await loadData();
    } catch {
      toast.error("Failed to seat waitlist entry");
    }
  };

  const bumpWaitlistEntry = async (id: string) => {
    try {
      await api(`/api/admin/waitlist/${id}/bump`, { method: "POST" });
      await loadData();
    } catch {
      toast.error("Failed to bump waitlist entry");
    }
  };

  const removeWaitlistEntry = async (id: string) => {
    try {
      await api(`/api/admin/waitlist/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "removed" }),
      });
      await loadData();
    } catch {
      toast.error("Failed to remove waitlist entry");
    }
  };

  const formatReservationTime = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return `${parsed.toLocaleDateString()} • ${parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };

  return (
    <SettingsPageLayout
      title="Reservations & Waitlist"
      description="Reserve tables and keep a live queue for walk-ins."
      maxWidth="max-w-6xl"
    >
      {/* ── TOP ACTION BAR (Clean space saving design) ────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-sm font-bold text-slate-800">Quick Operations</h2>
          <p className="text-xs text-slate-500">Add reservations or manage walk-ins without wasting dashboard space.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowResModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <CalendarCheck className="h-4 w-4" /> Book Reservation
          </button>
          <button
            onClick={() => setShowWaitlistModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors cursor-pointer"
          >
            <Users className="h-4 w-4" /> Add Walk-in
          </button>
        </div>
      </div>

      {/* ── MAIN COLUMNS DISPLAY (Zero scroll side by side display) ──────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        
        {/* ── COLUMN 1: TABLE RESERVATIONS ──────────────────────────────────── */}
        <section className="flex flex-col h-[650px] rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4 bg-slate-50/50">
            <CalendarCheck className="h-5 w-5 text-indigo-500" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Upcoming Reservations</h2>
              <p className="text-[11px] text-slate-500">Bookings scheduled for today.</p>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {isLoading ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">Loading reservations...</div>
            ) : activeReservations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 rounded-xl border border-dashed border-slate-200 p-4 text-center">
                <span className="text-2xl mb-1">📅</span>
                <p className="text-xs font-bold text-slate-700">No reservations scheduled</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Click "Book Reservation" at the top to schedule.</p>
              </div>
            ) : (
              activeReservations.map((entry) => {
                let isResAvailable = false;
                let resAvailableTables: Table[] = [];
                if (entry.status === "booked") {
                  if (entry.table_id) {
                    const targetTable = tables.find(t => t.id === entry.table_id);
                    if (targetTable) {
                      const hasSession = sessions.some(s => s.table_id === targetTable.id);
                      const otherBlockingRes = reservations.some(res => {
                        if (res.id === entry.id || res.status !== "booked" || res.table_id !== targetTable.id) return false;
                        const resTime = new Date(res.reserved_at);
                        const thisTime = new Date(entry.reserved_at);
                        const diffMs = Math.abs(resTime.getTime() - thisTime.getTime());
                        return diffMs < 120 * 60 * 1000;
                      });
                      isResAvailable = targetTable.is_enabled && !hasSession && !otherBlockingRes;
                      if (isResAvailable) {
                        resAvailableTables = [targetTable];
                      }
                    }
                  } else {
                    resAvailableTables = getAvailableTablesForParty(entry.party_size);
                    isResAvailable = resAvailableTables.length > 0;
                  }
                }

                return (
                  <div key={entry.id} className="rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 p-3.5 transition-all">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-slate-900">{entry.guest_name}</p>
                          {entry.deposit_amount && entry.deposit_amount > 0 ? (
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider border ${
                              entry.deposit_status === "paid" ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                              entry.deposit_status === "refunded" ? "bg-slate-100 border-slate-200 text-slate-600" :
                              entry.deposit_status === "forfeited" ? "bg-rose-50 border-rose-200 text-rose-700" :
                              "bg-amber-50 border-amber-200 text-amber-700"
                            }`}>
                              {entry.deposit_status === "paid" && "Paid"}
                              {entry.deposit_status === "refunded" && "Refunded"}
                              {entry.deposit_status === "forfeited" && "Forfeited"}
                              {entry.deposit_status === "unpaid" && "Unpaid"}
                              {" "}({storeInfo?.currency || "Rs."}{entry.deposit_amount})
                            </span>
                          ) : null}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {formatReservationTime(entry.reserved_at)}
                          {entry.table_number ? ` • Table ${entry.table_number}` : " • Any table"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-white border border-slate-200/50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                          {entry.party_size} guests
                        </span>
                      </div>
                    </div>

                    {isResAvailable && (
                      <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 border border-emerald-100/50 text-[10px] font-bold text-emerald-700">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                        </span>
                        <span>
                          {entry.table_id ? (
                            <>Table T{entry.table_number} is available now</>
                          ) : (
                            <>Table ready: <span className="font-black">{resAvailableTables.map(t => `T${t.table_number}`).join(", ")}</span></>
                          )}
                        </span>
                      </div>
                    )}

                    {(entry.phone || entry.notes) && (
                      <p className="mt-2 text-[11px] text-slate-500 bg-white border border-slate-100 p-1.5 rounded-md">
                        {entry.phone ?? ""}{entry.phone && entry.notes ? " • " : ""}{entry.notes ?? ""}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100/70 pt-2.5">
                      <button
                        type="button"
                        onClick={() => updateReservationStatus(entry.id, "seated")}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Seat
                      </button>
                      <button
                        type="button"
                        onClick={() => updateReservationStatus(entry.id, "no_show")}
                        className="inline-flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200/50 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100 transition-colors cursor-pointer"
                      >
                        No-show
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCancelReservation(entry)}
                        className="inline-flex items-center gap-1 rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Cancel
                      </button>

                      {entry.deposit_amount && entry.deposit_amount > 0 && entry.deposit_status === "unpaid" && (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await api(`/api/admin/reservations/${entry.id}/pay-deposit`, {
                                method: "POST",
                                body: JSON.stringify({ payment_intent_id: `mock_pi_${Date.now()}` }),
                              });
                              toast.success("Deposit marked as paid");
                              await loadData();
                            } catch {
                              toast.error("Failed to update deposit");
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-yellow-50 border border-yellow-200/60 px-3 py-1.5 text-xs font-bold text-yellow-700 hover:bg-yellow-100 transition-colors cursor-pointer"
                        >
                          Record Pay
                        </button>
                      )}

                      {entry.deposit_amount && entry.deposit_amount > 0 && entry.deposit_status === "paid" && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (!confirm("Are you sure you want to refund this deposit?")) return;
                            try {
                              await api(`/api/admin/reservations/${entry.id}/refund-deposit`, { method: "POST" });
                              toast.success("Deposit refunded successfully");
                              await loadData();
                            } catch {
                              toast.error("Failed to refund deposit");
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-100 border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                        >
                          Refund Dep
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* ── COLUMN 2: LIVE WAITLIST QUEUE ──────────────────────────────────── */}
        <section className="flex flex-col h-[650px] rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4 bg-slate-50/50">
            <Users className="h-5 w-5 text-emerald-500" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Live Waitlist Queue</h2>
              <p className="text-[11px] text-slate-500">Live guest wait times and best-fit availability.</p>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {isLoading ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">Loading waitlist...</div>
            ) : activeWaitlist.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 rounded-xl border border-dashed border-slate-200 p-4 text-center">
                <span className="text-2xl mb-1">✨</span>
                <p className="text-xs font-bold text-slate-700">All guests seated!</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Waitlist is currently empty.</p>
              </div>
            ) : (
              activeWaitlist.map((entry) => {
                const isAutoSession = autoSession[entry.id] !== false;
                const availableTables = getAvailableTablesForParty(entry.party_size);
                const isAvailable = availableTables.length > 0;
                
                const timer = getWaitTimerInfo(entry.created_at, entry.quoted_minutes);
                const isExpanded = expandedWaitlistId === entry.id;

                return (
                  <div key={entry.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 transition-all">
                    
                    {/* Main Compact Row */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-center justify-center h-8 w-8 rounded-lg bg-white border border-slate-200/50 shadow-sm text-xs font-black text-slate-700">
                          #{entry.priority || "—"}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{entry.guest_name}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {entry.party_size} guests • quoted {entry.quoted_minutes}m
                          </p>
                        </div>
                      </div>

                      {/* Color-Coded Waiting Timer */}
                      <span className={`inline-flex items-center border rounded-lg px-2.5 py-1 text-xs font-black tracking-wide ${timer.colorClass}`}>
                        <Clock className="h-3.5 w-3.5 mr-1" />
                        {timer.statusText}
                      </span>
                    </div>

                    {/* Table availability alert */}
                    {isAvailable && (
                      <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 border border-emerald-100/50 text-[10px] font-bold text-emerald-700">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                        </span>
                        <span>
                          Table ready: <span className="font-black">{availableTables.map((t) => `T${t.table_number}`).join(", ")}</span>
                        </span>
                      </div>
                    )}

                    {/* Compact Primary Actions Row */}
                    <div className="mt-3 flex items-center gap-2 pt-2.5 border-t border-slate-100/70">
                      <button
                        type="button"
                        onClick={() => seatWaitlistEntry(entry)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Seat Guest
                      </button>

                      <button
                        type="button"
                        onClick={() => setExpandedWaitlistId(isExpanded ? null : entry.id)}
                        className={`inline-flex items-center justify-center p-1.5 rounded-lg border transition-all cursor-pointer ${
                          isExpanded 
                            ? "bg-slate-900 border-slate-900 text-white" 
                            : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                        }`}
                        title="Advanced Seating Options"
                      >
                        <Settings className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Advanced Controls Dropdown Drawer */}
                    {isExpanded && (
                      <div className="mt-3 p-3 bg-white rounded-xl border border-slate-200/60 space-y-3 animate-in slide-in-from-top-2 duration-150">
                        {/* Table selector with best-fit badges */}
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Select Seating Table</label>
                          <select
                            value={seatTable[entry.id] || "auto"}
                            onChange={(e) => setSeatTable((p) => ({ ...p, [entry.id]: e.target.value }))}
                            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 outline-none"
                          >
                            <option value="auto">Auto-assign (best fit)</option>
                            {tableOptions.map((table) => {
                              const best = isBestFit(table, entry.party_size);
                              const cap = table.capacity ?? 4;
                              const tooSmall = cap < entry.party_size;
                              return (
                                <option key={table.id} value={table.id} disabled={tooSmall}>
                                  {best ? "★ " : tooSmall ? "✗ " : ""}
                                  Table {table.table_number} ({cap} seats)
                                  {table.floor_name ? ` • ${table.floor_name}` : ""}
                                  {best ? " — Best fit" : tooSmall ? " — Too small" : ""}
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        {/* Auto-session toggle */}
                        <label className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-2.5 py-2">
                          <div className="flex items-center gap-1.5">
                            <Zap className={`h-3.5 w-3.5 ${isAutoSession ? "text-emerald-500" : "text-slate-400"}`} />
                            <span className="text-[10px] font-bold text-slate-600">
                              Auto-start dining session
                            </span>
                          </div>
                          <div
                            className={`relative h-4 w-7 rounded-full transition-colors ${
                              isAutoSession ? "bg-emerald-500" : "bg-slate-300"
                            }`}
                            onClick={() =>
                              setAutoSession((p) => ({ ...p, [entry.id]: !isAutoSession }))
                            }
                          >
                            <span
                              className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${
                                isAutoSession ? "translate-x-3.5" : "translate-x-0.5"
                              }`}
                            />
                          </div>
                        </label>

                        {/* Extra controls: Bump / Remove */}
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => { bumpWaitlistEntry(entry.id); setExpandedWaitlistId(null); }}
                            className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                          >
                            <ArrowUpRight className="h-3.5 w-3.5" /> Bump
                          </button>
                          <button
                            type="button"
                            onClick={() => { removeWaitlistEntry(entry.id); setExpandedWaitlistId(null); }}
                            className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-rose-50 border border-rose-100 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* ── MODALS (Forms grouped off screen to save massive space) ──────────────────── */}

      {/* Book Reservation Modal */}
      {showResModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <h3 className="text-base font-bold text-slate-900">Book Table Reservation</h3>
              <button 
                onClick={() => setShowResModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all cursor-pointer"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            
            {storeInfo?.reservation_deposit_required && (
              <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200/50 p-3.5 text-xs text-amber-800 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> Prepayment Deposit Required
                </p>
                <p>A secure reservation deposit of <strong>{storeInfo.currency || "Rs."}{storeInfo.reservation_deposit_amount}</strong> is required to secure this table booking.</p>
              </div>
            )}
            
            <form onSubmit={async (e) => { await addReservation(e); setShowResModal(false); }} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-xs font-semibold text-slate-600">
                  Guest Name
                  <input
                    value={reservationForm.name}
                    onChange={(e) => setReservationForm((p) => ({ ...p, name: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 outline-none"
                    placeholder="Aanya Sharma"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Party Size
                  <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                    <Users className="h-4 w-4 text-slate-400" />
                    <input
                      type="number"
                      min={1}
                      value={reservationForm.partySize}
                      onChange={(e) =>
                        setReservationForm((p) => ({ ...p, partySize: Math.max(1, Number(e.target.value) || 1) }))
                      }
                      className="w-full bg-transparent text-sm outline-none"
                    />
                  </div>
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-xs font-semibold text-slate-600">
                  Date
                  <input
                    type="date"
                    value={reservationForm.date}
                    onChange={(e) => setReservationForm((p) => ({ ...p, date: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 outline-none"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Time
                  <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 focus-within:border-slate-400">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <input
                      type="time"
                      value={reservationForm.time}
                      onChange={(e) => setReservationForm((p) => ({ ...p, time: e.target.value }))}
                      className="w-full bg-transparent text-sm outline-none"
                    />
                  </div>
                </label>
              </div>

              <label className="text-xs font-semibold text-slate-600 block">
                Table Pre-assignment
                <select
                  value={reservationForm.tableId}
                  onChange={(e) => setReservationForm((p) => ({ ...p, tableId: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 outline-none bg-white"
                >
                  <option value="any">Any table</option>
                  {tableOptions.map((table) => {
                    const best = isBestFit(table, reservationForm.partySize);
                    return (
                      <option key={table.id} value={table.id}>
                        {best ? "★ " : ""}Table {table.table_number}
                        {table.capacity ? ` (${table.capacity} seats)` : ""}
                        {table.floor_name ? ` • ${table.floor_name}` : ""}
                        {best ? " — Best fit" : ""}
                      </option>
                    );
                  })}
                </select>
                {reservationForm.tableId !== "any" && (() => {
                  const sel = tables.find((t) => t.id === reservationForm.tableId);
                  if (!sel) return null;
                  const best = isBestFit(sel, reservationForm.partySize);
                  const cap = sel.capacity ?? 4;
                  const tooSmall = cap < reservationForm.partySize;
                  if (best) {
                    return (
                      <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                        <Sparkles className="h-3 w-3" /> Perfect fit for {reservationForm.partySize} guests
                      </span>
                    );
                  }
                  if (tooSmall) {
                    return (
                      <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-rose-500">
                        ⚠ Table capacity ({cap}) is less than party size ({reservationForm.partySize})
                      </span>
                    );
                  }
                  return null;
                })()}
              </label>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-xs font-semibold text-slate-600">
                  Phone (optional)
                  <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <input
                      value={reservationForm.phone}
                      onChange={(e) => setReservationForm((p) => ({ ...p, phone: e.target.value }))}
                      className="w-full bg-transparent text-sm outline-none"
                      placeholder="+91 98xxxxxx"
                    />
                  </div>
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Notes (optional)
                  <input
                    value={reservationForm.notes}
                    onChange={(e) => setReservationForm((p) => ({ ...p, notes: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 outline-none"
                    placeholder="Anniversary seating"
                  />
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  disabled={isLoading}
                >
                  <ListPlus className="h-4 w-4" /> Add Reservation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Walk-in Modal */}
      {showWaitlistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <h3 className="text-base font-bold text-slate-900">Add to Walk-in Waitlist</h3>
              <button 
                onClick={() => setShowWaitlistModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all cursor-pointer"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={async (e) => { await addWaitlist(e); setShowWaitlistModal(false); }} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-xs font-semibold text-slate-600">
                  Guest Name
                  <input
                    value={waitlistForm.name}
                    onChange={(e) => setWaitlistForm((p) => ({ ...p, name: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 outline-none"
                    placeholder="Rahul Singh"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Party Size
                  <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                    <Users className="h-4 w-4 text-slate-400" />
                    <input
                      type="number"
                      min={1}
                      value={waitlistForm.partySize}
                      onChange={(e) =>
                        setWaitlistForm((p) => ({ ...p, partySize: Math.max(1, Number(e.target.value) || 1) }))
                      }
                      className="w-full bg-transparent text-sm outline-none"
                    />
                  </div>
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-xs font-semibold text-slate-600">
                  Phone (optional)
                  <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <input
                      value={waitlistForm.phone}
                      onChange={(e) => setWaitlistForm((p) => ({ ...p, phone: e.target.value }))}
                      className="w-full bg-transparent text-sm outline-none"
                      placeholder="+91 98xxxxxx"
                    />
                  </div>
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Quoted Wait (mins)
                  <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <input
                      type="number"
                      min={5}
                      value={waitlistForm.quotedMins}
                      onChange={(e) =>
                        setWaitlistForm((p) => ({ ...p, quotedMins: Math.max(5, Number(e.target.value) || 5) }))
                      }
                      className="w-full bg-transparent text-sm outline-none"
                    />
                  </div>
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition-colors cursor-pointer"
                  disabled={isLoading}
                >
                  <ListPlus className="h-4 w-4" /> Add to Waitlist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </SettingsPageLayout>
  );
}
