"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { Loader2, Plus, TicketPercent, Trash2, Calendar, Clock, ChevronLeft, ChevronRight, ChevronDown, X } from "lucide-react";
import toast from "react-hot-toast";
import SettingsPageLayout from "@/app/components/settings/SettingsPageLayout";
import { api } from "@/app/lib/api";

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
    <div className="flex-1 min-w-[180px] relative" ref={containerRef}>
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5 pl-1">
        {label}
      </label>

      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-11 items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 transition-all hover:border-slate-350 focus-within:border-[#fe5c13] focus-within:ring-4 focus-within:ring-[#fe5c13]/10 shadow-sm cursor-pointer select-none"
      >
        <div className="flex items-center gap-2.5">
          <Calendar className="h-4 w-4 text-slate-400" />
          <span className={`text-xs font-bold ${value ? 'text-slate-700' : 'text-slate-400'}`}>
            {formatDisplayDateTime(value)}
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute top-[105%] left-0 z-50 w-[280px] rounded-2xl border border-slate-150 bg-white p-4 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700">
              {monthsList[month]} {year}
            </span>
            <div className="flex gap-1">
              <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={handleNextMonth} className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">
            <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, idx) => (
              <button
                key={idx}
                onClick={(e) => handleSelectDay(e, cell.day, cell.type)}
                className={`h-7 w-7 rounded-xl text-xs font-bold transition-all flex items-center justify-center relative ${
                  cell.type !== 'curr' ? 'text-slate-355' 
                  : cell.isSelected ? 'bg-[#fe5c13] text-white shadow-sm' 
                  : cell.isToday ? 'bg-orange-50 text-[#fe5c13] border border-[#fe5c13]/30'
                  : 'text-slate-705 hover:bg-slate-100'
                }`}
              >
                {cell.day}
              </button>
            ))}
          </div>

          {/* Time Picker controls */}
          <div className="border-t border-slate-100 mt-3 pt-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
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
                  className="text-[10px] font-bold text-rose-600 hover:underline flex items-center gap-0.5"
                >
                  <X className="w-3 h-3" /> Clear
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <select
                  value={selectedHour}
                  onChange={(e) => {
                    const hr = Number(e.target.value);
                    setSelectedHour(hr);
                    if (selectedDate) triggerChange(selectedDate, hr, selectedMinute);
                  }}
                  className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2.5 pr-8 text-[11px] font-bold text-slate-700 outline-none hover:border-slate-350 focus:border-[#fe5c13] appearance-none cursor-pointer"
                >
                  {Array.from({ length: 24 }).map((_, i) => (
                    <option key={i} value={i}>
                      {String(i).padStart(2, "0")} Hrs
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
              <div className="flex-1 relative">
                <select
                  value={selectedMinute}
                  onChange={(e) => {
                    const min = Number(e.target.value);
                    setSelectedMinute(min);
                    if (selectedDate) triggerChange(selectedDate, selectedHour, min);
                  }}
                  className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2.5 pr-8 text-[11px] font-bold text-slate-700 outline-none hover:border-slate-355 focus:border-[#fe5c13] appearance-none cursor-pointer"
                >
                  {Array.from({ length: 12 }).map((_, i) => {
                    const val = i * 5;
                    return (
                      <option key={val} value={val}>
                        {String(val).padStart(2, "0")} Min
                      </option>
                    );
                  })}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

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
      toast.success("Offer campaign created");
      resetForm();
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
      toast.success(offer.is_active ? "Campaign paused" : "Campaign activated");
    } catch {
      toast.error("Failed to update campaign state");
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

  const discountValueLabel = discountKind === "percent" ? "Discount percent" : discountKind === "fixed" ? "Discount amount (INR)" : "Discounted selling price (INR)";
  const offerExplainText = `This offer applies to ${scope === "full_menu" ? "entire menu" : "selected dishes only"} and is redeemed ${requiresCoupon ? `using coupon code "${couponCode || "YOURCODE"}"` : "automatically (no coupon needed)"}.`;
  const prettyKind = (kind: OfferCampaign["discount_kind"]) => kind === "percent" ? "Percent Off" : kind === "fixed" ? "Flat Amount Off" : "Fixed Selling Price";

  return (
    <SettingsPageLayout
      title="Offers & Coupons"
      description="Create full-menu or dish-level discounts with optional coupon codes."
      fullBleed
    >
      <div className="flex flex-1 min-h-0 bg-[#f8fafc]">
        <div className="flex flex-col xl:flex-row flex-1 min-h-0">

          {/* ── Left: Submit form ──────────────────────────────────────── */}
          <div className="xl:w-[42%] border-r border-slate-200 bg-white px-8 py-8 flex flex-col gap-6 overflow-y-auto shrink-0">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Campaign Manager</p>
              <h2 className="text-sm font-black text-slate-900 mt-0.5 flex items-center gap-2">
                <TicketPercent className="w-4 h-4 text-[#fe5c13]" /> Create Offer Setup
              </h2>
            </div>

            <div className="flex flex-col gap-5 flex-1">
              {/* Offer Name */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                  Offer Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Happy Hours Discount"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-[#fe5c13] focus:ring-4 focus:ring-orange-100 transition-all placeholder:text-slate-400"
                />
              </div>

              {/* Offer Scope & Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                    Offer Scope
                  </label>
                  <div className="relative">
                    <select
                      value={scope}
                      onChange={(e) => setScope(e.target.value as any)}
                      className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3.5 pr-10 text-xs font-bold text-slate-700 outline-none hover:border-slate-350 focus:border-[#fe5c13] focus:ring-4 focus:ring-orange-100 transition-all appearance-none cursor-pointer"
                    >
                      <option value="full_menu">Full Menu</option>
                      <option value="selected_items">Selected Dishes</option>
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                    Discount Type
                  </label>
                  <div className="relative">
                    <select
                      value={discountKind}
                      onChange={(e) => setDiscountKind(e.target.value as any)}
                      className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3.5 pr-10 text-xs font-bold text-slate-700 outline-none hover:border-slate-350 focus:border-[#fe5c13] focus:ring-4 focus:ring-orange-100 transition-all appearance-none cursor-pointer"
                    >
                      <option value="percent">Percent Off (%)</option>
                      <option value="fixed">Flat Amount Off (INR)</option>
                      <option value="fixed_price">Fixed Price (INR)</option>
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Discount Value */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                  {discountValueLabel} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Number(e.target.value || 0))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-[#fe5c13] focus:ring-4 focus:ring-orange-100 transition-all"
                  placeholder="e.g. 10"
                />
              </div>

              {/* Requires Coupon */}
              <div className="border-t border-slate-100 my-1 pt-4 flex flex-col gap-4">
                <label className="inline-flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={requiresCoupon}
                    onChange={(e) => setRequiresCoupon(e.target.checked)}
                    className="w-4.5 h-4.5 rounded border-slate-300 text-[#fe5c13] focus:ring-[#fe5c13]/25 accent-slate-900"
                  />
                  <span className="text-xs font-bold text-slate-750">Require customers to enter a coupon code</span>
                </label>

                {requiresCoupon && (
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                      Coupon Code <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="e.g. SAVE20"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-[#fe5c13] focus:ring-4 focus:ring-orange-100 transition-all placeholder:text-slate-400"
                    />
                  </div>
                )}
              </div>

              {/* Start & End Date Time Picker */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CustomDateTimePicker
                  value={startsAt}
                  onChange={setStartsAt}
                  label="Start Time (optional)"
                  placeholder="Immediate"
                />
                <CustomDateTimePicker
                  value={endsAt}
                  onChange={setEndsAt}
                  label="End Time (optional)"
                  placeholder="Never expires"
                />
              </div>

              {/* Max Redemptions */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                  Max Coupon Redemptions (optional)
                </label>
                <input
                  type="number"
                  min={1}
                  value={maxRedemptions}
                  onChange={(e) => setMaxRedemptions(e.target.value)}
                  placeholder="Leave empty for unlimited redemptions"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-[#fe5c13] focus:ring-4 focus:ring-orange-100 transition-all placeholder:text-slate-400"
                />
              </div>

              {/* Selected items container */}
              {scope === "selected_items" && (
                <div className="flex flex-col gap-3 border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Select Campaign Dishes</span>
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="h-8 rounded-lg border border-slate-250 bg-slate-50 px-3 text-xs focus:bg-white focus:border-[#fe5c13] outline-none transition-all"
                      placeholder="Search dishes..."
                    />
                  </div>
                  <div className="max-h-56 border border-slate-100 rounded-xl divide-y divide-slate-100 overflow-y-auto bg-slate-50/20">
                    {filteredMenu.map((m) => {
                      const checked = selectedItems.includes(m.id);
                      return (
                        <div key={m.id} className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-slate-50/50">
                          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) =>
                                setSelectedItems((prev) =>
                                  e.target.checked ? [...prev, m.id] : prev.filter((id) => id !== m.id)
                                )
                              }
                              className="accent-slate-900 rounded"
                            />
                            <span>{m.name}</span>
                            {m.categoryName && (
                              <span className="text-[10px] text-slate-400 font-medium">({m.categoryName})</span>
                            )}
                          </label>
                          {checked && (
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={itemPriceMap[m.id] || ""}
                              onChange={(e) => setItemPriceMap((prev) => ({ ...prev, [m.id]: e.target.value }))}
                              className="w-28 h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-bold outline-none focus:border-[#fe5c13]"
                              placeholder="₹ Fixed price"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Explain Text banner */}
              <div className="rounded-xl border border-slate-150 bg-slate-50/50 px-4 py-3 text-xs text-slate-500 font-medium leading-relaxed mt-2">
                {offerExplainText}
              </div>

              {/* Action Button */}
              <button
                type="button"
                disabled={isSaving || !name.trim()}
                onClick={handleCreate}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#fe5c13] px-4 py-3 text-xs font-black text-slate-900 shadow-md shadow-orange-100 hover:brightness-95 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Add Offer Campaign
              </button>
            </div>
          </div>

          {/* ── Right: List ─────────────────────────────────────────── */}
          <div className="flex flex-col flex-1 min-h-0 bg-[#f8fafc]">
            {/* Section header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between z-10 shrink-0">
              <div className="flex items-center gap-2">
                <TicketPercent className="h-4.5 w-4.5 text-slate-500" />
                <h2 className="text-sm font-black text-slate-900">Configured Campaigns</h2>
              </div>
              {!isLoading && (
                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                  {offers.length} Offer{offers.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-6">
              {isLoading ? (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="animate-pulse bg-white border border-slate-200/50 rounded-2xl p-5 h-28" />
                  ))}
                </div>
              ) : offers.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                    <TicketPercent className="h-5 w-5 text-slate-300" />
                  </div>
                  <p className="text-sm font-semibold text-slate-500">No offers or discounts configured yet.</p>
                  <p className="text-xs text-slate-400">Use the campaign builder on the left to set up menu discounts.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {offers.map((offer) => (
                    <div
                      key={offer.id}
                      className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="font-bold text-slate-900 text-sm">{offer.name}</h3>
                          <button
                            onClick={() => handleDelete(offer.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                            aria-label="Delete offer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          <span className="bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider">
                            {offer.scope === "full_menu" ? "Full Menu" : `${offer.items?.length || 0} Dishes`}
                          </span>
                          <span className="bg-orange-50 border border-orange-200 text-[#fe5c13] px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider">
                            {prettyKind(offer.discount_kind)}: {offer.discount_value}{offer.discount_kind === "percent" ? "%" : " INR"}
                          </span>
                          {offer.requires_coupon && offer.coupon_code && (
                            <span className="bg-violet-50 border border-violet-200 text-violet-700 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider">
                              Code: {offer.coupon_code}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                        <div className="text-[10px] text-slate-400 font-medium">
                          {offer.starts_at || offer.ends_at ? (
                            <span>
                              {offer.starts_at ? new Date(offer.starts_at).toLocaleDateString() : "Immediate"} - {offer.ends_at ? new Date(offer.ends_at).toLocaleDateString() : "No end"}
                            </span>
                          ) : (
                            <span>Active indefinitely</span>
                          )}
                        </div>
                        <button
                          onClick={() => handleToggleActive(offer)}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-colors ${
                            offer.is_active
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100/40"
                              : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                          }`}
                        >
                          {offer.is_active ? "Active" : "Paused"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </SettingsPageLayout>
  );
}
