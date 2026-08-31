"use client";

import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  ArrowDown,
  ArrowUpRight,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  Clock,
  ListPlus,
  Minus,
  Phone,
  Plus,
  Sparkles,
  Users,
  XCircle,
  Zap,
  ChevronDown,
  Settings,
  AlertTriangle,
  QrCode,
} from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/app/lib/api";
import type { Table } from "@/app/components/settings/types";
import StaffSidebar from "@/app/components/StaffSidebar";
import { QRCodeSVG } from "qrcode.react";

const CustomSelect = ({ value, onChange, options, placeholder, className = "" }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt: any) => opt.value === value);

  return (
    <div className={`relative group w-full ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-12 pl-4 pr-10 text-sm font-semibold bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#fe5c13] focus:ring-4 focus:ring-[#fe5c13]/10 transition-all flex items-center justify-between hover:bg-slate-100/50 ${isOpen ? "border-[#fe5c13] bg-white ring-4 ring-[#fe5c13]/10" : ""}`}
      >
        <span className="truncate text-slate-700">{selectedOption ? selectedOption.label : placeholder}</span>
      </button>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
        <ArrowDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180 text-[#fe5c13]" : "group-hover:text-slate-600"}`} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden py-1.5 ring-1 ring-slate-900/5"
          >
            <div className="max-h-60 overflow-y-auto custom-scrollbar">
              {options.map((opt: any) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={opt.disabled}
                  onClick={() => {
                    if (opt.disabled) return;
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${
                    opt.disabled 
                      ? "opacity-50 cursor-not-allowed bg-slate-50/50 text-slate-400" 
                      : value === opt.value 
                        ? "text-[#fe5c13] font-bold bg-orange-50/50 hover:bg-orange-50" 
                        : "text-slate-600 font-medium hover:bg-slate-50"
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const PartySizeSelector = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => {
  return (
    <div className="flex items-center gap-2 mt-1 bg-slate-50 border border-slate-200 rounded-2xl p-1.5 w-full h-12 transition-all focus-within:border-[#fe5c13] focus-within:ring-4 focus-within:ring-[#fe5c13]/10">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        className="w-10 h-full flex items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm border border-slate-200 hover:bg-slate-50 hover:text-[#fe5c13] transition-colors cursor-pointer"
      >
        <Minus className="w-4 h-4" />
      </button>
      <div className="flex-1 flex items-center justify-center text-sm font-bold text-slate-800 gap-1.5">
        <Users className="w-4 h-4 text-slate-400" />
        {value} {value === 1 ? 'Guest' : 'Guests'}
      </div>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="w-10 h-full flex items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm border border-slate-200 hover:bg-slate-50 hover:text-[#fe5c13] transition-colors cursor-pointer"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
};

const DateSelector = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const dates = [];
  const today = new Date();
  for (let i = 0; i < 4; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    let label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    if (i === 0) label = "Today";
    if (i === 1) label = "Tomorrow";
    dates.push({ value: dateStr, label });
  }

  const isCustom = !dates.find(d => d.value === value) && value !== "";

  return (
    <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2 mt-1">
      {dates.map((d) => (
        <button
          key={d.value}
          type="button"
          onClick={() => onChange(d.value)}
          className={`flex-shrink-0 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            value === d.value
              ? "bg-slate-900 text-white shadow-sm"
              : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100/50"
          }`}
        >
          {d.label}
        </button>
      ))}
      <div className="relative flex-shrink-0">
        <input 
          type="date" 
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
        <button
          type="button"
          className={`flex h-full items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap border cursor-pointer ${
            isCustom
              ? "bg-slate-900 text-white border-slate-900 shadow-sm"
              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100/50"
          }`}
        >
          <Calendar className="w-3.5 h-3.5" /> 
          {isCustom ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : "Pick Date"}
        </button>
      </div>
    </div>
  );
};

const TimeSelector = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const times = useMemo(() => {
    const opts = [];
    for (let i = 11; i <= 23; i++) {
      const h = i.toString().padStart(2, '0');
      opts.push({ value: `${h}:00`, label: `${i > 12 ? i - 12 : i}:00 ${i >= 12 ? 'PM' : 'AM'}` });
      opts.push({ value: `${h}:30`, label: `${i > 12 ? i - 12 : i}:30 ${i >= 12 ? 'PM' : 'AM'}` });
    }
    return opts;
  }, []);

  return (
    <div className="mt-1">
      <CustomSelect 
        value={value} 
        onChange={onChange} 
        options={times} 
        placeholder="Select Time" 
      />
    </div>
  );
};

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [storeInfo, setStoreInfo] = useState<AdminMeResponse | null>(null);

  // Modals and Expands State
  const [showResModal, setShowResModal] = useState(false);
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [waitlistSlug, setWaitlistSlug] = useState<string | null>(null);
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
    if (isSubmitting) return;
    if (!reservationForm.name.trim()) { toast.error("Add guest name"); return; }
    if (!reservationForm.date || !reservationForm.time) { toast.error("Select date and time"); return; }

    const reservedAt = new Date(`${reservationForm.date}T${reservationForm.time}`);
    if (Number.isNaN(reservedAt.getTime())) { toast.error("Invalid date/time"); return; }

    setIsSubmitting(true);
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
      setShowResModal(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to create reservation");
    } finally {
      setIsSubmitting(false);
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

  const openQRModal = async () => {
    try {
      const data = await api<{ slug: string }>("/api/admin/waitlist/qr-slug");
      setWaitlistSlug(data.slug);
      setShowQRModal(true);
    } catch {
      toast.error("Failed to load waitlist QR");
    }
  };

  const addWaitlist = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    if (!waitlistForm.name.trim()) { toast.error("Add guest name"); return; }
    setIsSubmitting(true);
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
      setShowWaitlistModal(false);
    } catch {
      toast.error("Failed to add waitlist");
    } finally {
      setIsSubmitting(false);
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
    <div className="flex h-screen bg-[#F8F9FB] text-slate-900 overflow-hidden font-sans">
      <StaffSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between z-20 sticky top-0">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Reservations & Waitlist
            </h1>
            <p className="text-[13px] text-slate-500 mt-0.5">
              Reserve tables and keep a live queue for walk-ins.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => void openQRModal()}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <QrCode className="h-4 w-4" /> Waitlist QR
            </button>
            <button
              onClick={() => setShowResModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <CalendarCheck className="h-4 w-4" /> Book Reservation
            </button>
            <button
              onClick={() => setShowWaitlistModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#fe5c13] px-4 py-2 text-xs font-bold text-gray-900 hover:brightness-95 transition-colors cursor-pointer shadow-sm shadow-[#fe5c13]/30"
            >
              <Users className="h-4 w-4" /> Add Walk-in
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 h-full">
            
            {/* ── COLUMN 1: TABLE RESERVATIONS ──────────────────────────────────── */}
            <section className="flex flex-col h-full overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="h-5 w-5 text-indigo-500" />
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Upcoming Reservations</h2>
                    <p className="text-[11px] text-slate-500">Bookings scheduled for today.</p>
                  </div>
                </div>
              </div>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {isLoading ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">Loading reservations...</div>
            ) : activeReservations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 text-center transition-all">
                <p className="text-[14px] font-bold text-slate-700">No reservations scheduled</p>
                <p className="text-xs text-slate-500 mt-1">Click "Book Reservation" at the top to schedule.</p>
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
                  <div key={entry.id} className="group relative rounded-2xl border border-slate-200/60 bg-white p-3.5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
                    <div className="flex items-start gap-4">
                      {/* Left Side: Time */}
                      <div className="flex flex-col items-center justify-center min-w-[70px] rounded-xl bg-slate-50 border border-slate-100 p-2 text-center">
                        <span className="text-sm font-black text-[#fe5c13]">
                          {new Date(entry.reserved_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(' ', '')}
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                          {new Date(entry.reserved_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </div>

                      {/* Right Side: Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-bold text-slate-900 truncate">
                              {entry.guest_name}
                            </h4>
                            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                              <span className="flex items-center gap-1 font-semibold text-slate-600"><Users className="w-3.5 h-3.5 text-slate-400" /> {entry.party_size} guests</span>
                              <span className="text-slate-300">•</span>
                              <span className="font-medium text-slate-600">{entry.table_number ? `Table ${entry.table_number}` : "Any table"}</span>
                            </p>
                          </div>
                          
                          {/* Deposit Badge */}
                          {Number(entry.deposit_amount) > 0 ? (
                            <span className={`flex-shrink-0 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wider border ${
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

                    {isResAvailable && (
                      <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 border border-emerald-100 text-xs font-bold text-emerald-700">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
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
                      <div className="mt-3 flex flex-col gap-1 rounded-xl bg-slate-50 border border-slate-100 p-2.5">
                        {entry.phone && (
                          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
                            <Phone className="w-3.5 h-3.5 text-slate-400" /> {entry.phone}
                          </div>
                        )}
                        {entry.notes && (
                          <div className="flex items-start gap-1.5 text-[11px] font-medium text-slate-600">
                            <ListPlus className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" /> <span>{entry.notes}</span>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="mt-3.5 flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100/70">
                      <button
                        type="button"
                        onClick={() => updateReservationStatus(entry.id, "seated")}
                        className="flex-1 min-w-[80px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer"
                      >
                        <CheckCircle2 className="h-4 w-4" /> Seat Guest
                      </button>
                      <button
                        type="button"
                        onClick={() => updateReservationStatus(entry.id, "no_show")}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-50 border border-amber-200/50 px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100 transition-colors cursor-pointer"
                      >
                        No-show
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCancelReservation(entry)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                      >
                        <XCircle className="h-4 w-4" /> Cancel
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
                  </div>
                  </div>
                );
              })
            )}
            </div>
          </section>

          {/* ── COLUMN 2: LIVE WAITLIST QUEUE ──────────────────────────────────── */}
          <section className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-500" />
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Live Waitlist Queue</h2>
                  <p className="text-[11px] text-slate-500">Live guest wait times and best-fit availability.</p>
                </div>
              </div>
            </div>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {isLoading ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">Loading waitlist...</div>
            ) : activeWaitlist.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 text-center transition-all">
                <p className="text-[14px] font-bold text-slate-700">All guests seated</p>
                <p className="text-xs text-slate-500 mt-1">Waitlist is currently empty.</p>
              </div>
            ) : (
              activeWaitlist.map((entry) => {
                const isAutoSession = autoSession[entry.id] !== false;
                const availableTables = getAvailableTablesForParty(entry.party_size);
                const isAvailable = availableTables.length > 0;
                
                const timer = getWaitTimerInfo(entry.created_at, entry.quoted_minutes);
                const isExpanded = expandedWaitlistId === entry.id;

                return (
                  <div key={entry.id} className="group relative rounded-2xl border border-slate-200/60 bg-white p-3.5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
                    <div className="flex items-start gap-4">
                      {/* Left Side: Timer Box */}
                      <div className={`flex flex-col items-center justify-center min-w-[70px] rounded-xl border p-2 text-center ${timer.colorClass.replace('bg-', 'bg-').replace('text-', 'text-')}`}>
                        <span className="text-xl font-black leading-none">
                          {timer.elapsedMins}
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-wider mt-1 opacity-80">
                          Mins Wait
                        </span>
                      </div>

                      {/* Right Side: Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-bold text-slate-900 truncate flex items-center gap-2">
                              {entry.guest_name}
                              {entry.priority !== null && entry.priority !== undefined && (
                                <span className="text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md border border-slate-200/60">
                                  #{entry.priority}
                                </span>
                              )}
                            </h4>
                            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                              <span className="flex items-center gap-1 font-semibold text-slate-600"><Users className="w-3.5 h-3.5 text-slate-400" /> {entry.party_size} guests</span>
                              <span className="text-slate-300">•</span>
                              <span className="font-medium text-slate-600">Quoted {entry.quoted_minutes}m</span>
                            </p>
                          </div>
                        </div>

                    {/* Table availability alert */}
                    {isAvailable && (
                      <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 border border-emerald-100 text-xs font-bold text-emerald-700">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span>
                          Table ready:{" "}
                          <span className="font-black">
                            {availableTables.map((t) => `T${t.table_number}`).join(", ")}
                          </span>
                        </span>
                      </div>
                    )}

                    {/* Primary Actions Row */}
                    <div className="mt-3.5 flex items-center gap-2 pt-3 border-t border-slate-100/70">
                      <button
                        type="button"
                        onClick={() => seatWaitlistEntry(entry)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer"
                      >
                        <CheckCircle2 className="h-4 w-4" /> Seat Guest
                      </button>

                      <button
                        type="button"
                        onClick={() => setExpandedWaitlistId(isExpanded ? null : entry.id)}
                        className={`inline-flex items-center justify-center p-2 rounded-xl border transition-all cursor-pointer ${
                          isExpanded
                            ? "bg-slate-900 border-slate-900 text-white"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                        title="Advanced Seating Options"
                      >
                        <Settings className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Advanced Controls Dropdown Drawer */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-slate-100 animate-in slide-in-from-top-2 duration-200 flex flex-col gap-4">
                        {/* Table selector with best-fit badges */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 pl-1">
                            Assign Table
                          </label>
                          <CustomSelect
                            value={seatTable[entry.id] || "auto"}
                            onChange={(val: string) => setSeatTable((p) => ({ ...p, [entry.id]: val }))}
                            buttonClassName="!bg-slate-50 !border-slate-200 hover:!bg-slate-100 !h-11 !rounded-xl"
                            options={[
                              { value: "auto", label: "Auto-assign (best fit)" },
                              ...tableOptions.map((table) => {
                                const best = isBestFit(table, entry.party_size);
                                const cap = table.capacity ?? 4;
                                const tooSmall = cap < entry.party_size;
                                const label = `${best ? "★ " : tooSmall ? "✗ " : ""}Table ${table.table_number} (${cap} seats)${table.floor_name ? ` • ${table.floor_name}` : ""}${best ? " — Best fit" : tooSmall ? " — Too small" : ""}`;
                                return {
                                  value: table.id,
                                  label,
                                  disabled: tooSmall,
                                };
                              })
                            ]}
                          />
                        </div>

                        {/* Extra controls */}
                        <div className="grid grid-cols-2 gap-2.5">
                          {/* Auto-session toggle */}
                          <label className="col-span-2 flex cursor-pointer items-center justify-between rounded-xl border border-slate-200/60 bg-white p-2.5 hover:bg-slate-50 transition-colors shadow-sm">
                            <div className="flex items-center gap-2.5">
                              <div className={`p-1.5 rounded-md ${isAutoSession ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
                                <Zap className="h-3.5 w-3.5" />
                              </div>
                              <span className="text-xs font-bold text-slate-700">
                                Auto-start session
                              </span>
                            </div>
                            <div
                              className={`relative h-5 w-9 rounded-full transition-colors ${
                                isAutoSession ? "bg-emerald-500" : "bg-slate-300"
                              }`}
                              onClick={() => setAutoSession((p) => ({ ...p, [entry.id]: !isAutoSession }))}
                            >
                              <span
                                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                                  isAutoSession ? "translate-x-4" : "translate-x-0.5"
                                }`}
                              />
                            </div>
                          </label>

                          <button
                            type="button"
                            onClick={() => {
                              bumpWaitlistEntry(entry.id);
                              setExpandedWaitlistId(null);
                            }}
                            className="col-span-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm"
                          >
                            <ArrowUpRight className="h-4 w-4" /> Bump
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              removeWaitlistEntry(entry.id);
                              setExpandedWaitlistId(null);
                            }}
                            className="col-span-1 flex items-center justify-center gap-1.5 rounded-xl bg-rose-50 border border-rose-100 px-3 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition-all shadow-sm"
                          >
                            <XCircle className="h-4 w-4" /> Remove
                          </button>
                        </div>
                      </div>
                    )}
                    </div>
                  </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
        </div>
      </main>
    </div>


      {/* ── MODALS (Forms grouped off screen to save massive space) ──────────────────── */}

      {/* Book Reservation Modal */}
      {showResModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-xl border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">Book Table Reservation</h3>
              <button 
                onClick={() => setShowResModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all cursor-pointer"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            
            {storeInfo?.reservation_deposit_required && (
              <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200/50 p-4 text-sm text-amber-800 space-y-1">
                <p className="font-bold flex items-center gap-1.5"><AlertTriangle className="h-4 w-4 text-amber-600" /> Prepayment Deposit Required</p>
                <p>A secure reservation deposit of <strong>{storeInfo.currency || "Rs."}{storeInfo.reservation_deposit_amount}</strong> is required to secure this table booking.</p>
              </div>
            )}
            
            <form onSubmit={addReservation} className="mt-6 space-y-6">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-xs font-semibold text-slate-600">
                  Guest Name
                  <input
                    value={reservationForm.name}
                    onChange={(e) => setReservationForm((p) => ({ ...p, name: e.target.value }))}
                    className="mt-1 w-full h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold focus:bg-white focus:border-[#fe5c13] focus:ring-4 focus:ring-[#fe5c13]/10 outline-none transition-all"
                    placeholder="Aanya Sharma"
                  />
                </label>
                <div className="text-xs font-semibold text-slate-600">
                  Party Size
                  <PartySizeSelector
                    value={reservationForm.partySize}
                    onChange={(val) => setReservationForm(p => ({ ...p, partySize: val }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="text-xs font-semibold text-slate-600 col-span-1 md:col-span-2">
                  Date
                  <DateSelector
                    value={reservationForm.date}
                    onChange={(val) => setReservationForm(p => ({ ...p, date: val }))}
                  />
                </div>
                <div className="text-xs font-semibold text-slate-600">
                  Time
                  <TimeSelector
                    value={reservationForm.time}
                    onChange={(val) => setReservationForm(p => ({ ...p, time: val }))}
                  />
                </div>
                <div className="text-xs font-semibold text-slate-600">
                  Table Pre-assignment
                  <CustomSelect
                    className="mt-1"
                    value={reservationForm.tableId}
                    onChange={(val: string) => setReservationForm((p) => ({ ...p, tableId: val }))}
                    placeholder="Any table"
                    options={[
                      { value: "any", label: "Any table" },
                      ...tableOptions.map(table => {
                        const best = isBestFit(table, reservationForm.partySize);
                        const label = `${best ? "★ " : ""}Table ${table.table_number}${table.capacity ? ` (${table.capacity} seats)` : ""}${table.floor_name ? ` • ${table.floor_name}` : ""}${best ? " — Best fit" : ""}`;
                        return { value: table.id, label };
                      })
                    ]}
                  />
                  {reservationForm.tableId !== "any" && (() => {
                    const sel = tables.find((t) => t.id === reservationForm.tableId);
                    if (!sel) return null;
                    const best = isBestFit(sel, reservationForm.partySize);
                    if (best) {
                      return (
                        <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                          <Sparkles className="h-3 w-3" /> Perfect fit for {reservationForm.partySize} guests
                        </span>
                      );
                    }
                    const cap = sel.capacity ?? 4;
                    const tooSmall = cap < reservationForm.partySize;
                    if (tooSmall) {
                      return (
                        <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-rose-600">
                          <AlertTriangle className="h-3 w-3" /> Warning: Only seats {cap} guests
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-xs font-semibold text-slate-600">
                  Phone (optional)
                  <div className="mt-1 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 h-12 focus-within:bg-white focus-within:border-[#fe5c13] focus-within:ring-4 focus-within:ring-[#fe5c13]/10 transition-all">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <input
                      type="tel"
                      value={reservationForm.phone}
                      onChange={(e) => setReservationForm((p) => ({ ...p, phone: e.target.value }))}
                      className="w-full bg-transparent text-sm font-semibold outline-none"
                      placeholder="+91 98xxxxxxx"
                    />
                  </div>
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Notes (optional)
                  <input
                    value={reservationForm.notes}
                    onChange={(e) => setReservationForm((p) => ({ ...p, notes: e.target.value }))}
                    className="mt-1 w-full h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold focus:bg-white focus:border-[#fe5c13] focus:ring-4 focus:ring-[#fe5c13]/10 outline-none transition-all"
                    placeholder="Anniversary seating"
                  />
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  disabled={isSubmitting || isLoading}
                >
                  {isSubmitting ? (
                    <>
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Saving Reservation...
                    </>
                  ) : (
                    <>
                      <ListPlus className="h-4 w-4" /> Add Reservation
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Walk-in Modal */}
      {showWaitlistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-xl border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">Add to Walk-in Waitlist</h3>
              <button 
                onClick={() => setShowWaitlistModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all cursor-pointer"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={addWaitlist} className="mt-6 space-y-6">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-xs font-semibold text-slate-600">
                  Guest Name
                  <input
                    value={waitlistForm.name}
                    onChange={(e) => setWaitlistForm((p) => ({ ...p, name: e.target.value }))}
                    className="mt-1 w-full h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold focus:bg-white focus:border-[#fe5c13] focus:ring-4 focus:ring-[#fe5c13]/10 outline-none transition-all"
                    placeholder="Aanya Sharma"
                  />
                </label>
                <div className="text-xs font-semibold text-slate-600">
                  Party Size
                  <PartySizeSelector
                    value={waitlistForm.partySize}
                    onChange={(val) => setWaitlistForm(p => ({ ...p, partySize: val }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-xs font-semibold text-slate-600">
                  Phone (optional)
                  <div className="mt-1 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 h-12 focus-within:bg-white focus-within:border-[#fe5c13] focus-within:ring-4 focus-within:ring-[#fe5c13]/10 transition-all">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <input
                      type="tel"
                      value={waitlistForm.phone}
                      onChange={(e) => setWaitlistForm((p) => ({ ...p, phone: e.target.value }))}
                      className="w-full bg-transparent text-sm font-semibold outline-none"
                      placeholder="+91 98xxxxxxx"
                    />
                  </div>
                </label>
                <div className="text-xs font-semibold text-slate-600">
                  Quoted Wait Time
                  <CustomSelect
                    className="mt-1"
                    value={waitlistForm.quotedMins.toString()}
                    onChange={(val: string) => setWaitlistForm(p => ({ ...p, quotedMins: parseInt(val) }))}
                    options={[
                      { value: "10", label: "10 Minutes" },
                      { value: "15", label: "15 Minutes" },
                      { value: "20", label: "20 Minutes" },
                      { value: "30", label: "30 Minutes" },
                      { value: "45", label: "45 Minutes" },
                      { value: "60", label: "1 Hour" },
                    ]}
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition-colors cursor-pointer"
                  disabled={isSubmitting || isLoading}
                >
                  {isSubmitting ? (
                    <>
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Adding to Waitlist...
                    </>
                  ) : (
                    <>
                      <ListPlus className="h-4 w-4" /> Add to Waitlist
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Waitlist QR Modal ────────────────────────────────────────────────── */}
      {showQRModal && waitlistSlug && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-xs flex flex-col items-center gap-5">
            <div className="text-center">
              <p className="text-sm font-bold text-slate-900">Waitlist QR Code</p>
              <p className="text-xs text-slate-400 mt-0.5">Customers scan this to join the queue</p>
            </div>
            <div className="p-4 bg-white rounded-xl border-2 border-slate-100">
              <QRCodeSVG
                value={`${typeof window !== "undefined" ? window.location.origin : ""}/waitlist/${waitlistSlug}`}
                size={192}
                bgColor="#ffffff"
                fgColor="#0F1117"
                level="M"
              />
            </div>
            <p className="text-[10px] text-slate-400 text-center break-all">
              {typeof window !== "undefined" ? window.location.origin : ""}/waitlist/{waitlistSlug}
            </p>
            <div className="w-full flex flex-col gap-2">
              <button
                onClick={() => window.print()}
                className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
              >
                Print QR
              </button>
              <button
                onClick={() => setShowQRModal(false)}
                className="w-full rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
