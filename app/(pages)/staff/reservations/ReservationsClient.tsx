"use client";

import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
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
  Check,
} from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { api, requestManagerPin } from "@/app/lib/api";
import type { Table } from "@/app/components/settings/types";
import StaffSidebar from "@/app/components/StaffSidebar";

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
        className={`flex h-10 w-full items-center justify-between rounded-xl border bg-white pl-3.5 pr-10 text-[13px] font-medium text-[#0F1117] outline-none transition-colors ${isOpen ? "border-[#fe5c13]" : "border-[#E8E8E3] hover:border-[#D6D6CF]"}`}
      >
        <span className={`truncate ${selectedOption ? "text-[#0F1117]" : "text-[#9CA3AF]"}`}>{selectedOption ? selectedOption.label : placeholder}</span>
      </button>
      <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
        <ChevronDown className={`h-4 w-4 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-xl border border-[#E8E8E3] bg-white p-1.5 shadow-[0_18px_40px_-16px_rgba(15,17,23,0.3)]"
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
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-[13px] transition-colors ${
                    opt.disabled
                      ? "cursor-not-allowed text-[#C4C4BE]"
                      : value === opt.value
                        ? "bg-[#FAFAF7] font-semibold text-[#0F1117]"
                        : "text-[#374151] hover:bg-[#FAFAF7]"
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {value === opt.value && !opt.disabled && <Check className="h-4 w-4 shrink-0 text-[#fe5c13]" strokeWidth={2.5} />}
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

export default function ReservationsClient({ initialData }: { initialData?: any }) {
  const router = useRouter();

  const initialProcessed = useMemo(() => {
    if (!initialData) return null;
    const { tablesData, reservationsRes, waitlistRes, sessionsRes, meRes } = initialData;
    return {
      tables: Array.isArray(tablesData) ? tablesData : [],
      reservations: Array.isArray(reservationsRes?.reservations) ? reservationsRes.reservations : [],
      waitlist: Array.isArray(waitlistRes?.waitlist) ? waitlistRes.waitlist : [],
      sessions: Array.isArray(sessionsRes?.sessions) ? sessionsRes.sessions : [],
      storeInfo: meRes || null,
    };
  }, [initialData]);

  const [tables, setTables] = useState<Table[]>(initialProcessed?.tables || []);
  const [reservations, setReservations] = useState<ReservationEntry[]>(initialProcessed?.reservations || []);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>(initialProcessed?.waitlist || []);
  const [sessions, setSessions] = useState<ActiveSessionAPI[]>(initialProcessed?.sessions || []);
  const [isLoading, setIsLoading] = useState(!initialProcessed);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [storeInfo, setStoreInfo] = useState<AdminMeResponse | null>(initialProcessed?.storeInfo || null);


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
      setTables(Array.isArray(tablesData) ? tablesData : []);
      setReservations(Array.isArray(reservationsRes?.reservations) ? reservationsRes.reservations : []);
      setWaitlist(Array.isArray(waitlistRes?.waitlist) ? waitlistRes.waitlist : []);
      setSessions(Array.isArray(sessionsRes?.sessions) ? sessionsRes.sessions : []);
      setStoreInfo(meRes || null);
    } catch {
      //
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialProcessed) {
      loadData();
    }
    // 10-second data poll and current-time ticker
    const interval = setInterval(() => {
      setCurrentTime(new Date());
      if (!expandedWaitlistId && !showResModal && !showWaitlistModal && !isSubmitting) {
        loadData().catch(() => {});
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [initialProcessed, loadData, expandedWaitlistId, showResModal, showWaitlistModal, isSubmitting]);

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

  const openQRModal = () => {
    router.push("/staff/settings/qr-codes?table=waitlist");
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
    <div className="flex h-screen overflow-hidden bg-[#FAFAF7] text-[#0F1117]">
      <StaffSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-[#E8E8E3] bg-white px-8 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[22px] font-bold leading-none tracking-[-0.02em] text-[#0F1117]">
              Reservations and waitlist
            </h1>
            <span className="rounded-full bg-[#F3F3EF] px-2.5 py-1 text-[12px] font-medium leading-none tabular-nums text-[#6B7280]">
              {activeReservations.length} booked
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-[12px] font-medium leading-none tabular-nums ${activeWaitlist.length > 0 ? "bg-[#FFF4EC] text-[#C2410C]" : "bg-[#F3F3EF] text-[#6B7280]"}`}
            >
              {activeWaitlist.length} waiting
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={openQRModal}
              className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-[#E8E8E3] bg-white px-3.5 text-[13px] font-semibold text-[#0F1117] transition-colors hover:border-[#D6D6CF] hover:bg-[#FAFAF7]"
            >
              <QrCode className="h-4 w-4 text-[#6B7280]" /> Waitlist QR
            </button>
            <button
              onClick={() => setShowResModal(true)}
              className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-[#E8E8E3] bg-white px-3.5 text-[13px] font-semibold text-[#0F1117] transition-colors hover:border-[#D6D6CF] hover:bg-[#FAFAF7]"
            >
              <CalendarCheck className="h-4 w-4 text-[#6B7280]" /> Book reservation
            </button>
            <button
              onClick={() => setShowWaitlistModal(true)}
              className="ml-1 inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-[#fe5c13] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#e44e0b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fe5c13]/40 focus-visible:ring-offset-2"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} /> Add walk-in
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-hidden px-8 py-6">
          <div className="grid h-full grid-cols-1 gap-6 lg:grid-cols-2">
            {/* ── Reservations ── */}
            <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-[#E8E8E3] bg-white">
              <div className="flex items-baseline justify-between gap-3 border-b border-[#F0F0EB] px-5 py-4">
                <div>
                  <h2 className="text-[15px] font-semibold text-[#0F1117]">Upcoming reservations</h2>
                  <p className="mt-0.5 text-[12px] text-[#6B7280]">Bookings that haven&apos;t arrived yet.</p>
                </div>
                <span className="text-[13px] font-medium tabular-nums text-[#6B7280]">{activeReservations.length}</span>
              </div>

              <div className="custom-scrollbar flex-1 overflow-y-auto">
                {isLoading ? (
                  <p className="px-5 py-10 text-center text-[13px] text-[#6B7280]">Loading reservations…</p>
                ) : activeReservations.length === 0 ? (
                  <div className="flex flex-col items-center px-6 py-16 text-center">
                    <CalendarCheck className="h-6 w-6 text-[#C4C4BE]" />
                    <p className="mt-3 text-[14px] font-semibold text-[#0F1117]">No upcoming reservations</p>
                    <p className="mt-1 max-w-[240px] text-[13px] leading-relaxed text-[#6B7280]">
                      Book a table for a guest and it will show up here.
                    </p>
                    <button
                      onClick={() => setShowResModal(true)}
                      className="mt-5 inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-[#E8E8E3] bg-white px-3.5 text-[13px] font-semibold text-[#0F1117] transition-colors hover:border-[#D6D6CF] hover:bg-[#FAFAF7]"
                    >
                      <Plus className="h-4 w-4 text-[#6B7280]" /> Book reservation
                    </button>
                  </div>
                ) : (
                  <ul className="divide-y divide-[#F0F0EB]">
                    {activeReservations.map((entry) => {
                      let isResAvailable = false;
                      let resAvailableTables: Table[] = [];
                      if (entry.status === "booked") {
                        if (entry.table_id) {
                          const targetTable = tables.find((t) => t.id === entry.table_id);
                          if (targetTable) {
                            const hasSession = sessions.some((s) => s.table_id === targetTable.id);
                            const otherBlockingRes = reservations.some((res) => {
                              if (res.id === entry.id || res.status !== "booked" || res.table_id !== targetTable.id) return false;
                              const resTime = new Date(res.reserved_at);
                              const thisTime = new Date(entry.reserved_at);
                              const diffMs = Math.abs(resTime.getTime() - thisTime.getTime());
                              return diffMs < 120 * 60 * 1000;
                            });
                            isResAvailable = targetTable.is_enabled && !hasSession && !otherBlockingRes;
                            if (isResAvailable) resAvailableTables = [targetTable];
                          }
                        } else {
                          resAvailableTables = getAvailableTablesForParty(entry.party_size);
                          isResAvailable = resAvailableTables.length > 0;
                        }
                      }

                      const when = new Date(entry.reserved_at);
                      const today = new Date();
                      const tomorrow = new Date();
                      tomorrow.setDate(today.getDate() + 1);
                      const dayLabel =
                        when.toDateString() === today.toDateString()
                          ? "Today"
                          : when.toDateString() === tomorrow.toDateString()
                            ? "Tomorrow"
                            : when.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
                      const deposit = Number(entry.deposit_amount) || 0;
                      const currency = storeInfo?.currency || "₹";
                      const depositTone =
                        entry.deposit_status === "paid"
                          ? "bg-emerald-50 text-emerald-700"
                          : entry.deposit_status === "forfeited"
                            ? "bg-rose-50 text-rose-700"
                            : entry.deposit_status === "refunded"
                              ? "bg-[#F3F3EF] text-[#6B7280]"
                              : "bg-amber-50 text-amber-800";
                      const depositWord =
                        entry.deposit_status === "paid"
                          ? "paid"
                          : entry.deposit_status === "refunded"
                            ? "refunded"
                            : entry.deposit_status === "forfeited"
                              ? "forfeited"
                              : "due";

                      return (
                        <li key={entry.id} className="flex gap-4 px-5 py-4">
                          <div className="w-[68px] shrink-0 pt-0.5">
                            <p className="text-[15px] font-semibold leading-none tabular-nums text-[#0F1117]">
                              {when.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
                            </p>
                            <p className="mt-1.5 text-[12px] font-medium text-[#6B7280]">{dayLabel}</p>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-[14px] font-semibold text-[#0F1117]">{entry.guest_name}</p>
                                <p className="mt-0.5 text-[13px] text-[#6B7280]">
                                  {entry.party_size} {entry.party_size === 1 ? "guest" : "guests"},{" "}
                                  {entry.table_number ? `table ${entry.table_number}` : "any table"}
                                </p>
                              </div>
                              {deposit > 0 && (
                                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-medium leading-none tabular-nums ${depositTone}`}>
                                  {currency}
                                  {deposit.toLocaleString("en-IN")} deposit {depositWord}
                                </span>
                              )}
                            </div>

                            {isResAvailable && (
                              <p className="mt-2 flex items-center gap-1.5 text-[12px] font-medium text-emerald-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                {entry.table_id
                                  ? `Table ${entry.table_number} is free now`
                                  : `Free now: ${resAvailableTables.map((t) => `T${t.table_number}`).join(", ")}`}
                              </p>
                            )}

                            {(entry.phone || entry.notes) && (
                              <div className="mt-2 space-y-1 text-[12px] text-[#6B7280]">
                                {entry.phone && (
                                  <p className="flex items-center gap-1.5">
                                    <Phone className="h-3.5 w-3.5 text-[#9CA3AF]" /> {entry.phone}
                                  </p>
                                )}
                                {entry.notes && (
                                  <p className="flex items-start gap-1.5">
                                    <ListPlus className="mt-px h-3.5 w-3.5 shrink-0 text-[#9CA3AF]" /> <span>{entry.notes}</span>
                                  </p>
                                )}
                              </div>
                            )}

                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => updateReservationStatus(entry.id, "seated")}
                                className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-[#0F1117] px-3 text-[12px] font-semibold text-white transition-colors hover:bg-black"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" /> Seat guest
                              </button>
                              <button
                                type="button"
                                onClick={() => updateReservationStatus(entry.id, "no_show")}
                                className="inline-flex h-8 cursor-pointer items-center rounded-lg border border-[#E8E8E3] bg-white px-3 text-[12px] font-semibold text-[#374151] transition-colors hover:border-[#D6D6CF] hover:text-[#0F1117]"
                              >
                                No-show
                              </button>
                              {deposit > 0 && entry.deposit_status === "unpaid" && (
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
                                  className="inline-flex h-8 cursor-pointer items-center rounded-lg border border-[#E8E8E3] bg-white px-3 text-[12px] font-semibold text-[#374151] transition-colors hover:border-[#D6D6CF] hover:text-[#0F1117]"
                                >
                                  Record deposit
                                </button>
                              )}
                              {deposit > 0 && entry.deposit_status === "paid" && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!confirm("Are you sure you want to refund this deposit?")) return;
                                    const send = (pin?: string) =>
                                      api(`/api/admin/reservations/${entry.id}/refund-deposit`, {
                                        method: "POST",
                                        headers: pin ? { "X-Manager-Pin": pin } : {},
                                      });
                                    try {
                                      try {
                                        await send();
                                      } catch (err) {
                                        // Staff other than owners/managers need a manager PIN.
                                        if (!((err as Error)?.message || "").includes("MANAGER_PIN_REQUIRED")) throw err;
                                        const pin = await requestManagerPin();
                                        if (!pin) {
                                          toast.error("Manager PIN is required to refund a deposit");
                                          return;
                                        }
                                        await send(pin);
                                      }
                                      toast.success("Deposit refunded successfully");
                                      await loadData();
                                    } catch (err) {
                                      toast.error((err as Error)?.message || "Failed to refund deposit");
                                    }
                                  }}
                                  className="inline-flex h-8 cursor-pointer items-center rounded-lg border border-[#E8E8E3] bg-white px-3 text-[12px] font-semibold text-[#374151] transition-colors hover:border-[#D6D6CF] hover:text-[#0F1117]"
                                >
                                  Refund deposit
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleCancelReservation(entry)}
                                className="ml-auto inline-flex h-8 cursor-pointer items-center rounded-lg px-2.5 text-[12px] font-semibold text-[#6B7280] transition-colors hover:bg-rose-50 hover:text-rose-700"
                              >
                                Cancel booking
                              </button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>

            {/* ── Waitlist ── */}
            <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-[#E8E8E3] bg-white">
              <div className="flex items-baseline justify-between gap-3 border-b border-[#F0F0EB] px-5 py-4">
                <div>
                  <h2 className="text-[15px] font-semibold text-[#0F1117]">Waitlist</h2>
                  <p className="mt-0.5 text-[12px] text-[#6B7280]">Walk-ins in the order they&apos;ll be seated.</p>
                </div>
                <span className="text-[13px] font-medium tabular-nums text-[#6B7280]">{activeWaitlist.length}</span>
              </div>

              <div className="custom-scrollbar flex-1 overflow-y-auto">
                {isLoading ? (
                  <p className="px-5 py-10 text-center text-[13px] text-[#6B7280]">Loading waitlist…</p>
                ) : activeWaitlist.length === 0 ? (
                  <div className="flex flex-col items-center px-6 py-16 text-center">
                    <Users className="h-6 w-6 text-[#C4C4BE]" />
                    <p className="mt-3 text-[14px] font-semibold text-[#0F1117]">Nobody is waiting</p>
                    <p className="mt-1 max-w-[240px] text-[13px] leading-relaxed text-[#6B7280]">
                      Add walk-ins here when every table is taken.
                    </p>
                    <button
                      onClick={() => setShowWaitlistModal(true)}
                      className="mt-5 inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-[#E8E8E3] bg-white px-3.5 text-[13px] font-semibold text-[#0F1117] transition-colors hover:border-[#D6D6CF] hover:bg-[#FAFAF7]"
                    >
                      <Plus className="h-4 w-4 text-[#6B7280]" /> Add walk-in
                    </button>
                  </div>
                ) : (
                  <ol className="divide-y divide-[#F0F0EB]">
                    {activeWaitlist.map((entry, index) => {
                      const isAutoSession = autoSession[entry.id] !== false;
                      const availableTables = getAvailableTablesForParty(entry.party_size);
                      const isAvailable = availableTables.length > 0;
                      const timer = getWaitTimerInfo(entry.created_at, entry.quoted_minutes);
                      const isExpanded = expandedWaitlistId === entry.id;
                      const quoted = Math.max(1, entry.quoted_minutes || 0);
                      const ratio = Math.min(1, timer.elapsedMins / quoted);
                      const late = timer.isOverdue;
                      const warm = !late && timer.elapsedMins >= quoted * 0.5;
                      const barTone = late ? "bg-rose-500" : warm ? "bg-amber-500" : "bg-emerald-500";

                      return (
                        <li key={entry.id} className={`px-5 py-4 ${isExpanded ? "bg-[#FAFAF7]" : ""}`}>
                          <div className="flex gap-4">
                            <span
                              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F3F3EF] text-[12px] font-semibold tabular-nums text-[#4B5563]"
                              aria-label={`Position ${index + 1}`}
                            >
                              {index + 1}
                            </span>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-[14px] font-semibold text-[#0F1117]">{entry.guest_name}</p>
                                  <p className="mt-0.5 text-[13px] text-[#6B7280]">
                                    {entry.party_size} {entry.party_size === 1 ? "guest" : "guests"}
                                    {entry.phone ? `, ${entry.phone}` : ""}
                                  </p>
                                </div>
                                <div className="w-32 shrink-0 text-right">
                                  <p className={`text-[15px] font-semibold leading-none tabular-nums ${late ? "text-rose-700" : "text-[#0F1117]"}`}>
                                    {timer.elapsedMins} min
                                  </p>
                                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#F3F3EF]" aria-hidden>
                                    <div className={`h-full rounded-full ${barTone}`} style={{ width: `${Math.round(ratio * 100)}%` }} />
                                  </div>
                                  <p className={`mt-1.5 text-[12px] tabular-nums ${late ? "font-medium text-rose-700" : "text-[#6B7280]"}`}>
                                    {late ? `Overdue by ${timer.elapsedMins - entry.quoted_minutes} min` : `Quoted ${entry.quoted_minutes} min`}
                                  </p>
                                </div>
                              </div>

                              {isAvailable && (
                                <p className="mt-2 flex items-center gap-1.5 text-[12px] font-medium text-emerald-700">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                  Free now: {availableTables.map((t) => `T${t.table_number}`).join(", ")}
                                </p>
                              )}

                              <div className="mt-3 flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => seatWaitlistEntry(entry)}
                                  className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-[#0F1117] px-3 text-[12px] font-semibold text-white transition-colors hover:bg-black"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Seat guest
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setExpandedWaitlistId(isExpanded ? null : entry.id)}
                                  aria-expanded={isExpanded}
                                  className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-[12px] font-semibold transition-colors ${isExpanded
                                    ? "border-[#D6D6CF] bg-white text-[#0F1117]"
                                    : "border-[#E8E8E3] bg-white text-[#374151] hover:border-[#D6D6CF] hover:text-[#0F1117]"
                                    }`}
                                >
                                  Options
                                  <ChevronDown className={`h-3.5 w-3.5 text-[#9CA3AF] transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                </button>
                              </div>

                              {isExpanded && (
                                <div className="mt-4 space-y-3 rounded-xl border border-[#E8E8E3] bg-white p-4">
                                  <div>
                                    <span className="mb-1.5 block text-[12px] font-medium text-[#6B7280]">Seat at</span>
                                    <CustomSelect
                                      value={seatTable[entry.id] || "auto"}
                                      onChange={(val: string) => setSeatTable((p) => ({ ...p, [entry.id]: val }))}
                                      options={[
                                        { value: "auto", label: "Best available table" },
                                        ...tableOptions.map((table) => {
                                          const best = isBestFit(table, entry.party_size);
                                          const cap = table.capacity ?? 4;
                                          const tooSmall = cap < entry.party_size;
                                          const label = `Table ${table.table_number}, ${cap} seats${table.floor_name ? `, ${table.floor_name}` : ""}${best ? " (best fit)" : tooSmall ? " (too small)" : ""}`;
                                          return { value: table.id, label, disabled: tooSmall };
                                        }),
                                      ]}
                                    />
                                  </div>

                                  <label className="flex cursor-pointer items-center justify-between gap-3 py-1">
                                    <span>
                                      <span className="block text-[13px] font-medium text-[#0F1117]">Start a table session</span>
                                      <span className="block text-[12px] text-[#6B7280]">Opens ordering for the table as soon as they sit.</span>
                                    </span>
                                    <button
                                      type="button"
                                      role="switch"
                                      aria-checked={isAutoSession}
                                      onClick={() => setAutoSession((p) => ({ ...p, [entry.id]: !isAutoSession }))}
                                      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${isAutoSession ? "bg-emerald-500" : "bg-[#D6D6CF]"}`}
                                    >
                                      <span
                                        className={`absolute left-0 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${isAutoSession ? "translate-x-[18px]" : "translate-x-0.5"}`}
                                      />
                                    </button>
                                  </label>

                                  <div className="flex gap-2 border-t border-[#F0F0EB] pt-3">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        bumpWaitlistEntry(entry.id);
                                        setExpandedWaitlistId(null);
                                      }}
                                      className="inline-flex h-8 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[#E8E8E3] bg-white text-[12px] font-semibold text-[#374151] transition-colors hover:border-[#D6D6CF] hover:text-[#0F1117]"
                                    >
                                      <ArrowUpRight className="h-3.5 w-3.5 text-[#9CA3AF]" /> Move to front
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        removeWaitlistEntry(entry.id);
                                        setExpandedWaitlistId(null);
                                      }}
                                      className="inline-flex h-8 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[#E8E8E3] bg-white text-[12px] font-semibold text-rose-700 transition-colors hover:border-rose-200 hover:bg-rose-50"
                                    >
                                      <XCircle className="h-3.5 w-3.5" /> Remove
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
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

    </div>
  );
}
