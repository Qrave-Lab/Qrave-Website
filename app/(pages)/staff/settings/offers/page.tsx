"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, TicketPercent, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import SettingsPageLayout from "@/app/components/settings/SettingsPageLayout";
import { api } from "@/app/lib/api";

type MenuItem = { id: string; name: string; categoryName?: string };
type OfferItem = { menu_item_id: string; menu_item_name?: string; item_discount_kind?: "percent" | "fixed" | "fixed_price"; item_discount_value?: number };
type OfferCampaign = { id: string; name: string; scope: "full_menu" | "selected_items"; discount_kind: "percent" | "fixed" | "fixed_price"; discount_value: number; requires_coupon: boolean; coupon_code?: string; is_active: boolean; starts_at?: string; ends_at?: string; max_redemptions?: number; items?: OfferItem[] };

const toDateTimeLocal = (val?: string) => { if (!val) return ""; const d = new Date(val); if (Number.isNaN(d.getTime())) return ""; return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };

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
      const [offerRes, menuRes] = await Promise.all([api<{ offers?: OfferCampaign[] }>("/api/admin/offers?include_inactive=1", { method: "GET" }), api<any[]>("/api/admin/menu", { method: "GET" })]);
      setOffers(offerRes?.offers || []);
      setMenuItems((menuRes || []).map((m) => ({ id: String(m.id), name: String(m.name || ""), categoryName: String(m.categoryName || "") })));
    } catch { toast.error("Failed to load offers"); } finally { setIsLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filteredMenu = useMemo(() => { const q = query.trim().toLowerCase(); if (!q) return menuItems; return menuItems.filter((m) => m.name.toLowerCase().includes(q) || (m.categoryName || "").toLowerCase().includes(q)); }, [menuItems, query]);

  const resetForm = () => { setName(""); setScope("full_menu"); setDiscountKind("percent"); setDiscountValue(10); setRequiresCoupon(false); setCouponCode(""); setStartsAt(""); setEndsAt(""); setMaxRedemptions(""); setSelectedItems([]); setItemPriceMap({}); };

  const buildPayload = () => ({
    name: name.trim(), scope, discount_kind: discountKind, discount_value: Number(discountValue || 0),
    requires_coupon: requiresCoupon, coupon_code: requiresCoupon ? couponCode.trim().toUpperCase() : "",
    is_active: true, starts_at: startsAt ? new Date(startsAt).toISOString() : "", ends_at: endsAt ? new Date(endsAt).toISOString() : "",
    max_redemptions: maxRedemptions ? Number(maxRedemptions) : null,
    items: scope === "selected_items" ? selectedItems.map((id) => { const val = Number(itemPriceMap[id] || "0"); return val > 0 ? { menu_item_id: id, item_discount_kind: "fixed_price", item_discount_value: val } : { menu_item_id: id }; }) : [],
  });

  const handleCreate = async () => { setIsSaving(true); try { await api("/api/admin/offers", { method: "POST", body: JSON.stringify(buildPayload()) }); toast.success("Offer created"); resetForm(); await load(); } catch (e: any) { toast.error(e?.message || "Failed to create offer"); } finally { setIsSaving(false); } };

  const updateOffer = async (offer: OfferCampaign, patch: Partial<OfferCampaign>) => {
    const next = { ...offer, ...patch };
    await api(`/api/admin/offers/${offer.id}`, { method: "PUT", body: JSON.stringify({ name: next.name, scope: next.scope, discount_kind: next.discount_kind, discount_value: next.discount_value, requires_coupon: next.requires_coupon, coupon_code: next.coupon_code || "", is_active: next.is_active, starts_at: next.starts_at || "", ends_at: next.ends_at || "", max_redemptions: typeof next.max_redemptions === "number" ? next.max_redemptions : null, items: (next.items || []).map((i) => ({ menu_item_id: i.menu_item_id, item_discount_kind: i.item_discount_kind, item_discount_value: i.item_discount_value })) }) });
  };

  const handleToggleActive = async (offer: OfferCampaign) => { try { await updateOffer(offer, { is_active: !offer.is_active }); setOffers((prev) => prev.map((o) => (o.id === offer.id ? { ...o, is_active: !o.is_active } : o))); } catch { toast.error("Failed to update offer"); } };
  const handleDelete = async (id: string) => { try { await api(`/api/admin/offers/${id}`, { method: "DELETE" }); setOffers((prev) => prev.filter((o) => o.id !== id)); toast.success("Offer deleted"); } catch { toast.error("Failed to delete offer"); } };

  const discountValueLabel = discountKind === "percent" ? "Discount percent" : discountKind === "fixed" ? "Discount amount (INR)" : "Discounted selling price (INR)";
  const offerExplainText = `This offer applies to ${scope === "full_menu" ? "entire menu" : "selected dishes only"} and is redeemed ${requiresCoupon ? `using coupon code "${couponCode || "YOURCODE"}"` : "automatically (no coupon needed)"}.`;
  const prettyKind = (kind: OfferCampaign["discount_kind"]) => kind === "percent" ? "Percent Off" : kind === "fixed" ? "Flat Amount Off" : "Fixed Selling Price";

  return (
    <SettingsPageLayout title="Offers & Coupons" description="Create full-menu or dish-level discounts with optional coupon codes." maxWidth="max-w-[1400px]">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <TicketPercent className="h-5 w-5 text-slate-600" />
          <h2 className="text-lg font-bold">Create Offer</h2>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Basic Setup</p>
            <div><label className="mb-1.5 block text-xs font-semibold text-slate-600">Offer Name</label><input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Lunch Combo Deal" /></div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div><label className="mb-1.5 block text-xs font-semibold text-slate-600">Offer Scope</label><select value={scope} onChange={(e) => setScope(e.target.value as any)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="full_menu">Full Menu</option><option value="selected_items">Only Selected Dishes</option></select></div>
              <div><label className="mb-1.5 block text-xs font-semibold text-slate-600">Discount Type</label><select value={discountKind} onChange={(e) => setDiscountKind(e.target.value as any)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="percent">Percent Off (%)</option><option value="fixed">Flat Amount Off (INR)</option><option value="fixed_price">Fixed Selling Price (INR)</option></select></div>
            </div>
            <div><label className="mb-1.5 block text-xs font-semibold text-slate-600">{discountValueLabel}</label><input type="number" min={0} step="0.01" value={discountValue} onChange={(e) => setDiscountValue(Number(e.target.value || 0))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Enter value" /></div>
          </div>
          <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Coupon & Schedule</p>
            <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm"><input type="checkbox" checked={requiresCoupon} onChange={(e) => setRequiresCoupon(e.target.checked)} />Require customers to enter a coupon code</label>
            <div><label className="mb-1.5 block text-xs font-semibold text-slate-600">Coupon Code</label><input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="SAVE20" disabled={!requiresCoupon} /></div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div><label className="mb-1.5 block text-xs font-semibold text-slate-600">Start Time (optional)</label><input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></div>
              <div><label className="mb-1.5 block text-xs font-semibold text-slate-600">End Time (optional)</label><input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></div>
            </div>
            <div><label className="mb-1.5 block text-xs font-semibold text-slate-600">Max Coupon Redemptions (optional)</label><input type="number" min={1} value={maxRedemptions} onChange={(e) => setMaxRedemptions(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Leave empty for unlimited" /></div>
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-3 text-sm text-indigo-700">{offerExplainText}</div>
        {scope === "selected_items" && (
          <div className="mt-4 rounded-2xl border border-slate-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">Select dishes for this offer</p>
              <input value={query} onChange={(e) => setQuery(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs" placeholder="Search dishes..." />
            </div>
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {filteredMenu.map((m) => {
                const checked = selectedItems.includes(m.id); return (
                  <div key={m.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2">
                    <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={checked} onChange={(e) => setSelectedItems((prev) => e.target.checked ? [...prev, m.id] : prev.filter((id) => id !== m.id))} /><span>{m.name}</span>{m.categoryName ? <span className="text-xs text-slate-400">({m.categoryName})</span> : null}</label>
                    {checked && <input type="number" min={0} step="0.01" value={itemPriceMap[m.id] || ""} onChange={(e) => setItemPriceMap((prev) => ({ ...prev, [m.id]: e.target.value }))} className="w-44 rounded-lg border border-slate-200 px-2 py-1 text-xs" placeholder="Optional per-item fixed price (INR)" />}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <button disabled={isSaving} onClick={handleCreate} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Add Offer
        </button>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold">Existing Offers</h2>
        {isLoading ? <div className="py-12 text-center text-sm text-slate-500">Loading offers...</div>
          : offers.length === 0 ? <div className="py-12 text-center text-sm text-slate-500">No offers configured yet.</div>
            : (
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                {offers.map((offer) => (
                  <div key={offer.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-slate-900">{offer.name}</p>
                        <p className="text-xs text-slate-500 mt-1">{offer.scope === "full_menu" ? "Full Menu" : `${offer.items?.length || 0} Selected Dish(es)`} • {prettyKind(offer.discount_kind)}: {offer.discount_value}{offer.requires_coupon && offer.coupon_code ? ` • Code: ${offer.coupon_code}` : ""}</p>
                        {(offer.starts_at || offer.ends_at) && <p className="text-xs text-slate-400 mt-1">{offer.starts_at ? toDateTimeLocal(offer.starts_at) : "Now"} to {offer.ends_at ? toDateTimeLocal(offer.ends_at) : "No end"}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleToggleActive(offer)} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${offer.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{offer.is_active ? "Active" : "Inactive"}</button>
                        <button onClick={() => handleDelete(offer.id)} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50" aria-label="Delete offer"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
      </section>
    </SettingsPageLayout>
  );
}
