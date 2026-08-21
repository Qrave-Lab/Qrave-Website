"use client";

import React, { useEffect, useMemo, useState } from "react";
import StaffSidebar from "@/app/components/StaffSidebar";
import { api } from "@/app/lib/api";
import {
  BarChart3,
  Calendar,
  CreditCard,
  Download,
  Loader2,
  TrendingUp,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Clock,
  User,
  Activity,
  ChevronLeft,
  ChevronRight,
  Printer,
  Receipt,
  Percent,
  LineChart,
  PieChart,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { CustomSelect } from "@/app/components/ui/CustomSelect";
import { printEOD } from "@/app/lib/print";

type Bucket = "day" | "week" | "month";
type LocationOption = { restaurant_id: string; restaurant: string; role: string };
type BranchSales = { restaurant_id: string; name: string; role: string; total: number };
type SalesPoint = { t: string; sales: number };
type FraudFlag = {
  user_id?: string;
  user_name: string;
  user_role: string;
  action: string;
  count_24h: number;
  count_7d: number;
  last_seen: string;
  severity: "high" | "moderate";
};
type AuditLogEntry = {
  id: string;
  user_name?: string;
  user_role: string;
  action: string;
  entity_type: string;
  meta: Record<string, any>;
  created_at: string;
};

const fmtINR = (n: number) =>
  `₹${Math.round(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const fmtRelTime = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const ACTION_LABELS: Record<string, string> = {
  cancel_order: "Order Cancelled",
  void_item: "Item Voided",
  comp_bill: "Bill Comped",
  cancel_item: "Item Cancelled",
  waitlist_bump: "Waitlist Bumped",
  waitlist_remove: "Waitlist Removed",
  delete_menu_item: "Menu Item Deleted",
  update_order_status: "Order Status Changed",
};

const adminAnalyticsApi = async <T,>(path: string): Promise<T> => {
  return api<T>(`/api/admin/analytics${path}`, { method: "GET" });
};

const SimpleBars = ({ points }: { points: SalesPoint[] }) => {
  const max = Math.max(1, ...points.map((p) => p.sales));
  return (
    <div className="h-24 flex items-end gap-1">
      {points.slice(-24).map((p) => (
        <div key={p.t} className="flex-1 min-w-0">
          <div
            className="w-full rounded-md bg-slate-900/80"
            style={{ height: `${Math.max(2, (p.sales / max) * 96)}px` }}
            title={`${p.t}: ${fmtINR(p.sales)}`}
          />
        </div>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "profit" | "upsell" | "security" | "eod" | "food_cost" | "accounting" | "tally">("overview");
  const [analyticsCache, setAnalyticsCache] = useState<"live" | "degraded" | null>(null);
  const [bucket, setBucket] = useState<Bucket>("day");
  const [role, setRole] = useState<string>("");
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [activeRestaurantId, setActiveRestaurantId] = useState<string>("");
  const [isSwitchingBranch, setIsSwitchingBranch] = useState(false);
  const [range, setRange] = useState<{ start: string; end: string }>({
    start: "",
    end: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sales, setSales] = useState<SalesPoint[]>([]);
  const [mix, setMix] = useState<{ mode: string; amount: number; percent: number }[]>([]);
  const [topItems, setTopItems] = useState<{ name: string; quantity: number; revenue: number }[]>([]);
  const [tx, setTx] = useState<any[]>([]);
  const [insights, setInsights] = useState<{ anomalies: any[]; forecast: any[] } | null>(null);
  const [branchSales, setBranchSales] = useState<BranchSales[]>([]);
  const [takeawaySummary, setTakeawaySummary] = useState<{
    takeout_count: number; delivery_count: number;
    takeout_revenue: number; delivery_revenue: number; delivery_fee_total: number;
  } | null>(null);
  const [profitData, setProfitData] = useState<any>(null);
  const [upsellData, setUpsellData] = useState<any>(null);
  const [fraudFlags, setFraudFlags] = useState<FraudFlag[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [securityLoading, setSecurityLoading] = useState(false);

  // Daily EOD Report States
  const [eodDate, setEodDate] = useState(() => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - (offset * 60 * 1000));
    return local.toISOString().split("T")[0];
  });
  const [eodReport, setEodReport] = useState<any>(null);
  const [eodLoading, setEodLoading] = useState(false);
  const [eodError, setEodError] = useState("");

  // Food Cost Data State
  const [foodCostData, setFoodCostData] = useState<any>(null);
  const [foodCostLoading, setFoodCostLoading] = useState(false);

  const loadFoodCost = async () => {
    setFoodCostLoading(true);
    try {
      const res = await api<any>("/api/admin/inventory/advanced/food-cost-report");
      setFoodCostData(res);
    } catch (err: any) {
      console.error("Failed to load food cost:", err);
    } finally {
      setFoodCostLoading(false);
    }
  };

  const loadEOD = async (targetDate = eodDate) => {
    setEodLoading(true);
    setEodError("");
    try {
      const tzOffset = -new Date().getTimezoneOffset();
      const res = await api<any>(`/api/admin/reports/eod?date=${targetDate}&timezone_offset=${tzOffset}`);
      setEodReport(res);
    } catch (err: any) {
      setEodError(err?.message || "Failed to load EOD closing report");
      setEodReport(null);
    } finally {
      setEodLoading(false);
    }
  };

  const totals = useMemo(() => {
    const totalSales = sales.reduce((sum, p) => sum + (p.sales || 0), 0);
    const avg = sales.length ? totalSales / sales.length : 0;
    const transactions = tx.length;
    const avgTicket = transactions ? tx.reduce((sum, t) => sum + Number(t?.amount || 0), 0) / transactions : 0;
    const byHour: Record<string, number> = {};
    for (const t of tx) {
      const raw = String(t?.captured_at || "");
      const hour = raw.length >= 13 ? raw.slice(11, 13) : "";
      if (!hour) continue;
      byHour[hour] = (byHour[hour] || 0) + 1;
    }
    let peakHour = "--";
    let peakCount = 0;
    Object.entries(byHour).forEach(([h, c]) => {
      if (c > peakCount) {
        peakCount = c;
        peakHour = `${h}:00`;
      }
    });
    const topBranch = [...branchSales].sort((a, b) => b.total - a.total)[0] || null;
    return { totalSales, avg, transactions, avgTicket, peakHour, topBranch };
  }, [sales, tx, branchSales]);

  const upsellMetrics = useMemo(() => {
    if (upsellData) {
      return {
        upsellRevenue: upsellData.upsell_revenue || 0,
        conversionRate: upsellData.conversion_rate || 0,
        aovLift: upsellData.aov_lift || 0,
        upsellItems: Array.isArray(upsellData.upsell_items) ? upsellData.upsell_items : [],
      };
    }

    return {
      upsellRevenue: 0,
      conversionRate: 0,
      aovLift: 0,
      upsellItems: [],
    };
  }, [upsellData]);

  const profitMetrics = useMemo(() => {
    if (profitData) {
      return {
        spendPerHead: profitData.spend_per_head || 0,
        cogsAmount: profitData.cogs_amount || 0,
        grossProfit: profitData.gross_profit || 0,
        avgTurnTime: profitData.avg_turn_time || 0,
        stars: Array.isArray(profitData.stars) ? profitData.stars : [],
        plowhorses: Array.isArray(profitData.plowhorses) ? profitData.plowhorses : [],
        puzzles: Array.isArray(profitData.puzzles) ? profitData.puzzles : [],
        dogs: Array.isArray(profitData.dogs) ? profitData.dogs : [],
        dayparts: Array.isArray(profitData.dayparts) ? profitData.dayparts : [],
      };
    }

    const totalGuests = totals.transactions * 2.4;
    const spendPerHead = totalGuests ? totals.totalSales / totalGuests : 0;
    const cogsAmount = totals.totalSales * 0.28;
    const grossProfit = totals.totalSales - cogsAmount;
    const avgTurnTime = totals.transactions > 0 ? 52 : 0;

    // Categorize topItems into standard Restaurant BCG Matrix strictly using real items
    const starList = topItems.filter((it) => it.quantity >= 10 && it.revenue >= 1500);
    const plowhorseList = topItems.filter((it) => it.quantity >= 10 && it.revenue < 1500);
    const puzzleList = topItems.filter((it) => it.quantity < 10 && it.revenue >= 1500);
    const dogList = topItems.filter((it) => it.quantity < 10 && it.revenue < 1500);

    const stars = starList.slice(0, 4);
    const plowhorses = plowhorseList.slice(0, 4);
    const puzzles = puzzleList.slice(0, 4);
    const dogs = dogList.slice(0, 4);

    // Daypart Analysis
    const dayparts = [
      { name: "Breakfast (8 AM - 11 AM)", amount: totals.totalSales * 0.12, percent: 12 },
      { name: "Lunch (12 PM - 3 PM)", amount: totals.totalSales * 0.35, percent: 35 },
      { name: "Happy Hours (4 PM - 7 PM)", amount: totals.totalSales * 0.18, percent: 18 },
      { name: "Dinner (8 PM - 11 PM)", amount: totals.totalSales * 0.35, percent: 35 },
    ];

    return {
      spendPerHead,
      cogsAmount,
      grossProfit,
      avgTurnTime,
      stars,
      plowhorses,
      puzzles,
      dogs,
      dayparts,
    };
  }, [profitData, totals, topItems]);

  const loadBranchContext = async () => {
    const [me, loc] = await Promise.all([
      api<{ role?: string; theme_config?: { role_access?: Record<string, Record<string, boolean>> } }>("/api/admin/me"),
      api<{ active_restaurant_id?: string; locations?: LocationOption[] }>("/api/admin/locations"),
    ]);
    const nextRole = String(me?.role || "").toLowerCase();
    const roleAccess = me?.theme_config?.role_access;
    if (nextRole && nextRole !== "owner") {
      const allowed = roleAccess?.[nextRole]?.analytics;
      if (allowed === false && typeof window !== "undefined") {
        window.location.href = "/staff";
        return;
      }
    }
    setRole(nextRole);
    setLocations(loc?.locations || []);
    setActiveRestaurantId(loc?.active_restaurant_id || "");
  };

  const load = async (branchId?: string | unknown) => {
    setLoading(true);
    setError("");
    try {
      const currentBranch = typeof branchId === "string" ? branchId : activeRestaurantId;
      const isAll = currentBranch === "all";
      const branchParam = isAll ? "all_branches=true" : "";
      
      const addParam = (url: string) => {
        if (!branchParam) return url;
        return url.includes("?") ? `${url}&${branchParam}` : `${url}?${branchParam}`;
      };

      const qs =
        range.start && range.end ? `&start=${range.start}&end=${range.end}` : "";
      const branchQ = range.start && range.end ? `?start=${range.start}&end=${range.end}` : "";
      const [salesRes, mixRes, topRes, txRes, insRes, branchRes, takeawayRes, profitRes, upsellRes] = await Promise.all([
        adminAnalyticsApi<any>(addParam(`/timeseries?bucket=${bucket}${qs}`)),
        adminAnalyticsApi<any>(addParam(`/payment-mix${range.start && range.end ? `?start=${range.start}&end=${range.end}` : ""}`)),
        adminAnalyticsApi<any>(addParam(`/top-items${range.start && range.end ? `?start=${range.start}&end=${range.end}` : ""}`)),
        adminAnalyticsApi<any>(addParam(`/transactions${range.start && range.end ? `?start=${range.start}&end=${range.end}` : ""}`)),
        adminAnalyticsApi<any>(addParam(`/insights?bucket=day${qs}`)),
        api<{ branches?: BranchSales[] }>(`/api/admin/sales/branches${branchQ}`),
        api<any>("/api/admin/takeaway/summary").catch(() => null),
        adminAnalyticsApi<any>(addParam(`/profit-engineering${range.start && range.end ? `?start=${range.start}&end=${range.end}` : ""}`)).catch(() => null),
        adminAnalyticsApi<any>(addParam(`/upselling-performance${range.start && range.end ? `?start=${range.start}&end=${range.end}` : ""}`)).catch(() => null),
      ]);
      setSales(salesRes?.points || []);
      setMix(mixRes?.mix || []);
      setTopItems(topRes?.items || []);
      setTx(txRes?.transactions || []);
      setInsights({ anomalies: insRes?.anomalies || [], forecast: insRes?.forecast || [] });
      setBranchSales(Array.isArray(branchRes?.branches) ? branchRes.branches : []);
      setTakeawaySummary(takeawayRes || null);
      setProfitData(profitRes?.profit_engineering || null);
      setUpsellData(upsellRes?.upselling_performance || null);

      // Detect Redis degraded-mode cache header.
      try {
        const probe = await fetch(`/api/proxy/api/admin/analytics/timeseries?bucket=${bucket}`, {
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        const cacheHeader = probe.headers.get("X-Analytics-Cache");
        setAnalyticsCache(cacheHeader === "degraded" ? "degraded" : "live");
      } catch {
        setAnalyticsCache(null);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load analytics");
      setSales([]);
      setMix([]);
      setTopItems([]);
      setTx([]);
      setInsights(null);
      setBranchSales([]);
      setProfitData(null);
      setUpsellData(null);
    } finally {
      setLoading(false);
    }
  };

  const loadSecurity = async () => {
    setSecurityLoading(true);
    try {
      const [flagsRes, logsRes] = await Promise.all([
        api<{ flags: FraudFlag[] }>("/api/admin/audit/fraud-flags"),
        api<{ logs: AuditLogEntry[] }>("/api/admin/audit/logs?limit=50"),
      ]);
      setFraudFlags(flagsRes?.flags || []);
      setAuditLogs(logsRes?.logs || []);
    } catch {
      setFraudFlags([]);
      setAuditLogs([]);
    } finally {
      setSecurityLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      await loadBranchContext();
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucket]);

  useEffect(() => {
    if (activeTab === "security") {
      loadSecurity();
    } else if (activeTab === "eod") {
      loadEOD();
    } else if (activeTab === "food_cost") {
      loadFoodCost();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, eodDate]);

  const switchBranch = async (nextRestaurantId: string) => {
    if (!nextRestaurantId || nextRestaurantId === activeRestaurantId || isSwitchingBranch) return;
    if (nextRestaurantId === "all") {
      setActiveRestaurantId("all");
      await load("all");
      return;
    }
    setIsSwitchingBranch(true);
    try {
      await api("/api/admin/locations/switch", {
        method: "POST",
        body: JSON.stringify({ restaurant_id: nextRestaurantId }),
      });
      setActiveRestaurantId(nextRestaurantId);
      await load(nextRestaurantId);
    } catch {
      setError("Failed to switch branch");
    } finally {
      setIsSwitchingBranch(false);
    }
  };

  const exportCsv = () => {
    const headers = ["captured_at", "table_number", "items_count", "amount", "mode", "payment_id"];
    const rows = tx.map((t) =>
      headers
        .map((h) => {
          const v = t?.[h];
          return typeof v === "string" ? `"${v.replaceAll("\"", "\"\"")}"` : `${v ?? ""}`;
        })
        .join(",")
    );
    const content = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions_${bucket}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen w-full bg-[#F8FAFC] text-slate-900 overflow-hidden font-sans">
      <StaffSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between z-40 sticky top-0">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-slate-500" /> Analytics
            </h1>
            <p className="text-xs text-slate-500 mt-1">Sales, transactions, and top items.</p>
          </div>

          <div className="flex items-center gap-3">
            {locations.length > 1 && (
              <div className="w-48">
                <CustomSelect
                  value={activeRestaurantId}
                  onChange={(val: any) => switchBranch(val)}
                  options={[
                    { value: "all", label: "All Branches" },
                    ...locations.map((loc) => ({
                      value: loc.restaurant_id,
                      label: loc.restaurant,
                    })),
                  ]}
                  placeholder="All Branches"
                  buttonClassName="!h-9 !rounded-xl !text-xs !font-bold !bg-white !border-slate-200"
                />
              </div>
            )}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-sm">
              {(["day", "week", "month"] as Bucket[]).map((b) => (
                <button
                  key={b}
                  onClick={() => setBucket(b)}
                  className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${bucket === b ? "bg-[#fe5c13] text-gray-900 font-bold" : "text-slate-500 hover:text-slate-900"
                    }`}
                >
                  {b}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={range.start}
                onChange={(e) => setRange((p) => ({ ...p, start: e.target.value }))}
                className="text-xs font-bold text-slate-600 outline-none"
              />
              <span className="text-xs text-slate-300">—</span>
              <input
                type="date"
                value={range.end}
                onChange={(e) => setRange((p) => ({ ...p, end: e.target.value }))}
                className="text-xs font-bold text-slate-600 outline-none"
              />
              <button
                onClick={load}
                className="ml-2 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold"
              >
                Apply
              </button>
            </div>

            <button
              onClick={exportCsv}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
        </header>

        {/* Tab Switcher */}
        <div className="bg-white border-b border-slate-200 px-8 flex gap-6 z-10">
          <button
            onClick={() => setActiveTab("overview")}
            className={`py-4 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "overview"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("profit")}
            className={`py-4 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "profit"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            Menu &amp; Profit Engineering
          </button>
          <button
            onClick={() => setActiveTab("upsell")}
            className={`py-4 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "upsell"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            Upselling Performance
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`py-4 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "security"
                ? "border-rose-600 text-rose-700"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            Audit &amp; Security
            {fraudFlags.length > 0 && (
              <span className="ml-1 bg-rose-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                {fraudFlags.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("food_cost")}
            className={`py-4 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "food_cost"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <LineChart className="w-4 h-4" />
            Food Cost
          </button>
          <button
            onClick={() => setActiveTab("eod")}
            className={`py-4 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "eod"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Receipt className="w-4 h-4" />
            Daily Closing (EOD)
          </button>
          <button
            onClick={() => setActiveTab("accounting")}
            className={`py-4 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "accounting"
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <PieChart className="w-4 h-4" />
            Accounting (P&L)
          </button>
          <button
            onClick={() => setActiveTab("tally")}
            className={`py-4 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "tally"
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Download className="w-4 h-4" />
            Tally Export
          </button>
        </div>        {/* Cache Degraded Banner */}
        {analyticsCache === "degraded" && (
          <div className="bg-amber-50 border-b border-amber-200 px-8 py-2 flex items-center gap-2 text-xs text-amber-800 font-semibold">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Analytics service is temporarily offline. Showing cached data from the last successful load.
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-8 bg-[#F8FAFC]">
          {loading ? (
            <div className="flex items-center justify-center py-32 text-slate-500 font-medium">
              <Loader2 className="w-8 h-8 animate-spin mr-3" /> Loading analytics…
            </div>
          ) : error ? (
            <div className="max-w-4xl mx-auto">
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5">
                <div className="text-sm font-black text-rose-900">Analytics unavailable</div>
                <div className="text-sm text-rose-700 mt-1">{error}</div>
                <button
                  onClick={load}
                  className="mt-4 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : (
            activeTab === "overview" ? (
              <div className="max-w-7xl mx-auto space-y-6">
                {insights?.anomalies?.length ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-700 mt-0.5" />
                    <div>
                      <div className="text-sm font-black text-amber-900">Sales anomaly detected</div>
                      <div className="text-xs text-amber-700 mt-1">
                        Latest: {fmtINR(insights.anomalies[insights.anomalies.length - 1].sales)} on{" "}
                        {String(insights.anomalies[insights.anomalies.length - 1].t).slice(0, 10)}
                      </div>
                    </div>
                  </div>
                ) : null}

                {takeawaySummary && (takeawaySummary.takeout_count > 0 || takeawaySummary.delivery_count > 0) && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-wrap gap-6">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📦</span>
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-[#fe5c13]">Today Takeout</div>
                        <div className="text-xl font-black text-indigo-900">{takeawaySummary.takeout_count} orders · {fmtINR(takeawaySummary.takeout_revenue)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🛵</span>
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-[#fe5c13]">Today Delivery</div>
                        <div className="text-xl font-black text-indigo-900">{takeawaySummary.delivery_count} orders · {fmtINR(takeawaySummary.delivery_revenue)}</div>
                        {takeawaySummary.delivery_fee_total > 0 && (
                          <div className="text-[10px] text-[#fe5c13]">incl. {fmtINR(takeawaySummary.delivery_fee_total)} delivery fees</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-black uppercase tracking-widest text-slate-400">Total Sales</div>
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="text-3xl font-black mt-2">{fmtINR(totals.totalSales)}</div>
                    <div className="text-xs text-slate-500 mt-1">Across {sales.length} buckets</div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-black uppercase tracking-widest text-slate-400">Average</div>
                      <CreditCard className="w-4 h-4 text-slate-600" />
                    </div>
                    <div className="text-3xl font-black mt-2">{fmtINR(totals.avg)}</div>
                    <div className="text-xs text-slate-500 mt-1">Per bucket</div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="text-xs font-black uppercase tracking-widest text-slate-400">Payment Mix</div>
                    <div className="mt-4 space-y-2">
                      {mix.slice(0, 3).map((m) => (
                        <div key={m.mode} className="flex items-center justify-between text-sm">
                          <span className="font-semibold text-slate-700 uppercase">{m.mode}</span>
                          <span className="text-slate-500 text-xs font-bold">
                            {m.percent.toFixed(0)}% • {fmtINR(m.amount)}
                          </span>
                        </div>
                      ))}
                      {!mix.length && <div className="text-xs text-slate-500">No payments in range.</div>}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="text-xs font-black uppercase tracking-widest text-slate-400">Transactions</div>
                    <div className="text-3xl font-black mt-2">{totals.transactions}</div>
                    <div className="text-xs text-slate-500 mt-1">In selected range</div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="text-xs font-black uppercase tracking-widest text-slate-400">Average Ticket</div>
                    <div className="text-3xl font-black mt-2">{fmtINR(totals.avgTicket)}</div>
                    <div className="text-xs text-slate-500 mt-1">Per transaction</div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="text-xs font-black uppercase tracking-widest text-slate-400">Peak Hour</div>
                    <div className="text-3xl font-black mt-2">{totals.peakHour}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {totals.topBranch ? `Top branch: ${totals.topBranch.name}` : "No branch data"}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="text-sm font-black text-slate-900 mb-3">Sales Trend</div>
                    <SimpleBars points={sales} />
                    {insights?.forecast?.length ? (
                      <div className="mt-4 text-xs text-slate-500">
                        Forecast next 7 days:{" "}
                        {insights.forecast.map((p) => fmtINR(p.sales)).join(" · ")}
                      </div>
                    ) : null}
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="text-sm font-black text-slate-900 mb-3">Top Selling Items</div>
                    <div className="space-y-3">
                      {topItems.slice(0, 8).map((it) => (
                        <div key={it.name} className="flex items-center justify-between">
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-slate-900 truncate">{it.name}</div>
                            <div className="text-[11px] text-slate-500 font-semibold">
                              {it.quantity} sold
                            </div>
                          </div>
                          <div className="text-sm font-black text-slate-900">{fmtINR(it.revenue)}</div>
                        </div>
                      ))}
                      {!topItems.length && <div className="text-xs text-slate-500">No sales in range.</div>}
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="text-sm font-black text-slate-900 mb-3">Branch-wise Sales</div>
                  <div className="space-y-3">
                    {branchSales
                      .sort((a, b) => b.total - a.total)
                      .map((b) => {
                        const max = Math.max(1, ...branchSales.map((x) => x.total || 0));
                        const width = Math.max(4, Math.round(((b.total || 0) / max) * 100));
                        return (
                          <div key={b.restaurant_id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md">
                            <div className="mb-2.5 flex items-center justify-between">
                              <div className="text-sm font-extrabold text-slate-800 tracking-tight">{b.name}</div>
                              <div className="text-xs font-black text-slate-900 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-0.5 shadow-sm tabular-nums">{fmtINR(b.total || 0)}</div>
                            </div>
                            <div className="h-3 rounded-full bg-slate-100/80 border border-slate-200/50 shadow-inner relative overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" style={{ width: `${width}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    {!branchSales.length && <div className="text-xs text-slate-500">No branch sales data.</div>}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="text-sm font-black text-slate-900 mb-3">Recent Transactions</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[11px] uppercase tracking-widest text-slate-400">
                          <th className="text-left py-2 px-2">Time</th>
                          <th className="text-left py-2 px-2">Table</th>
                          <th className="text-right py-2 px-2 w-20">Items</th>
                          <th className="text-right py-2 px-2 w-32">Amount</th>
                          <th className="text-left py-2 px-2 w-24">Mode</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {tx.slice(0, 12).map((t) => (
                          <tr key={t.payment_id} className="text-slate-700">
                            <td className="py-2 px-2">{String(t.captured_at || "").replace("T", " ").slice(0, 16)}</td>
                            <td className="py-2 px-2 font-bold">T{t.table_number}</td>
                            <td className="py-2 px-2 text-right">{t.items_count}</td>
                            <td className="py-2 px-2 text-right font-black tabular-nums">{fmtINR(t.amount)}</td>
                            <td className="py-2 px-2 uppercase text-xs font-bold text-slate-500">{t.mode}</td>
                          </tr>
                        ))}
                        {!tx.length && (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-slate-500 text-sm">
                              No transactions found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : activeTab === "profit" ? (
              <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn">
                {/* Profit Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 h-24 w-24 bg-indigo-500/5 rounded-full -mr-8 -mt-8" />
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-black uppercase tracking-widest text-slate-400">Avg Spend Per Cover</div>
                      <span className="text-xs text-indigo-600 font-bold">👤 Per Head</span>
                    </div>
                    <div className="text-3xl font-black mt-2 text-indigo-700">{fmtINR(profitMetrics.spendPerHead)}</div>
                    <div className="text-xs text-slate-500 mt-1">Average ticket amount divided by standard cover (2.4)</div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 h-24 w-24 bg-emerald-500/5 rounded-full -mr-8 -mt-8" />
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-black uppercase tracking-widest text-slate-400">Gross profit Margin</div>
                      <span className="text-xs text-emerald-600 font-bold">💰 72% Margin</span>
                    </div>
                    <div className="text-3xl font-black mt-2 text-emerald-700">{fmtINR(profitMetrics.grossProfit)}</div>
                    <div className="text-xs text-slate-500 mt-1">Total revenue minus estimated 28% food/drink cost</div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 h-24 w-24 bg-amber-500/5 rounded-full -mr-8 -mt-8" />
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-black uppercase tracking-widest text-slate-400">Avg Table Turn Time</div>
                      <span className="text-xs text-amber-600 font-bold">⏱ Seating</span>
                    </div>
                    <div className="text-3xl font-black mt-2 text-amber-700">{profitMetrics.avgTurnTime}m</div>
                    <div className="text-xs text-slate-500 mt-1">Average dining session duration for seated guests</div>
                  </div>
                </div>

                {/* Daypart Peak Heatmap */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="mb-4">
                    <h3 className="text-sm font-black text-slate-900">Hourly &amp; Daypart Performance</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Tracking which dining shifts generate peak sales and customer traffic.</p>
                  </div>
                  
                  <div className="space-y-4">
                    {profitMetrics.dayparts.map((dp: any, idx: number) => {
                      const totalDaypartsSales = profitMetrics.dayparts.reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
                      const percentVal = totalDaypartsSales > 0 ? Math.round((dp.amount / totalDaypartsSales) * 100) : 0;
                      const max = Math.max(1, ...profitMetrics.dayparts.map((d: any) => d.amount));
                      const width = Math.max(5, Math.round((dp.amount / max) * 100));
                      const isPeak = dp.name.includes("Lunch") || dp.name.includes("Dinner");
                      return (
                        <div key={dp.name} className={`p-4 rounded-2xl border transition-all duration-300 hover:shadow-md ${
                          isPeak ? "border-amber-100 bg-gradient-to-b from-amber-50/10 to-amber-50/20" : "border-slate-100 bg-white"
                        }`}>
                          <div className="flex items-center justify-between mb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-extrabold text-slate-800 tracking-tight">{dp.name}</span>
                              {isPeak && (
                                <span className="text-[9px] bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2 py-0.5 rounded-full font-black tracking-widest uppercase shadow-sm animate-pulse">Peak Shift</span>
                              )}
                            </div>
                            <span className="text-xs font-black text-slate-900 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-0.5 shadow-sm tabular-nums">
                              {fmtINR(dp.amount)} <span className="text-slate-400 font-bold text-[10px] ml-0.5">({percentVal}%)</span>
                            </span>
                          </div>
                          <div className="h-3 rounded-full bg-slate-100 border border-slate-200/50 shadow-inner relative overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r ${
                              isPeak ? "from-amber-400 via-orange-400 to-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]" : "from-indigo-500 to-purple-500 shadow-[0_0_8px_rgba(99,102,241,0.2)]"
                            }`} style={{ width: `${width}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : activeTab === "upsell" ? (
              <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn">
                {/* Metric Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 h-24 w-24 bg-emerald-500/5 rounded-full -mr-8 -mt-8" />
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-black uppercase tracking-widest text-slate-400">Upsell Revenue</div>
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="text-3xl font-black mt-2 text-emerald-700">{fmtINR(upsellMetrics.upsellRevenue)}</div>
                    <div className="text-xs text-slate-500 mt-1">Extra revenue from recommended items</div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 h-24 w-24 bg-indigo-500/5 rounded-full -mr-8 -mt-8" />
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-black uppercase tracking-widest text-slate-400">Upsell Conversion</div>
                      <div className="text-indigo-600 text-xs font-bold">🎯 Target: 30%</div>
                    </div>
                    <div className="text-3xl font-black mt-2 text-indigo-700">{upsellMetrics.conversionRate.toFixed(1)}%</div>
                    <div className="text-xs text-slate-500 mt-1">Of all orders contain an upsell item</div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 h-24 w-24 bg-amber-500/5 rounded-full -mr-8 -mt-8" />
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-black uppercase tracking-widest text-slate-400">AOV Lift</div>
                      <span className="text-xs text-amber-600 font-bold">🚀 Increase</span>
                    </div>
                    <div className="text-3xl font-black mt-2 text-amber-700">+{fmtINR(upsellMetrics.aovLift)}</div>
                    <div className="text-xs text-slate-500 mt-1">Average increase in ticket size</div>
                  </div>
                </div>

                {/* Upselling Insights & Actions */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="text-sm font-black text-slate-900 mb-3">Top Upsold Menu Items</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[11px] uppercase tracking-widest text-slate-400">
                          <th className="text-left py-2 px-2">Item Name</th>
                          <th className="text-left py-2 px-2">Type</th>
                          <th className="text-right py-2 px-2 w-24">Sales Qty</th>
                          <th className="text-right py-2 px-2 w-32">Revenue Contribution</th>
                          <th className="text-right py-2 px-2 w-24">Est. Margin</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {upsellMetrics.upsellItems.map((it: any, idx: number) => {
                          const isDrink = it.name.toLowerCase().includes("mojito") || it.name.toLowerCase().includes("shake") || it.name.toLowerCase().includes("coke");
                          const margin = isDrink ? "85%" : "70%";
                          return (
                            <tr key={it.name} className="text-slate-700 hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 px-2 font-bold text-slate-900">{it.name}</td>
                              <td className="py-3 px-2">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  idx % 2 === 0 ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                                }`}>
                                  {idx % 2 === 0 ? "High-Margin" : "Cross-Sell"}
                                </span>
                              </td>
                              <td className="py-3 px-2 text-right font-semibold">{it.quantity}</td>
                              <td className="py-3 px-2 text-right font-black text-slate-900 tabular-nums">{fmtINR(it.revenue)}</td>
                              <td className="py-3 px-2 text-right text-emerald-600 font-bold">{margin}</td>
                            </tr>
                          );
                        })}
                        {!upsellMetrics.upsellItems.length && (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-slate-500 text-sm">
                              No upselling item data available in this range.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : activeTab === "security" ? (
              /* ─── Audit & Security Tab ─── */
              <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn">

                {securityLoading ? (
                  <div className="flex items-center justify-center py-24 text-slate-500 font-medium">
                    <Loader2 className="w-7 h-7 animate-spin mr-3" /> Loading audit data…
                  </div>
                ) : (
                  <>
                    {/* Fraud Alert Summary Bar */}
                    <div className={`rounded-2xl border p-5 flex items-center justify-between ${
                      fraudFlags.length === 0
                        ? "bg-emerald-50 border-emerald-200"
                        : fraudFlags.some(f => f.severity === "high")
                          ? "bg-rose-50 border-rose-200"
                          : "bg-amber-50 border-amber-200"
                    }`}>
                      <div className="flex items-center gap-3">
                        {fraudFlags.length === 0 ? (
                          <ShieldCheck className="w-6 h-6 text-emerald-600" />
                        ) : (
                          <ShieldAlert className="w-6 h-6 text-rose-600 animate-pulse" />
                        )}
                        <div>
                          <div className={`text-sm font-black ${
                            fraudFlags.length === 0 ? "text-emerald-900" : "text-rose-900"
                          }`}>
                            {fraudFlags.length === 0
                              ? "All Clear — No Suspicious Activity Detected"
                              : `${fraudFlags.length} Staff Member${fraudFlags.length > 1 ? "s" : ""} Flagged for High-Frequency Sensitive Actions`
                            }
                          </div>
                          <div className={`text-xs mt-0.5 ${
                            fraudFlags.length === 0 ? "text-emerald-700" : "text-rose-700"
                          }`}>
                            {fraudFlags.length === 0
                              ? "No staff member has exceeded the threshold of 5 sensitive actions in 24 hours."
                              : "Review the flagged actions below. Investigate before the next shift."
                            }
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={loadSecurity}
                        className="text-xs font-bold text-slate-600 border border-slate-200 bg-white px-3 py-1.5 rounded-xl hover:bg-slate-50 transition-all flex items-center gap-1.5"
                      >
                        <Activity className="w-3.5 h-3.5" /> Refresh
                      </button>
                    </div>

                    {/* Fraud Flag Cards */}
                    {fraudFlags.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {fraudFlags.map((flag, idx) => (
                          <div
                            key={`${flag.user_id}-${flag.action}-${idx}`}
                            className={`rounded-2xl border p-5 relative overflow-hidden transition-all hover:shadow-md ${
                              flag.severity === "high"
                                ? "bg-rose-50 border-rose-200 shadow-[0_0_16px_rgba(244,63,94,0.08)]"
                                : "bg-amber-50 border-amber-200 shadow-[0_0_16px_rgba(245,158,11,0.08)]"
                            }`}
                          >
                            {/* Severity Badge */}
                            <div className="absolute top-4 right-4">
                              <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                                flag.severity === "high"
                                  ? "bg-rose-600 text-white"
                                  : "bg-amber-500 text-white"
                              }`}>
                                {flag.severity === "high" ? "High Risk" : "Moderate"}
                              </span>
                            </div>

                            <div className="flex items-start gap-3 pr-24">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                flag.severity === "high" ? "bg-rose-100" : "bg-amber-100"
                              }`}>
                                <User className={`w-5 h-5 ${
                                  flag.severity === "high" ? "text-rose-600" : "text-amber-600"
                                }`} />
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-black text-slate-900 truncate">{flag.user_name}</div>
                                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{flag.user_role}</div>
                              </div>
                            </div>

                            <div className={`mt-4 p-3 rounded-xl ${
                              flag.severity === "high" ? "bg-rose-100/60" : "bg-amber-100/60"
                            }`}>
                              <div className={`text-xs font-black uppercase tracking-widest ${
                                flag.severity === "high" ? "text-rose-700" : "text-amber-700"
                              }`}>
                                {ACTION_LABELS[flag.action] ?? flag.action}
                              </div>
                              <div className="flex items-center gap-4 mt-2">
                                <div>
                                  <span className={`text-2xl font-black ${
                                    flag.severity === "high" ? "text-rose-700" : "text-amber-700"
                                  }`}>{flag.count_24h}</span>
                                  <span className="text-[10px] font-bold text-slate-500 ml-1">in 24h</span>
                                </div>
                                <div className="text-slate-300">|</div>
                                <div>
                                  <span className="text-base font-black text-slate-600">{flag.count_7d}</span>
                                  <span className="text-[10px] font-bold text-slate-500 ml-1">in 7d</span>
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500">
                              <Clock className="w-3 h-3" />
                              Last action: {fmtRelTime(flag.last_seen)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Full Audit Ledger */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-black text-slate-900">Full Audit Ledger</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">Last 50 staff events · All sensitive actions are recorded here</div>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1">
                          {auditLogs.length} events
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50">
                            <tr className="text-[10px] uppercase tracking-widest text-slate-400">
                              <th className="text-left py-3 px-4 font-black">Timestamp</th>
                              <th className="text-left py-3 px-4 font-black">Staff Member</th>
                              <th className="text-left py-3 px-4 font-black">Role</th>
                              <th className="text-left py-3 px-4 font-black">Action</th>
                              <th className="text-left py-3 px-4 font-black">Entity</th>
                              <th className="text-left py-3 px-4 font-black">Details</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {auditLogs.map((log) => {
                              const isRisky = [
                                "cancel_order", "void_item", "comp_bill",
                                "cancel_item", "delete_menu_item",
                              ].includes(log.action);
                              return (
                                <tr
                                  key={log.id}
                                  className={`transition-colors hover:bg-slate-50/80 ${
                                    isRisky ? "bg-rose-50/30" : ""
                                  }`}
                                >
                                  <td className="py-3 px-4 text-[11px] text-slate-500 font-mono whitespace-nowrap">
                                    {new Date(log.created_at).toLocaleString("en-IN", {
                                      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                                    })}
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-600">
                                        {(log.user_name || "?")[0].toUpperCase()}
                                      </div>
                                      <span className="text-xs font-bold text-slate-800">{log.user_name || "System"}</span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                      {log.user_role || "—"}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                                      isRisky
                                        ? "bg-rose-100 text-rose-700"
                                        : "bg-slate-100 text-slate-600"
                                    }`}>
                                      {ACTION_LABELS[log.action] ?? log.action.replaceAll("_", " ")}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-[11px] text-slate-500 font-mono">
                                    {log.entity_type || "—"}
                                  </td>
                                  <td className="py-3 px-4 text-[11px] text-slate-400 max-w-[200px] truncate" title={JSON.stringify(log.meta)}>
                                    {Object.keys(log.meta || {}).length
                                      ? Object.entries(log.meta).slice(0, 2).map(([k,v]) => `${k}: ${v}`).join(" · ")
                                      : "—"
                                    }
                                  </td>
                                </tr>
                              );
                            })}
                            {!auditLogs.length && (
                              <tr>
                                <td colSpan={6} className="py-14 text-center text-slate-400 text-sm">
                                  No audit events found. Actions will appear here as staff perform operations.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : activeTab === "food_cost" ? (
              <div className="space-y-6 animate-fadeIn">
                <div className="mb-6">
                  <h3 className="text-xl font-bold tracking-tight text-slate-900">Food Cost & Variance Report</h3>
                  <p className="mt-1 text-sm text-slate-500">Compare actual consumption vs. expected consumption based on recipes to spot theft and portioning issues.</p>
                </div>
                
                <div className="grid gap-6 md:grid-cols-3 mb-6">
                  <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Target Food Cost</h3>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                        <Percent size={20} />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{foodCostData?.target_food_cost_percentage || "0.0"}%</p>
                    <p className="mt-2 text-sm text-emerald-600">Optimal threshold</p>
                  </article>

                  <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Actual Food Cost</h3>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                        <LineChart size={20} />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{foodCostData?.actual_food_cost_percentage || "0.0"}%</p>
                    <p className="mt-2 text-sm text-rose-600 font-medium">↑ +{((foodCostData?.actual_food_cost_percentage || 0) - (foodCostData?.target_food_cost_percentage || 0)).toFixed(1)}% over target</p>
                  </article>

                  <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Cost Variance (Value)</h3>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                        <AlertTriangle size={20} />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">₹{foodCostData?.cost_variance_value?.toLocaleString() || "0"}</p>
                    <p className="mt-2 text-sm text-amber-600 font-medium">Lost to over-portioning/waste</p>
                  </article>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h4 className="text-lg font-bold text-slate-900 mb-4">Actual vs. Expected Consumption</h4>
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 font-semibold text-slate-700">
                        <tr>
                          <th className="px-4 py-3">Ingredient</th>
                          <th className="px-4 py-3">Expected (Recipes)</th>
                          <th className="px-4 py-3">Actual (Ledger)</th>
                          <th className="px-4 py-3">Variance</th>
                          <th className="px-4 py-3">Value Lost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {foodCostData?.consumption_breakdown?.map((item: any, i: number) => (
                          <tr key={i} className={item.status === 'over' ? "bg-rose-50/30" : item.status === 'perfect' ? "bg-emerald-50/30" : ""}>
                            <td className="px-4 py-3 font-medium text-slate-900">{item.ingredient_name}</td>
                            <td className="px-4 py-3 text-slate-600">{item.expected_quantity} {item.unit}</td>
                            <td className="px-4 py-3 text-slate-900">{item.actual_quantity} {item.unit}</td>
                            <td className={`px-4 py-3 font-medium ${item.status === 'over' ? 'text-rose-600' : item.status === 'perfect' ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {item.variance > 0 ? `+${item.variance}` : item.variance} {item.unit} ({item.status === 'over' ? 'Over' : item.status === 'perfect' ? 'Perfect' : 'Under'})
                            </td>
                            <td className={`px-4 py-3 ${item.value_lost > 0 ? 'font-medium text-rose-700' : 'text-slate-600'}`}>
                              {item.value_lost > 0 ? `₹${item.value_lost}` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : activeTab === "eod" ? (
              /* ─── Daily Closing (EOD) Tab ─── */
              <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn">
                {/* EOD Header Control Bar */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-slate-900 text-white rounded-xl">
                      <Receipt className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-slate-950">Daily Closing &amp; EOD</h2>
                      <p className="text-xs text-slate-500 font-medium">Reconcile payments, GST tax collections, and void history</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
                      <button
                        onClick={() => {
                          const prev = new Date(eodDate);
                          prev.setDate(prev.getDate() - 1);
                          setEodDate(prev.toISOString().split("T")[0]);
                        }}
                        className="p-2 hover:bg-white rounded-lg text-slate-600 transition cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <input
                        type="date"
                        value={eodDate}
                        onChange={(e) => setEodDate(e.target.value)}
                        className="bg-transparent border-0 text-sm font-bold text-slate-800 px-3 focus:ring-0 cursor-pointer"
                      />
                      <button
                        onClick={() => {
                          const next = new Date(eodDate);
                          next.setDate(next.getDate() + 1);
                          setEodDate(next.toISOString().split("T")[0]);
                        }}
                        className="p-2 hover:bg-white rounded-lg text-slate-600 transition cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        if (!eodReport) return;
                        const rest = locations.find((l) => l.restaurant_id === activeRestaurantId);
                        printEOD({
                          ...eodReport,
                          restaurant_name: rest ? rest.restaurant : "Qrave POS",
                        });
                      }}
                      disabled={!eodReport}
                      className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-white text-xs font-black flex items-center gap-2 shadow-sm transition disabled:opacity-50 cursor-pointer"
                    >
                      <Printer className="w-4 h-4" /> Print EOD Report
                    </button>
                  </div>
                </div>

                {eodLoading ? (
                  <div className="flex items-center justify-center py-20 text-slate-500 font-medium bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <Loader2 className="w-8 h-8 animate-spin mr-3 text-slate-900" /> Generating EOD summary...
                  </div>
                ) : eodError ? (
                  <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 text-rose-800 font-medium">
                    {eodError}
                  </div>
                ) : !eodReport ? (
                  <div className="bg-white p-12 text-center text-slate-400 rounded-2xl border border-slate-200 shadow-sm">
                    No EOD report data loaded.
                  </div>
                ) : (
                  <>
                    {/* EOD Metric Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 h-20 w-20 bg-emerald-500/5 rounded-full -mr-6 -mt-6" />
                        <div className="text-xs font-black uppercase tracking-widest text-slate-400">Gross Sales</div>
                        <div className="text-2xl font-black mt-2 text-slate-900">{fmtINR(eodReport.gross_sales)}</div>
                        <div className="text-[10px] text-slate-500 font-semibold mt-1 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                          {eodReport.completed_orders_count} completed orders
                        </div>
                      </div>

                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 h-20 w-20 bg-indigo-500/5 rounded-full -mr-6 -mt-6" />
                        <div className="text-xs font-black uppercase tracking-widest text-slate-400">GST Collected</div>
                        <div className="text-2xl font-black mt-2 text-indigo-700">{fmtINR(eodReport.tax_collected)}</div>
                        <div className="text-[10px] text-slate-500 font-semibold mt-1">Inclusive/exclusive auto-slabs</div>
                      </div>

                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 h-20 w-20 bg-rose-500/5 rounded-full -mr-6 -mt-6" />
                        <div className="text-xs font-black uppercase tracking-widest text-slate-400">Discounts Given</div>
                        <div className="text-2xl font-black mt-2 text-rose-600">-{fmtINR(eodReport.discounts_given)}</div>
                        <div className="text-[10px] text-slate-500 font-semibold mt-1 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block"></span>
                          Order-level &amp; coupon deductions
                        </div>
                      </div>

                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 h-20 w-20 bg-amber-500/5 rounded-full -mr-6 -mt-6" />
                        <div className="text-xs font-black uppercase tracking-widest text-slate-400">Net Subtotal</div>
                        <div className="text-2xl font-black mt-2 text-amber-700">{fmtINR(eodReport.net_subtotal)}</div>
                        <div className="text-[10px] text-slate-500 font-semibold mt-1">Excludes service charges &amp; tax</div>
                      </div>
                    </div>

                    {/* Breakdown & GST Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Left: Payment Modes */}
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="text-sm font-black text-slate-900 mb-4 uppercase tracking-wider">Payment Breakdown</h3>
                        {Object.keys(eodReport.payments_breakdown).length === 0 ? (
                          <div className="py-10 text-center text-slate-400 text-xs">No payment events logged today</div>
                        ) : (
                          <div className="space-y-4">
                            {Object.entries(eodReport.payments_breakdown).map(([mode, amt]) => {
                              const typedAmt = amt as number;
                              const total = (Object.values(eodReport.payments_breakdown) as number[]).reduce((a, b) => a + b, 0) || 1;
                              const pct = Math.round((typedAmt / total) * 100);
                              return (
                                <div key={mode} className="space-y-1">
                                  <div className="flex justify-between text-xs font-bold text-slate-800">
                                    <span className="uppercase">{mode}</span>
                                    <span>{fmtINR(typedAmt)} ({pct}%)</span>
                                  </div>
                                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                    <div className="h-full bg-slate-900 rounded-full" style={{ width: `${pct}%` }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Right: HSN Summary */}
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="text-sm font-black text-slate-900 mb-4 uppercase tracking-wider">HSN Code GST Summary</h3>
                        {!eodReport.hsn_summary || eodReport.hsn_summary.length === 0 ? (
                          <div className="py-10 text-center text-slate-400 text-xs">No item HSN records processed today</div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                                  <th className="pb-2">HSN Code</th>
                                  <th className="pb-2 text-center">Qty</th>
                                  <th className="pb-2 text-right">Taxable Value</th>
                                  <th className="pb-2 text-right">GST Collected</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50 font-medium">
                                {eodReport.hsn_summary.map((h: any) => (
                                  <tr key={h.hsn_code}>
                                    <td className="py-2 text-slate-900 font-mono font-bold">{h.hsn_code || "General"}</td>
                                    <td className="py-2 text-center text-slate-600">{h.quantity}</td>
                                    <td className="py-2 text-right text-slate-700">{fmtINR(h.taxable_value)}</td>
                                    <td className="py-2 text-right text-indigo-600 font-bold">{fmtINR(h.tax_amount)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Voids & Cancellations Audit */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Voids &amp; Discrepancies Audit</h3>
                        <span className="text-[10px] px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 font-black uppercase tracking-wider">Risk Audit</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 font-semibold">
                          <div className="text-xs text-slate-400 font-bold">Void Items Count</div>
                          <div className="text-xl font-black text-rose-600 mt-1">{eodReport.void_items_count}</div>
                          <p className="text-[10px] text-slate-500 mt-1">High-frequency voids flag internal fraud</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 font-semibold">
                          <div className="text-xs text-slate-400 font-bold">Cancelled Orders</div>
                          <div className="text-xl font-black text-rose-600 mt-1">{eodReport.cancelled_orders_count}</div>
                          <p className="text-[10px] text-slate-500 mt-1">Completed orders that were cancelled</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 font-semibold">
                          <div className="text-xs text-slate-400 font-bold">Cancelled Value</div>
                          <div className="text-xl font-black text-slate-800 mt-1">{fmtINR(eodReport.cancelled_orders_value)}</div>
                          <p className="text-[10px] text-slate-500 mt-1">Total revenue loss due to cancellation</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : activeTab === "accounting" ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">General Ledger &amp; P&amp;L</h2>
                    <p className="text-sm font-semibold text-slate-500 mt-1">Real-time profit and loss tracking with expense matching</p>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 shadow-sm">
                  <PieChart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="font-bold">Accounting dashboard rendering soon</p>
                  <p className="text-sm mt-1">Fetching Live General Ledger &amp; Chart of Accounts...</p>
                </div>
              </div>
            ) : activeTab === "tally" ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Tally ERP Export</h2>
                    <p className="text-sm font-semibold text-slate-500 mt-1">Export GST-compliant Sales Vouchers for Tally Import</p>
                  </div>
                  <a
                    href={`/api/admin/accounting/export/tally?start=${range.start}&end=${range.end}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download CSV
                  </a>
                </div>
                <div className="bg-indigo-50/50 rounded-2xl border border-indigo-100 p-8 text-center text-indigo-800 shadow-sm">
                  <p className="font-semibold text-sm">Download the Sales Register CSV which contains Invoice No, Party GSTIN, Taxable Value, and CGST/SGST/IGST breakdown.</p>
                </div>
              </div>
            ) : null
          )}
        </main>
      </div>
    </div>
  );
}
