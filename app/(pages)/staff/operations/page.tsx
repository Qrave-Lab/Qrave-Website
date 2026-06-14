"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, RefreshCw, ShieldCheck } from "lucide-react";
import StaffSidebar from "@/app/components/StaffSidebar";
import { api } from "@/app/lib/api";
import { OpsFeatureFlag, rolloutBadgeText, toFeatureFlagsCsv } from "@/app/lib/ops-control";

type OpsPermission = {
  role_key: string;
  action_key: string;
  allowed: boolean;
  updated_at: string;
};

type InventoryOverview = {
  ingredient_count: number;
  low_stock_count: number;
  total_on_hand: number;
  deduction_24h: number;
  wastage_24h: number;
};

type IngredientStock = {
  ingredient_id: string;
  ingredient: string;
  stock: number;
  reorder_threshold: number;
  is_low_stock: boolean;
  updated_at: string;
};

type InventoryLedger = {
  id: string;
  ingredient_id: string;
  ingredient: string;
  source_type: string;
  delta: number;
  resulting_stock: number;
  unit: string;
  reason?: string;
  created_at: string;
};

type WastageEvent = {
  id: string;
  ingredient_id: string;
  ingredient: string;
  quantity: number;
  unit: string;
  shift_label?: string;
  reason?: string;
  staff_name?: string;
  created_at: string;
};

type PurchaseSuggestion = {
  ingredient_id: string;
  ingredient: string;
  current_stock: number;
  reorder_threshold: number;
  daily_consumption: number;
  lead_time_days: number;
  suggested_order_qty: number;
};

type CRMLoyaltyOverview = {
  total_customers: number;
  total_points_balance: number;
  ledger_entries_24h: number;
  birthday_due_count: number;
  anniversary_due_count: number;
};

type CRMLoyaltyLedgerEntry = {
  id: string;
  customer_profile_id: string;
  customer_name: string;
  event_type: string;
  points_delta: number;
  resulting_balance: number;
  source_type: string;
  created_at: string;
  note?: string;
};

type CRMCampaignEligible = {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  loyalty_tier: string;
  visit_count: number;
};

type CRMCampaignRun = {
  campaign_run_id: string;
  targeted_count: number;
  offer_campaign_id: string;
  coupon_code: string;
};

type CRMCampaignRunSummary = {
  id: string;
  campaign_type: string;
  channel: string;
  status: string;
  offer_campaign_id?: string;
  coupon_code?: string;
  segment_filter: Record<string, unknown>;
  attributed_revenue: number;
  targeted_count: number;
  created_at: string;
};

