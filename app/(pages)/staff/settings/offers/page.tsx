"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { Calendar, Check, ChevronDown, ChevronLeft, ChevronRight, Clock, Loader2, Plus, Search, TicketPercent, Trash2, X } from "lucide-react";
import ConfirmModal from "@/app/components/ui/ConfirmModal";
import toast from "react-hot-toast";
import SettingsPageLayout from "@/app/components/settings/SettingsPageLayout";
import { api } from "@/app/lib/api";

import { Select } from "@/app/components/ui/Select";
type MenuItem = { id: string; name: string; categoryName?: string };
type OfferItem = { menu_item_id: string; menu_item_name?: string; item_discount_kind?: "percent" | "fixed" | "fixed_price"; item_discount_value?: number };
type OfferCampaign = { id: string; name: string; scope: "full_menu" | "selected_items"; discount_kind: "percent" | "fixed" | "fixed_price"; discount_value: number; requires_coupon: boolean; coupon_code?: string; is_active: boolean; starts_at?: string; ends_at?: string; max_redemptions?: number; items?: OfferItem[] };

const CustomDateTimePicker = ({
  value,
  onChange,
  label,
  placeholder = "Select Date & Time",
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  placeholder?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedHour, setSelectedHour] = useState(12);
  const [selectedMinute, setSelectedMinute] = useState(0);

  const parseLocalDate = (isoStr: string) => {
    if (!isoStr) return new Date();
    const d = new Date(isoStr);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  };

  const initialDate = value ? parseLocalDate(value) : new Date();
  const [viewDate, setViewDate] = useState(initialDate);

  useEffect(() => {
    if (value) {
      const d = parseLocalDate(value);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      setSelectedDate(`${year}-${month}-${day}`);
      setSelectedHour(d.getHours());
      setSelectedMinute(d.getMinutes());
      setViewDate(d);
    } else {
      setSelectedDate("");
      setSelectedHour(12);
      setSelectedMinute(0);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    setViewDate(new Date(year, month + 1, 1));
  };

  const triggerChange = (dateStr: string, hr: number, min: number) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    const localD = new Date(y, m - 1, d, hr, min);
    onChange(localD.toISOString());
  };

  const handleSelectDay = (e: React.MouseEvent, day: number, type: 'prev' | 'curr' | 'next') => {
    e.preventDefault();
    let selectedYear = year;
    let selectedMonth = month;
    if (type === 'prev') {
      selectedMonth = month - 1;
      if (selectedMonth < 0) {
        selectedMonth = 11;
        selectedYear = year - 1;
      }
    } else if (type === 'next') {
      selectedMonth = month + 1;
      if (selectedMonth > 11) {
        selectedMonth = 0;
        selectedYear = year + 1;
      }
    }

    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${selectedYear}-${pad(selectedMonth + 1)}-${pad(day)}`;
    setSelectedDate(dateStr);
    triggerChange(dateStr, selectedHour, selectedMinute);
  };

  const cells: { day: number; type: 'prev' | 'curr' | 'next'; isSelected: boolean; isToday: boolean }[] = [];

  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    cells.push({ day: d, type: 'prev', isSelected: false, isToday: false });
  }

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  for (let d = 1; d <= daysInMonth; d++) {
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`;
    cells.push({
      day: d,
      type: 'curr',
      isSelected: selectedDate === dateStr,
      isToday: todayStr === dateStr,
    });
  }

  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, type: 'next', isSelected: false, isToday: false });
  }

  const monthsList = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const formatDisplayDateTime = (val?: string) => {
    if (!val) return placeholder;
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return placeholder;
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="relative min-w-[180px] flex-1" ref={containerRef}>
      <label className="mb-1.5 block text-[13px] font-medium text-[#4B5563]">
        {label}
      </label>

      <div
        onClick={() => setIsOpen(!isOpen)}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setIsOpen(!isOpen); } }}
        className={`flex h-10 cursor-pointer select-none items-center justify-between rounded-xl border bg-white px-3.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fe5c13]/40 ${isOpen ? "border-[#fe5c13]" : "border-[#E8E8E3] hover:border-[#D6D6CF]"}`}
      >
        <div className="flex items-center gap-2.5">
          <Calendar className="h-4 w-4 text-[#9CA3AF]" />
          <span className={`text-[14px] tabular-nums ${value ? 'text-[#0F1117]' : 'text-[#9CA3AF]'}`}>
            {formatDisplayDateTime(value)}
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 text-[#9CA3AF] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-[288px] rounded-2xl border border-[#E8E8E3] bg-white p-4 shadow-[0_16px_40px_-12px_rgba(15,17,23,0.25)]">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[14px] font-semibold text-[#0F1117]">
              {monthsList[month]} {year}
            </span>
            <div className="flex gap-1">
              <button onClick={handlePrevMonth} aria-label="Previous month" className="flex h-7 w-7 items-center justify-center rounded-lg text-[#6B7280] transition-colors hover:bg-[#F3F3EF] hover:text-[#0F1117]">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={handleNextMonth} aria-label="Next month" className="flex h-7 w-7 items-center justify-center rounded-lg text-[#6B7280] transition-colors hover:bg-[#F3F3EF] hover:text-[#0F1117]">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-[#9CA3AF]">
            <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, idx) => (
              <button
                key={idx}
                onClick={(e) => handleSelectDay(e, cell.day, cell.type)}
                className={`relative mx-auto flex h-8 w-8 items-center justify-center rounded-lg text-[13px] tabular-nums transition-colors ${
                  cell.type !== 'curr' ? 'text-[#C4C4BE] hover:bg-[#F3F3EF]'
                  : cell.isSelected ? 'bg-[#fe5c13] font-semibold text-white'
                  : cell.isToday ? 'font-semibold text-[#0F1117] ring-1 ring-inset ring-[#D6D6CF] hover:bg-[#F3F3EF]'
                  : 'text-[#374151] hover:bg-[#F3F3EF]'
                }`}
              >
                {cell.day}
              </button>
            ))}
          </div>

          {/* Time Picker controls */}
          <div className="mt-3 flex flex-col gap-2 border-t border-[#F0F0EB] pt-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[12px] font-medium text-[#6B7280]">
                <Clock className="w-3.5 h-3.5" /> Time
              </span>
              {value && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    onChange("");
                    setIsOpen(false);
                  }}
                  className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] font-medium text-[#6B7280] transition-colors hover:bg-rose-50 hover:text-rose-600"
                >
                  <X className="h-3 w-3" /> Clear
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Select
                  value={selectedHour}
                  onChange={(e) => {
                    const hr = Number(e.target.value);
                    setSelectedHour(hr);
                    if (selectedDate) triggerChange(selectedDate, hr, selectedMinute);
                  }}
                  className="h-9 w-full rounded-lg border border-[#E8E8E3] bg-white px-2.5 text-[13px] tabular-nums text-[#0F1117]"
                >
                  {Array.from({ length: 24 }).map((_, i) => (
                    <option key={i} value={i}>
                      {String(i).padStart(2, "0")} h
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex-1 relative">
                <Select
                  value={selectedMinute}
                  onChange={(e) => {
                    const min = Number(e.target.value);
                    setSelectedMinute(min);
                    if (selectedDate) triggerChange(selectedDate, selectedHour, min);
                  }}
                  className="h-9 w-full rounded-lg border border-[#E8E8E3] bg-white px-2.5 text-[13px] tabular-nums text-[#0F1117]"
                >
                  {Array.from({ length: 12 }).map((_, i) => {
                    const val = i * 5;
                    return (
                      <option key={val} value={val}>
                        {String(val).padStart(2, "0")} min
                      </option>
                    );
                  })}
                </Select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

type Status = "running" | "scheduled" | "ended" | "paused";
const STATUS_META: Record<Status, { label: string; pill: string; dot: string }> = {
  running: { label: "Running", pill: "border-emerald-200/70 bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  scheduled: { label: "Scheduled", pill: "border-sky-200/70 bg-sky-50 text-sky-700", dot: "bg-sky-500" },
  paused: { label: "Paused", pill: "border-amber-200/70 bg-amber-50 text-amber-800", dot: "bg-amber-500" },
  ended: { label: "Ended", pill: "border-[#E8E8E3] bg-[#F3F3EF] text-[#4B5563]", dot: "bg-[#9CA3AF]" },
};
const statusOf = (o: OfferCampaign): Status => {
  const now = Date.now();
  if (!o.is_active) return "paused";
  if (o.starts_at && new Date(o.starts_at).getTime() > now) return "scheduled";
  if (o.ends_at && new Date(o.ends_at).getTime() < now) return "ended";
  return "running";
};
const fmtWhen = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "";
const inr = (n: number) => `₹${Number(n).toLocaleString("en-IN")}`;
const discountText = (kind: OfferCampaign["discount_kind"], value: number) =>
  kind === "percent" ? `${value}% off` : kind === "fixed" ? `${inr(value)} off` : `Special price ${inr(value)}`;

const INPUT =
  "h-10 w-full rounded-xl border border-[#E8E8E3] bg-white px-3.5 text-[14px] text-[#0F1117] outline-none transition-colors placeholder:text-[#9CA3AF] hover:border-[#D6D6CF] focus:border-[#fe5c13]";
const LABEL = "mb-1.5 block text-[13px] font-medium text-[#4B5563]";
const SEG_ON = "bg-white font-semibold text-[#0F1117] shadow-[0_1px_2px_rgba(15,17,23,0.06)]";
const SEG_OFF = "font-medium text-[#6B7280] hover:text-[#0F1117]";

function Switch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fe5c13]/40 focus-visible:ring-offset-2 ${checked ? "bg-[#fe5c13]" : "bg-[#D6D6CF]"}`}
    >
      <span className={`absolute left-0.5 h-4 w-4 rounded-full bg-white shadow-[0_1px_2px_rgba(15,17,23,0.2)] transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`} />
    </button>
  );
}

export default function OffersSettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [offers, setOffers] = useState<OfferCampaign[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [name, setName] = useState("");
  const [scope, setScope] = useState<"full_menu" | "selected_items">("full_menu");
  const [discountKind, setDiscountKind] = useState<"percent" | "fixed" | "fixed_price">("percent");
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [requiresCoupon, setRequiresCoupon] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState<string>("");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [itemPriceMap, setItemPriceMap] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [pendingDelete, setPendingDelete] = useState<OfferCampaign | null>(null);

  const load = async () => {
    setIsLoading(true);
    try {
      const [offerRes, menuRes] = await Promise.all([
        api<{ offers?: OfferCampaign[] }>("/api/admin/offers?include_inactive=1", { method: "GET" }),
        api<any[]>("/api/admin/menu", { method: "GET" })
      ]);
      setOffers(offerRes?.offers || []);
      setMenuItems((menuRes || []).map((m) => ({
        id: String(m.id),
        name: String(m.name || ""),
        categoryName: String(m.categoryName || "")
      })));
    } catch {
      toast.error("Failed to load offers");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredMenu = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return menuItems;
    return menuItems.filter((m) =>
      m.name.toLowerCase().includes(q) ||
      (m.categoryName || "").toLowerCase().includes(q)
    );
  }, [menuItems, query]);

  const resetForm = () => {
    setName("");
    setScope("full_menu");
    setDiscountKind("percent");
    setDiscountValue(10);
    setRequiresCoupon(false);
    setCouponCode("");
    setStartsAt("");
    setEndsAt("");
    setMaxRedemptions("");
    setSelectedItems([]);
    setItemPriceMap({});
  };

  const buildPayload = () => ({
    name: name.trim(),
    scope,
    discount_kind: discountKind,
    discount_value: Number(discountValue || 0),
    requires_coupon: requiresCoupon,
    coupon_code: requiresCoupon ? couponCode.trim().toUpperCase() : "",
    is_active: true,
    starts_at: startsAt ? new Date(startsAt).toISOString() : "",
    ends_at: endsAt ? new Date(endsAt).toISOString() : "",
    max_redemptions: maxRedemptions ? Number(maxRedemptions) : null,
    items: scope === "selected_items"
      ? selectedItems.map((id) => {
          const val = Number(itemPriceMap[id] || "0");
          return val > 0 ? { menu_item_id: id, item_discount_kind: "fixed_price", item_discount_value: val } : { menu_item_id: id };
        })
      : [],
  });

  const handleCreate = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await api("/api/admin/offers", { method: "POST", body: JSON.stringify(buildPayload()) });
      toast.success("Offer created");
      resetForm();
      setShowForm(false);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to create offer");
    } finally {
      setIsSaving(false);
    }
  };

  const updateOffer = async (offer: OfferCampaign, patch: Partial<OfferCampaign>) => {
    const next = { ...offer, ...patch };
    await api(`/api/admin/offers/${offer.id}`, {
      method: "PUT",
      body: JSON.stringify({
        name: next.name,
        scope: next.scope,
        discount_kind: next.discount_kind,
        discount_value: next.discount_value,
        requires_coupon: next.requires_coupon,
        coupon_code: next.coupon_code || "",
        is_active: next.is_active,
        starts_at: next.starts_at || "",
        ends_at: next.ends_at || "",
        max_redemptions: typeof next.max_redemptions === "number" ? next.max_redemptions : null,
        items: (next.items || []).map((i) => ({
          menu_item_id: i.menu_item_id,
          item_discount_kind: i.item_discount_kind,
          item_discount_value: i.item_discount_value
        }))
      })
    });
  };

  const handleToggleActive = async (offer: OfferCampaign) => {
    try {
      await updateOffer(offer, { is_active: !offer.is_active });
      setOffers((prev) => prev.map((o) => (o.id === offer.id ? { ...o, is_active: !o.is_active } : o)));
      toast.success(offer.is_active ? "Offer paused" : "Offer turned on");
    } catch {
      toast.error("Couldn't update the offer");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api(`/api/admin/offers/${id}`, { method: "DELETE" });
      setOffers((prev) => prev.filter((o) => o.id !== id));
      toast.success("Offer deleted");
    } catch {
      toast.error("Failed to delete offer");
    }
  };

  const counts = useMemo(() => {
    const c: Record<Status, number> = { running: 0, scheduled: 0, paused: 0, ended: 0 };
    offers.forEach((o) => (c[statusOf(o)] += 1));
    return c;
  }, [offers]);
  const shown = filter === "all" ? offers : offers.filter((o) => statusOf(o) === filter);

  const valueAddon = discountKind === "percent" ? { side: "right", text: "%" } : { side: "left", text: "₹" };
  const valueLabel = discountKind === "percent" ? "Discount" : discountKind === "fixed" ? "Amount off" : "Special price";
  const codeMissing = requiresCoupon && !couponCode.trim();
  const itemsMissing = scope === "selected_items" && selectedItems.length === 0;
  const canCreate = !!name.trim() && !codeMissing && !itemsMissing && !isSaving;

  const scheduleText = (s?: string, e?: string) =>
    s && e ? `${fmtWhen(s)} to ${fmtWhen(e)}` : s ? `From ${fmtWhen(s)}` : e ? `Until ${fmtWhen(e)}` : "No end date";

  const closeForm = () => {
    setShowForm(false);
    resetForm();
    setQuery("");
  };

  return (
    <SettingsPageLayout
      title="Offers and coupons"
      description="Discounts on the whole menu or on chosen dishes, with or without a coupon code"
      maxWidth="max-w-5xl"
      action={
        <button
          type="button"
          onClick={() => { resetForm(); setShowForm(true); }}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#fe5c13] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#e44e0b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fe5c13]/40 focus-visible:ring-offset-2"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} /> New offer
        </button>
      }
    >
      {isLoading ? (
        <div className="grid animate-pulse grid-cols-1 gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 rounded-2xl border border-[#E8E8E3] bg-white" />
          ))}
        </div>
      ) : offers.length === 0 ? (
        <section className="flex flex-col items-center justify-center rounded-2xl border border-[#E8E8E3] bg-white px-6 py-20 text-center">
          <TicketPercent className="h-6 w-6 text-[#C4C4BE]" />
          <p className="mt-3 text-[15px] font-semibold text-[#0F1117]">No offers yet</p>
          <p className="mt-1 max-w-sm text-[13px] text-[#6B7280]">
            Run a happy hour, a festival deal or a coupon for regulars. Offers apply on their own, or when a guest enters the code.
          </p>
          <button
            type="button"
            onClick={() => { resetForm(); setShowForm(true); }}
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-[#fe5c13] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#e44e0b]"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} /> Create your first offer
          </button>
        </section>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex h-9 items-center gap-0.5 overflow-x-auto rounded-xl bg-[#F3F3EF] p-1" role="tablist" aria-label="Filter offers">
              {(["all", "running", "scheduled", "paused", "ended"] as const).map((id) => {
                const n = id === "all" ? offers.length : counts[id];
                if (id !== "all" && n === 0) return null;
                const on = filter === id;
                return (
                  <button
                    key={id}
                    role="tab"
                    aria-selected={on}
                    onClick={() => setFilter(id)}
                    className={`flex h-7 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[12px] transition-colors ${on ? SEG_ON : SEG_OFF}`}
                  >
                    {id === "all" ? "All" : STATUS_META[id].label}
                    <span className={`tabular-nums ${on ? "text-[#6B7280]" : "text-[#9CA3AF]"}`}>{n}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[12px] text-[#9CA3AF]">Turn an offer off to pause it without deleting it.</p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {shown.map((offer) => {
              const st = statusOf(offer);
              const meta = STATUS_META[st];
              return (
                <article key={offer.id} className={`flex flex-col rounded-2xl border border-[#E8E8E3] bg-white ${st === "ended" || st === "paused" ? "opacity-90" : ""}`}>
                  <div className="flex items-start justify-between gap-3 px-5 pt-5">
                    <div className="min-w-0">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[12px] font-medium ${meta.pill}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                        {meta.label}
                      </span>
                      <h3 className="mt-2.5 truncate text-[15px] font-semibold text-[#0F1117]">{offer.name}</h3>
                    </div>
                    <button
                      onClick={() => setPendingDelete(offer)}
                      className="-mr-1.5 -mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#9CA3AF] transition-colors hover:bg-rose-50 hover:text-rose-600"
                      aria-label={`Delete ${offer.name}`}
                      title="Delete offer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="px-5 pb-4 pt-1">
                    <p className="text-[22px] font-bold tabular-nums tracking-[-0.02em] text-[#0F1117]">
                      {discountText(offer.discount_kind, offer.discount_value)}
                    </p>
                    <p className="mt-0.5 text-[13px] text-[#6B7280]">
                      on {offer.scope === "full_menu" ? "the whole menu" : `${offer.items?.length || 0} ${(offer.items?.length || 0) === 1 ? "dish" : "dishes"}`}
                      {offer.max_redemptions ? `, up to ${offer.max_redemptions} uses` : ""}
                    </p>
                    <div className="mt-3">
                      {offer.requires_coupon && offer.coupon_code ? (
                        <span className="inline-flex items-center gap-2 rounded-lg border border-dashed border-[#D6D6CF] bg-[#FAFAF7] px-2.5 py-1 text-[12px] text-[#6B7280]">
                          Code <span className="font-semibold tracking-wider text-[#0F1117]">{offer.coupon_code}</span>
                        </span>
                      ) : (
                        <span className="text-[12px] text-[#6B7280]">Applied automatically, no code needed</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-[#F0F0EB] px-5 py-3">
                    <span className="flex min-w-0 items-center gap-1.5 text-[12px] tabular-nums text-[#6B7280]">
                      <Calendar className="h-3.5 w-3.5 shrink-0 text-[#9CA3AF]" />
                      <span className="truncate">{scheduleText(offer.starts_at, offer.ends_at)}</span>
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`text-[12px] font-medium ${offer.is_active ? "text-[#0F1117]" : "text-[#9CA3AF]"}`}>{offer.is_active ? "On" : "Off"}</span>
                      <Switch checked={offer.is_active} onChange={() => handleToggleActive(offer)} label={`${offer.name} on`} />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      {/* New offer */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F1117]/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="New offer">
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#E8E8E3] bg-white shadow-[0_24px_60px_-20px_rgba(15,17,23,0.35)]">
            <div className="flex items-start justify-between gap-4 border-b border-[#F0F0EB] px-6 py-5">
              <div>
                <h3 className="text-[17px] font-bold text-[#0F1117]">New offer</h3>
                <p className="mt-1 text-[13px] text-[#6B7280]">Set the discount, where it applies and when it runs.</p>
              </div>
              <button type="button" onClick={closeForm} aria-label="Close" className="-mr-2 -mt-1 inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#9CA3AF] transition-colors hover:bg-[#F3F3EF] hover:text-[#0F1117]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto md:grid-cols-[minmax(0,1fr)_260px] md:overflow-hidden">
              <div className="space-y-6 px-6 py-5 md:overflow-y-auto">
                <div>
                  <label htmlFor="of-name" className={LABEL}>Offer name</label>
                  <input id="of-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Happy hours, Diwali special" className={INPUT} />
                </div>

                <div>
                  <p className={LABEL}>Discount</p>
                  <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Discount type">
                    {([
                      ["percent", "Percent off", "e.g. 10% off"],
                      ["fixed", "Amount off", "e.g. ₹50 off"],
                      ["fixed_price", "Special price", "e.g. now ₹199"],
                    ] as const).map(([k, t, d]) => {
                      const on = discountKind === k;
                      return (
                        <button
                          key={k}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() => setDiscountKind(k)}
                          className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${on ? "border-[#fe5c13] bg-[#FFF4EC]" : "border-[#E8E8E3] bg-white hover:border-[#D6D6CF]"}`}
                        >
                          <span className="block text-[13px] font-semibold text-[#0F1117]">{t}</span>
                          <span className="block text-[12px] text-[#6B7280]">{d}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 w-44">
                    <label htmlFor="of-val" className="sr-only">{valueLabel}</label>
                    <div className="flex h-10 overflow-hidden rounded-xl border border-[#E8E8E3] bg-white transition-colors hover:border-[#D6D6CF] focus-within:border-[#fe5c13]">
                      {valueAddon.side === "left" && <span className="flex items-center border-r border-[#E8E8E3] bg-[#F3F3EF] px-3 text-[13px] font-medium text-[#6B7280]">{valueAddon.text}</span>}
                      <input
                        id="of-val"
                        type="number"
                        min={0}
                        step="0.01"
                        inputMode="decimal"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(Number(e.target.value || 0))}
                        className="w-full min-w-0 bg-transparent px-3 text-[15px] font-semibold tabular-nums text-[#0F1117] outline-none"
                      />
                      {valueAddon.side === "right" && <span className="flex items-center border-l border-[#E8E8E3] bg-[#F3F3EF] px-3 text-[13px] font-medium text-[#6B7280]">{valueAddon.text}</span>}
                    </div>
                  </div>
                </div>

                <div>
                  <p className={LABEL}>Applies to</p>
                  <div className="inline-flex h-10 items-center gap-0.5 rounded-xl bg-[#F3F3EF] p-1" role="radiogroup" aria-label="Applies to">
                    {([["full_menu", "Whole menu"], ["selected_items", "Chosen dishes"]] as const).map(([k, t]) => (
                      <button key={k} type="button" role="radio" aria-checked={scope === k} onClick={() => setScope(k)} className={`flex h-8 items-center rounded-lg px-3.5 text-[13px] transition-colors ${scope === k ? SEG_ON : SEG_OFF}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                  {scope === "selected_items" && (
                    <div className="mt-3 overflow-hidden rounded-xl border border-[#E8E8E3]">
                      <div className="flex items-center justify-between gap-3 border-b border-[#F0F0EB] bg-[#FAFAF7] px-3 py-2">
                        <div className="relative flex-1">
                          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9CA3AF]" />
                          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search dishes" aria-label="Search dishes" className="h-8 w-full rounded-lg border border-[#E8E8E3] bg-white pl-8 pr-2 text-[13px] text-[#0F1117] outline-none placeholder:text-[#9CA3AF] focus:border-[#fe5c13]" />
                        </div>
                        <span className="shrink-0 text-[12px] tabular-nums text-[#6B7280]">{selectedItems.length} chosen</span>
                      </div>
                      <div className="max-h-56 divide-y divide-[#F0F0EB] overflow-y-auto">
                        {filteredMenu.length === 0 && <p className="px-3 py-6 text-center text-[13px] text-[#9CA3AF]">No dishes match.</p>}
                        {filteredMenu.map((m) => {
                          const checked = selectedItems.includes(m.id);
                          return (
                            <div key={m.id} className={`flex items-center justify-between gap-3 px-3 py-2 ${checked ? "bg-[#FFFAF6]" : ""}`}>
                              <label className="flex min-w-0 cursor-pointer select-none items-center gap-2.5">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => setSelectedItems((prev) => (e.target.checked ? [...prev, m.id] : prev.filter((id) => id !== m.id)))}
                                  className="h-4 w-4 rounded"
                                />
                                <span className="truncate text-[13px] font-medium text-[#0F1117]">{m.name}</span>
                                {m.categoryName && <span className="shrink-0 text-[12px] text-[#9CA3AF]">{m.categoryName}</span>}
                              </label>
                              {checked && (
                                <div className="flex h-8 w-32 shrink-0 overflow-hidden rounded-lg border border-[#E8E8E3] bg-white focus-within:border-[#fe5c13]">
                                  <span className="flex items-center border-r border-[#E8E8E3] bg-[#F3F3EF] px-2 text-[12px] text-[#6B7280]">₹</span>
                                  <input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={itemPriceMap[m.id] || ""}
                                    onChange={(e) => setItemPriceMap((prev) => ({ ...prev, [m.id]: e.target.value }))}
                                    aria-label={`Special price for ${m.name}`}
                                    placeholder="Own price"
                                    className="w-full min-w-0 bg-transparent px-2 text-[12px] tabular-nums text-[#0F1117] outline-none placeholder:text-[#9CA3AF]"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <p className="border-t border-[#F0F0EB] bg-[#FAFAF7] px-3 py-2 text-[12px] text-[#9CA3AF]">
                        Leave a dish&apos;s price empty to use the discount above. Enter a price to sell that dish at a special price instead.
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between gap-4 rounded-xl border border-[#E8E8E3] px-4 py-3">
                    <div>
                      <p className="text-[14px] font-semibold text-[#0F1117]">Needs a coupon code</p>
                      <p className="mt-0.5 text-[12px] text-[#6B7280]">{requiresCoupon ? "Guests enter the code to get the offer." : "The offer applies automatically."}</p>
                    </div>
                    <Switch checked={requiresCoupon} onChange={() => setRequiresCoupon((v) => !v)} label="Needs a coupon code" />
                  </div>
                  {requiresCoupon && (
                    <div className="mt-3 w-60">
                      <label htmlFor="of-code" className={LABEL}>Coupon code</label>
                      <input
                        id="of-code"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase().replace(/\s/g, ""))}
                        placeholder="SAVE20"
                        spellCheck={false}
                        className={`${INPUT} font-semibold tracking-wider`}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <p className="mb-2.5 text-[13px] font-semibold text-[#0F1117]">When it runs</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <CustomDateTimePicker value={startsAt} onChange={setStartsAt} label="Starts" placeholder="Right away" />
                    <CustomDateTimePicker value={endsAt} onChange={setEndsAt} label="Ends" placeholder="No end date" />
                  </div>
                  <div className="mt-3 w-60">
                    <label htmlFor="of-max" className={LABEL}>
                      Maximum uses <span className="font-normal text-[#9CA3AF]">Optional</span>
                    </label>
                    <input id="of-max" type="number" min={1} inputMode="numeric" value={maxRedemptions} onChange={(e) => setMaxRedemptions(e.target.value)} placeholder="No limit" className={`${INPUT} tabular-nums`} />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <aside className="border-t border-[#F0F0EB] bg-[#FAFAF7] px-5 py-5 md:border-l md:border-t-0">
                <p className="text-[12px] font-medium text-[#6B7280]">What guests see</p>
                <div className="mt-2.5 rounded-xl border border-[#E8E8E3] bg-white p-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF4EC] px-2 py-0.5 text-[11px] font-semibold text-[#c2410c]">
                    <TicketPercent className="h-3 w-3" /> Offer
                  </span>
                  <p className="mt-2 text-[15px] font-semibold text-[#0F1117]">{name.trim() || "Offer name"}</p>
                  <p className="mt-1 text-[20px] font-bold tabular-nums tracking-[-0.02em] text-[#0F1117]">{discountText(discountKind, discountValue || 0)}</p>
                  <p className="text-[12px] text-[#6B7280]">
                    on {scope === "full_menu" ? "the whole menu" : `${selectedItems.length} ${selectedItems.length === 1 ? "dish" : "dishes"}`}
                  </p>
                  <div className="mt-3 border-t border-dashed border-[#E8E8E3] pt-3">
                    {requiresCoupon ? (
                      <p className="text-[12px] text-[#4B5563]">
                        Use code <span className="rounded border border-dashed border-[#D6D6CF] px-1.5 py-0.5 font-semibold tracking-wider text-[#0F1117]">{couponCode || "CODE"}</span>
                      </p>
                    ) : (
                      <p className="flex items-center gap-1.5 text-[12px] text-emerald-700"><Check className="h-3.5 w-3.5" /> Applied automatically</p>
                    )}
                  </div>
                </div>
                <dl className="mt-4 space-y-2 text-[12px]">
                  <div className="flex items-start justify-between gap-3"><dt className="text-[#6B7280]">Runs</dt><dd className="text-right tabular-nums text-[#0F1117]">{scheduleText(startsAt, endsAt)}</dd></div>
                  <div className="flex items-start justify-between gap-3"><dt className="text-[#6B7280]">Uses</dt><dd className="tabular-nums text-[#0F1117]">{maxRedemptions ? `Up to ${maxRedemptions}` : "No limit"}</dd></div>
                </dl>
              </aside>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-[#F0F0EB] px-6 py-4">
              <p className="text-[12px] text-amber-700">
                {!name.trim() ? "" : codeMissing ? "Enter a coupon code, or turn the code off." : itemsMissing ? "Choose at least one dish." : ""}
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={closeForm} className="h-10 rounded-xl border border-[#E8E8E3] bg-white px-4 text-[13px] font-semibold text-[#374151] transition-colors hover:border-[#D6D6CF] hover:text-[#0F1117]">
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!canCreate}
                  onClick={handleCreate}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#fe5c13] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#e44e0b] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating</> : "Create offer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={Boolean(pendingDelete)}
        title="Delete this offer?"
        message={pendingDelete ? `${pendingDelete.name} will stop applying straight away. To stop it for now and keep it, turn it off instead.` : ""}
        confirmText="Delete offer"
        cancelText="Keep offer"
        destructive
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) handleDelete(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </SettingsPageLayout>
  );
}