export default function StaffOperationsControlPage() {
  const [activeTab, setActiveTab] = useState<'inventory' | 'crm' | 'flags'>('inventory');
  const [flags, setFlags] = useState<OpsFeatureFlag[]>([]);
  const [permissions, setPermissions] = useState<OpsPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [search, setSearch] = useState("");
  const [inventoryOverview, setInventoryOverview] = useState<InventoryOverview | null>(null);
  const [inventoryStocks, setInventoryStocks] = useState<IngredientStock[]>([]);
  const [inventoryLedger, setInventoryLedger] = useState<InventoryLedger[]>([]);
  const [inventoryEnabled, setInventoryEnabled] = useState(true);
  const [inventoryLoaded, setInventoryLoaded] = useState(false);
  const [inventoryError, setInventoryError] = useState("");
  const [wastageEvents, setWastageEvents] = useState<WastageEvent[]>([]);
  const [purchaseSuggestions, setPurchaseSuggestions] = useState<PurchaseSuggestion[]>([]);
  const [crmEnabled, setCrmEnabled] = useState(true);
  const [campaignEnabled, setCampaignEnabled] = useState(true);
  const [crmLoaded, setCrmLoaded] = useState(false);
  const [crmError, setCrmError] = useState("");
  const [campaignLoaded, setCampaignLoaded] = useState(false);
  const [campaignError, setCampaignError] = useState("");
  const [opsError, setOpsError] = useState("");
  const [crmOverview, setCrmOverview] = useState<CRMLoyaltyOverview | null>(null);
  const [crmLedger, setCrmLedger] = useState<CRMLoyaltyLedgerEntry[]>([]);
  const [campaignEligible, setCampaignEligible] = useState<CRMCampaignEligible[]>([]);
  const [sendingCampaign, setSendingCampaign] = useState(false);
  const [lastRun, setLastRun] = useState<CRMCampaignRun | null>(null);
  const [campaignRuns, setCampaignRuns] = useState<CRMCampaignRunSummary[]>([]);

  const load = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError("");
    setOpsError("");
    setInventoryError("");
    setCrmError("");
    setCampaignError("");
    if (showLoading) {
      setInventoryLoaded(false);
      setCrmLoaded(false);
      setCampaignLoaded(false);
    }

    try {
      const [flagsRes, permsRes] = await Promise.all([
        api<{ flags: OpsFeatureFlag[] }>("/api/admin/ops/feature-flags", { method: "GET", noCache: true }),
        api<{ permissions: OpsPermission[] }>("/api/admin/ops/permissions", { method: "GET", noCache: true }),
      ]);
      setFlags(flagsRes.flags || []);
      setPermissions(permsRes.permissions || []);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load operations control data";
      setOpsError(message);
      setError(message);
      setFlags([]);
      setPermissions([]);
    }

    try {
      const invRes = await api<{
        overview: InventoryOverview;
        stocks: IngredientStock[];
        ledger: InventoryLedger[];
      }>("/api/admin/inventory/advanced/overview?ledger_limit=8", { method: "GET", noCache: true, suppressErrorLog: true });
      const [wasteRes, suggestionRes] = await Promise.all([
        api<{ events: WastageEvent[] }>("/api/admin/inventory/advanced/wastage?limit=6", { method: "GET", noCache: true, suppressErrorLog: true }),
        api<{ suggestions: PurchaseSuggestion[] }>("/api/admin/inventory/advanced/purchase-suggestions?days=7&limit=8", { method: "GET", noCache: true, suppressErrorLog: true }),
      ]);
      setInventoryEnabled(true);
      setInventoryOverview(invRes.overview);
      setInventoryStocks(invRes.stocks || []);
      setInventoryLedger(invRes.ledger || []);
      setWastageEvents(wasteRes.events || []);
      setPurchaseSuggestions(suggestionRes.suggestions || []);
    } catch (invErr) {
      const status = (invErr as Error & { status?: number })?.status;
      if (status === 404) {
        setInventoryEnabled(false);
        setInventoryOverview(null);
        setInventoryStocks([]);
        setInventoryLedger([]);
        setWastageEvents([]);
        setPurchaseSuggestions([]);
      } else {
        setInventoryError(invErr instanceof Error ? invErr.message : "Failed to load advanced inventory");
      }
    } finally {
      setInventoryLoaded(true);
    }

    try {
      const [overviewRes, ledgerRes] = await Promise.all([
        api<{ overview: CRMLoyaltyOverview }>("/api/admin/crm/loyalty/overview", { method: "GET", noCache: true, suppressErrorLog: true }),
        api<{ ledger: CRMLoyaltyLedgerEntry[] }>("/api/admin/crm/loyalty/ledger?limit=8", { method: "GET", noCache: true, suppressErrorLog: true }),
      ]);
      setCrmEnabled(true);
      setCrmOverview(overviewRes.overview);
      setCrmLedger(ledgerRes.ledger || []);
    } catch (crmErr) {
      const status = (crmErr as Error & { status?: number })?.status;
      if (status === 404) {
        setCrmEnabled(false);
        setCrmOverview(null);
        setCrmLedger([]);
      } else {
        setCrmError(crmErr instanceof Error ? crmErr.message : "Failed to load CRM and loyalty");
      }
    } finally {
      setCrmLoaded(true);
    }

    try {
      const [campaignRes, runsRes] = await Promise.all([
        api<{ customers: CRMCampaignEligible[] }>(
          "/api/admin/crm/campaign-eligibility?type=birthday&limit=8",
          { method: "GET", noCache: true, suppressErrorLog: true },
        ),
        api<{ runs: CRMCampaignRunSummary[] }>(
          "/api/admin/crm/campaign-runs?limit=8",
          { method: "GET", noCache: true, suppressErrorLog: true },
        ),
      ]);
      setCampaignEnabled(true);
      setCampaignEligible(campaignRes.customers || []);
      setCampaignRuns(runsRes.runs || []);
    } catch (campaignErr) {
      const status = (campaignErr as Error & { status?: number })?.status;
      if (status === 404) {
        setCampaignEnabled(false);
        setCampaignEligible([]);
        setCampaignRuns([]);
      } else {
        setCampaignError(campaignErr instanceof Error ? campaignErr.message : "Failed to load campaign data");
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    void load(true);
  }, []);

  const filteredFlags = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return flags;
    return flags.filter((f) => f.module_key.toLowerCase().includes(q));
  }, [flags, search]);

  const groupedPermissions = useMemo(() => {
    const out: Record<string, OpsPermission[]> = {};
    for (const item of permissions) {
      if (!out[item.role_key]) out[item.role_key] = [];
      out[item.role_key].push(item);
    }
    return out;
  }, [permissions]);

  const toggleFlag = async (flag: OpsFeatureFlag) => {
    const nextEnabled = !flag.enabled;
    const key = `${flag.module_key}:${Date.now()}`;
    setSaving(flag.module_key);
    setError("");
    try {
      await api(`/api/admin/ops/feature-flags/${flag.module_key}`, {
        method: "POST",
        headers: {
          "X-Idempotency-Key": key,
        },
        body: JSON.stringify({
          enabled: nextEnabled,
          rollout_percent: flag.rollout_percent,
          config: {},
        }),
      });
      await load(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update feature flag");
    } finally {
      setSaving(null);
    }
  };

  const exportCsv = () => {
    const csv = toFeatureFlagsCsv(filteredFlags);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `ops-feature-flags-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(href);
  };

  const sendBirthdayCampaign = async () => {
    setSendingCampaign(true);
    setError("");
    try {
      const res = await api<{ run: CRMCampaignRun }>("/api/admin/crm/campaign-runs/send", {
        method: "POST",
        body: JSON.stringify({
          campaign_type: "birthday",
          channel: "whatsapp",
          limit: 50,
          discount_kind: "percent",
          discount_value: 10,
          max_redemptions: 50,
          expires_in_days: 7,
        }),
      });
      setLastRun(res.run);
      await load(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to send campaign run");
    } finally {
      setSendingCampaign(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
      <StaffSidebar />
      <div className="flex-1 flex flex-col min-w-0 relative">
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-8 sticky top-0 z-10 shrink-0">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-gray-900">Operations Control</h2>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                Rollout governance, feature flags, and CRM/Inventory status.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void load(true)}
              className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-900 hover:brightness-95 transition-all shadow-sm cursor-pointer"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 relative">
          <div className="mx-auto max-w-7xl space-y-6">

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
          )}

          <div className="flex space-x-1 rounded-xl bg-slate-200/50 p-1">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                activeTab === 'inventory' ? 'bg-[#fe5c13] text-gray-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Advanced Inventory
            </button>
            <button
              onClick={() => setActiveTab('crm')}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                activeTab === 'crm' ? 'bg-[#fe5c13] text-gray-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              CRM & Loyalty
            </button>
            <button
              onClick={() => setActiveTab('flags')}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                activeTab === 'flags' ? 'bg-[#fe5c13] text-gray-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Configuration & Permissions
            </button>
          </div>

          {activeTab === 'inventory' && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 animate-in fade-in duration-300">
              <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Advanced Inventory</h2>
              {!inventoryEnabled && (
                <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                  inventory_advanced disabled
                </span>
              )}
            </div>
            {!inventoryEnabled ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Enable the inventory_advanced feature flag to activate recipe-level stock deduction and ledger visibility.
              </div>
            ) : !inventoryLoaded ? (
              <div className="py-6 text-sm text-slate-500">Loading inventory metrics...</div>
            ) : inventoryError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                Unable to load advanced inventory: {inventoryError}
              </div>
            ) : !inventoryOverview ? (
              <div className="py-6 text-sm text-slate-500">No inventory data available for this restaurant yet.</div>
            ) : (
              <>
                <div className="mb-4 grid gap-3 md:grid-cols-4">
                  <article className="rounded-xl border border-slate-200 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ingredients</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{inventoryOverview.ingredient_count}</p>
                  </article>
                  <article className="rounded-xl border border-slate-200 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Low Stock</p>
                    <p className="mt-1 text-2xl font-bold text-rose-700">{inventoryOverview.low_stock_count}</p>
                  </article>
                  <article className="rounded-xl border border-slate-200 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total On Hand</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{inventoryOverview.total_on_hand.toFixed(1)}</p>
                  </article>
                  <article className="rounded-xl border border-slate-200 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">24h Deduction</p>
                    <p className="mt-1 text-2xl font-bold text-emerald-700">{inventoryOverview.deduction_24h.toFixed(1)}</p>
                  </article>
                  <article className="rounded-xl border border-slate-200 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">24h Wastage</p>
                    <p className="mt-1 text-2xl font-bold text-amber-700">{inventoryOverview.wastage_24h.toFixed(1)}</p>
                  </article>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 p-3">
                    <h3 className="mb-2 text-sm font-semibold text-slate-800">Low Stock Watchlist</h3>
                    <div className="max-h-64 overflow-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                            <th className="px-2 py-2">Ingredient</th>
                            <th className="px-2 py-2">Stock</th>
                            <th className="px-2 py-2">Threshold</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inventoryStocks.filter((s) => s.is_low_stock).slice(0, 10).map((s) => (
                            <tr key={s.ingredient_id} className="border-b border-slate-100">
                              <td className="px-2 py-2 font-medium text-slate-800">{s.ingredient}</td>
                              <td className="px-2 py-2 text-rose-700">{s.stock.toFixed(2)}</td>
                              <td className="px-2 py-2 text-slate-600">{s.reorder_threshold.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-3">
                    <h3 className="mb-2 text-sm font-semibold text-slate-800">Recent Inventory Ledger</h3>
                    <div className="max-h-64 overflow-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                            <th className="px-2 py-2">Ingredient</th>
                            <th className="px-2 py-2">Type</th>
                            <th className="px-2 py-2">Delta</th>
                            <th className="px-2 py-2">Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inventoryLedger.map((l) => (
                            <tr key={l.id} className="border-b border-slate-100">
                              <td className="px-2 py-2 font-medium text-slate-800">{l.ingredient}</td>
                              <td className="px-2 py-2 text-slate-600">{l.source_type}</td>
                              <td className={`px-2 py-2 font-semibold ${l.delta < 0 ? "text-rose-700" : "text-emerald-700"}`}>
                                {l.delta.toFixed(2)} {l.unit}
                              </td>
                              <td className="px-2 py-2 text-slate-500">{new Date(l.created_at).toLocaleString("en-IN")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 p-3">
                    <h3 className="mb-2 text-sm font-semibold text-slate-800">Recent Wastage</h3>
                    <div className="max-h-64 overflow-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                            <th className="px-2 py-2">Ingredient</th>
                            <th className="px-2 py-2">Qty</th>
                            <th className="px-2 py-2">Shift</th>
                            <th className="px-2 py-2">Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {wastageEvents.map((w) => (
                            <tr key={w.id} className="border-b border-slate-100">
                              <td className="px-2 py-2 font-medium text-slate-800">{w.ingredient}</td>
                              <td className="px-2 py-2 text-amber-700">{w.quantity.toFixed(2)} {w.unit}</td>
                              <td className="px-2 py-2 text-slate-600">{w.shift_label || "-"}</td>
                              <td className="px-2 py-2 text-slate-500">{new Date(w.created_at).toLocaleString("en-IN")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-3">
                    <h3 className="mb-2 text-sm font-semibold text-slate-800">Purchase Suggestions</h3>
                    <div className="max-h-64 overflow-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                            <th className="px-2 py-2">Ingredient</th>
                            <th className="px-2 py-2">Daily Use</th>
                            <th className="px-2 py-2">Lead</th>
                            <th className="px-2 py-2">Suggested Qty</th>
                          </tr>
                        </thead>
                        <tbody>
                          {purchaseSuggestions.map((s) => (
                            <tr key={s.ingredient_id} className="border-b border-slate-100">
                              <td className="px-2 py-2 font-medium text-slate-800">{s.ingredient}</td>
                              <td className="px-2 py-2 text-slate-600">{s.daily_consumption.toFixed(2)}</td>
                              <td className="px-2 py-2 text-slate-600">{s.lead_time_days}d</td>
                              <td className="px-2 py-2 font-semibold text-emerald-700">{s.suggested_order_qty.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            )}
            </section>
          )}

          {activeTab === 'crm' && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 animate-in fade-in duration-300">
              <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">CRM and Loyalty</h2>
              {!crmEnabled && (
                <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                  crm_loyalty disabled
                </span>
              )}
            </div>
            {!crmEnabled ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Enable the crm_loyalty feature flag to activate customer wallet tracking and loyalty ledger APIs.
              </div>
            ) : !crmLoaded ? (
              <div className="py-6 text-sm text-slate-500">Loading CRM and loyalty metrics...</div>
            ) : crmError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                Unable to load CRM and loyalty: {crmError}
              </div>
            ) : !crmOverview ? (
              <div className="py-6 text-sm text-slate-500">No CRM metrics available for this restaurant yet.</div>
            ) : (
              <>
                <div className="mb-4 grid gap-3 md:grid-cols-5">
                  <article className="rounded-xl border border-slate-200 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customers</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{crmOverview.total_customers}</p>
                  </article>
                  <article className="rounded-xl border border-slate-200 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Points Balance</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{crmOverview.total_points_balance}</p>
                  </article>
                  <article className="rounded-xl border border-slate-200 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ledger 24h</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{crmOverview.ledger_entries_24h}</p>
                  </article>
                  <article className="rounded-xl border border-slate-200 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Birthdays Today</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{crmOverview.birthday_due_count}</p>
                  </article>
                  <article className="rounded-xl border border-slate-200 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Anniversaries Today</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{crmOverview.anniversary_due_count}</p>
                  </article>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 p-3">
                    <h3 className="mb-2 text-sm font-semibold text-slate-800">Recent Loyalty Ledger</h3>
                    <div className="max-h-64 overflow-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                            <th className="px-2 py-2">Customer</th>
                            <th className="px-2 py-2">Event</th>
                            <th className="px-2 py-2">Delta</th>
                            <th className="px-2 py-2">Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {crmLedger.map((row) => (
                            <tr key={row.id} className="border-b border-slate-100">
                              <td className="px-2 py-2 font-medium text-slate-800">{row.customer_name || "-"}</td>
                              <td className="px-2 py-2 text-slate-600">{row.event_type}</td>
                              <td className={`px-2 py-2 font-semibold ${row.points_delta < 0 ? "text-rose-700" : "text-emerald-700"}`}>
                                {row.points_delta}
                              </td>
                              <td className="px-2 py-2 text-slate-700">{row.resulting_balance}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-800">Campaign Eligible (Birthday)</h3>
                      {!campaignEnabled && (
                        <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                          campaign_automation disabled
                        </span>
                      )}
                    </div>
                    {!campaignEnabled ? (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                        Enable campaign_automation to preview auto-targeted recipients.
                      </div>
                    ) : !campaignLoaded ? (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600">
                        Loading campaign eligibility...
                      </div>
                    ) : campaignError ? (
                      <div className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">
                        Unable to load campaign data: {campaignError}
                      </div>
                    ) : (
                      <>
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => void sendBirthdayCampaign()}
                            disabled={sendingCampaign}
                            className="rounded-md bg-[#fe5c13] px-3 py-1.5 text-xs font-semibold text-gray-900 hover:brightness-95 disabled:opacity-50"
                          >
                            {sendingCampaign ? "Sending..." : "Send Birthday Campaign"}
                          </button>
                          {lastRun && (
                            <span className="text-xs text-emerald-700">
                              Sent {lastRun.targeted_count} users, coupon {lastRun.coupon_code}
                            </span>
                          )}
                        </div>
                        <div className="max-h-64 overflow-auto">
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                                <th className="px-2 py-2">Customer</th>
                                <th className="px-2 py-2">Phone</th>
                                <th className="px-2 py-2">Tier</th>
                                <th className="px-2 py-2">Visits</th>
                              </tr>
                            </thead>
                            <tbody>
                              {campaignEligible.map((row) => (
                                <tr key={row.id} className="border-b border-slate-100">
                                  <td className="px-2 py-2 font-medium text-slate-800">{row.full_name || row.email || "-"}</td>
                                  <td className="px-2 py-2 text-slate-600">{row.phone || "-"}</td>
                                  <td className="px-2 py-2 text-slate-700">{row.loyalty_tier}</td>
                                  <td className="px-2 py-2 text-slate-700">{row.visit_count}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-slate-200 p-3">
                  <h3 className="mb-2 text-sm font-semibold text-slate-800">Recent Campaign Runs</h3>
                  <div className="max-h-60 overflow-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                          <th className="px-2 py-2">Type</th>
                          <th className="px-2 py-2">Status</th>
                          <th className="px-2 py-2">Coupon</th>
                          <th className="px-2 py-2">Targets</th>
                          <th className="px-2 py-2">Revenue</th>
                          <th className="px-2 py-2">Created</th>
                          <th className="px-2 py-2">QA</th>
                        </tr>
                      </thead>
                      <tbody>
                        {campaignRuns.map((row) => (
                          <tr key={row.id} className="border-b border-slate-100">
                            <td className="px-2 py-2 font-medium text-slate-800">{row.campaign_type}</td>
                            <td className="px-2 py-2 text-slate-700">{row.status}</td>
                            <td className="px-2 py-2 text-emerald-700">{row.coupon_code || "-"}</td>
                            <td className="px-2 py-2 text-slate-700">{row.targeted_count}</td>
                            <td className="px-2 py-2 text-slate-700">{row.attributed_revenue.toFixed(2)}</td>
                            <td className="px-2 py-2 text-slate-500">{new Date(row.created_at).toLocaleString("en-IN")}</td>
                            <td className="px-2 py-2 text-slate-600">
                              <details>
                                <summary className="cursor-pointer text-xs font-semibold text-slate-700">View</summary>
                                <div className="mt-2 w-72 space-y-2 rounded-md border border-slate-200 bg-slate-50 p-2">
                                  <div className="text-xs text-slate-700">
                                    <span className="font-semibold">Offer campaign:</span> {row.offer_campaign_id || "-"}
                                  </div>
                                  <pre className="overflow-auto rounded bg-white p-2 text-[10px] text-slate-700">
                                    {JSON.stringify(row.segment_filter || {}, null, 2)}
                                  </pre>
                                </div>
                              </details>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
            </section>
          )}

          {activeTab === 'flags' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <h2 className="text-base font-semibold text-slate-900">Feature Flags</h2>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm lg:max-w-xs"
                placeholder="Search module"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {loading && !opsError ? (
              <div className="py-6 text-sm text-slate-500">Loading feature flags...</div>
            ) : opsError ? (
              <div className="py-6 text-sm text-rose-700">
                Unable to load feature flags: {opsError}. Please re-login as owner/manager and refresh.
              </div>
            ) : filteredFlags.length === 0 ? (
              <div className="py-6 text-sm text-slate-500">No feature flags found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-2 py-2">Module</th>
                      <th className="px-2 py-2">Status</th>
                      <th className="px-2 py-2">Rollout</th>
                      <th className="px-2 py-2">Updated</th>
                      <th className="px-2 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFlags.map((flag) => {
                      const moduleLabel = {
                        inventory_advanced: "Advanced Inventory",
                        multi_branch_control: "Multi-Branch Control",
                        smart_kot_routing: "Smart KOT Routing",
                        offline_pos_sync: "Offline POS Sync",
                        crm_loyalty: "CRM & Loyalty",
                        campaign_automation: "Campaign Automation",
                        dynamic_offers_engine: "Dynamic Offers Engine",
                        delivery_optimizer: "Delivery Optimizer",
                        daily_pnl_monitoring: "Daily P&L Monitoring",
                        approval_workflows: "Approval Workflows",
                      }[flag.module_key] || flag.module_key;

                      return (
                      <tr key={flag.module_key} className="border-b border-slate-100">
                        <td className="px-2 py-2 font-medium text-slate-900">{moduleLabel}</td>
                        <td className="px-2 py-2">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${
                              flag.enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {flag.enabled ? "Enabled" : "Disabled"}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-slate-700">{rolloutBadgeText(flag.rollout_percent)}</td>
                        <td className="px-2 py-2 text-slate-600">{new Date(flag.updated_at).toLocaleString("en-IN")}</td>
                        <td className="px-2 py-2">
                          <button
                            type="button"
                            onClick={() => void toggleFlag(flag)}
                            disabled={saving === flag.module_key}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                          >
                            {saving === flag.module_key ? "Saving..." : flag.enabled ? "Disable" : "Enable"}
                          </button>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
              <ShieldCheck className="h-4 w-4" /> Permission Matrix Snapshot
            </div>
            {loading && !opsError ? (
              <div className="py-6 text-sm text-slate-500">Loading permissions...</div>
            ) : opsError ? (
              <div className="py-6 text-sm text-rose-700">
                Unable to load permissions: {opsError}. Permission data requires owner/manager access.
              </div>
            ) : Object.keys(groupedPermissions).length === 0 ? (
              <div className="py-6 text-sm text-slate-500">No permission records found.</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {Object.entries(groupedPermissions).map(([role, list]) => (
                  <article key={role} className="rounded-xl border border-slate-200 p-3">
                    <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">{role}</h3>
                    <ul className="space-y-2">
                       {list.map((item) => {
                         const label = {
                           "ops.flags.read": "View Feature Flags",
                           "ops.flags.write": "Toggle Feature Flags",
                           "ops.permissions.read": "View Permissions",
                           "ops.permissions.write": "Edit Permissions",
                           "ops.idempotency.read": "View API Idempotency Logs",
                           "ops.idempotency.cleanup": "Flush API Locks",
                         }[item.action_key] || item.action_key;

                         return (
                        <li key={`${item.role_key}-${item.action_key}`} className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-slate-700">{label}</span>
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${
                              item.allowed ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            {item.allowed ? "Allowed" : "Denied"}
                          </span>
                        </li>
                         );
                      })}
                    </ul>
                  </article>
                ))}
              </div>
            )}
          </section>
          </div>
          )}
        </div>
      </div>
    </div>
  </div>
  );
}
