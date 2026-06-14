"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Box, Flame, History, Image as ImageIcon, Info, RefreshCw, Lightbulb } from "lucide-react";
import StaffSidebar from "@/app/components/StaffSidebar";
import { api } from "@/app/lib/api";

type MenuHealthItem = {
  id: string;
  name: string;
  category_name: string;
  price: number;
  food_cost: number;
  order_count: number;
  out_of_stock_events: number;
  missing_image: boolean;
  missing_model: boolean;
  missing_category: boolean;
  missing_allergens: boolean;
  is_archived: boolean;
  hidden_but_linked: boolean;
};

export default function MenuHealthPage() {
  const router = useRouter();
  const [items, setItems] = useState<MenuHealthItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  const refresh = async () => {
    try {
      setLoading(true);
      const data = await api<MenuHealthItem[]>("/api/admin/menu/health");
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const me = await api<{ role?: string; theme_config?: { role_access?: Record<string, Record<string, boolean>> } }>("/api/admin/me");
        const nextRole = String(me?.role || "").toLowerCase();
        const roleAccess = me?.theme_config?.role_access;
        if (nextRole && nextRole !== "owner" && nextRole !== "admin") {
          const allowed = roleAccess?.[nextRole]?.insights;
          if (allowed === false) {
            setAccessDenied(true);
            setLoading(false);
            return;
          }
        }
      } catch {
        // Fall through and try loading the page data
      }
      refresh();
    })();
  }, []);

  if (accessDenied) {
    return (
      <div className="flex h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
        <StaffSidebar />
        <div className="flex-1 flex flex-col min-w-0 relative">
          <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-8 sticky top-0 z-10 shrink-0">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-gray-900">Access Denied</h2>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto p-8 relative">
            <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h1 className="text-xl font-black text-slate-900">Insights Access Disabled</h1>
              <p className="mt-2 text-sm text-slate-600">Your role does not currently have access to Menu Health insights.</p>
              <button
                type="button"
                onClick={() => router.push("/staff")}
                className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const cards = useMemo(
    () => [
      { label: "Missing images", value: items.filter((i) => i.missing_image).length, icon: ImageIcon },
      { label: "Missing 3D", value: items.filter((i) => i.missing_model).length, icon: Box },
      { label: "No allergens", value: items.filter((i) => i.missing_allergens).length, icon: Info },
      { label: "Never ordered", value: items.filter((i) => i.order_count === 0).length, icon: History },
      {
        label: "Low margin",
        value: items.filter((i) => i.price > 0 && i.food_cost > 0 && (i.price - i.food_cost) / i.price < 0.35).length,
        icon: Flame,
      },
      { label: "Out-of-stock repeats", value: items.filter((i) => i.out_of_stock_events >= 3).length, icon: RefreshCw },
      { label: "Uncategorized", value: items.filter((i) => i.missing_category || !i.category_name).length, icon: Info },
      { label: "Archived but linked", value: items.filter((i) => i.is_archived && i.hidden_but_linked).length, icon: Box },
    ],
    [items]
  );

  const insights = useMemo(() => {
    const neverOrdered = items.filter((i) => i.order_count === 0).length;
    const highStockRisk = items
      .filter((i) => i.out_of_stock_events > 0)
      .sort((a, b) => b.out_of_stock_events - a.out_of_stock_events)
      .slice(0, 3);
    const missingAllergens = items.filter((i) => i.missing_allergens).length;
    const lowMargin = items
      .filter((i) => i.price > 0 && i.food_cost > 0)
      .map((i) => ({ ...i, marginPct: ((i.price - i.food_cost) / i.price) * 100 }))
      .filter((i) => i.marginPct < 35)
      .sort((a, b) => a.marginPct - b.marginPct)
      .slice(0, 3);

    return { neverOrdered, highStockRisk, missingAllergens, lowMargin };
  }, [items]);

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
      <StaffSidebar />
      <div className="flex-1 flex flex-col min-w-0 relative">
        <header className="bg-white border-b border-slate-200 flex flex-col sticky top-0 z-10 shrink-0">
          <div className="h-16 flex items-center justify-between px-8">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => router.push("/staff/menu")}
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-900">Menu Health & Diagnostics</h2>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    Gaps to fix before service.
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={refresh}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </button>
            </div>
          </div>
          
          {/* Integrated Stats Bar */}
          <div className="px-8 py-5 bg-slate-50/80 grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-6 border-t border-slate-100">
            {cards.map((card) => (
              <div key={card.label} className="flex items-center gap-3">
                <div className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-100 text-indigo-500 shrink-0">
                  <card.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate">{card.label}</p>
                  <p className="text-xl font-black text-slate-900 leading-none mt-1 truncate">{loading ? "..." : card.value}</p>
                </div>
              </div>
            ))}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 relative">
          <div className="w-full space-y-6">

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Actionable Insights */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                    <Lightbulb className="w-5 h-5" />
                  </div>
                  <h2 className="text-base font-black text-slate-900">Actionable Insights</h2>
                </div>
                <ul className="space-y-3 text-sm text-slate-700 font-medium">
                  <li className="flex items-start gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <History className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <span><strong className="text-slate-900">{insights.neverOrdered} items</strong> have never been ordered. Consider replacing or promoting them.</span>
                  </li>
                  <li className="flex items-start gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <Info className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <span><strong className="text-slate-900">{insights.missingAllergens} items</strong> are missing allergen info. Prioritize these for compliance.</span>
                  </li>
                  <li className="flex items-start gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <RefreshCw className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <span><strong className="text-slate-900">{insights.highStockRisk.length} items</strong> are repeatedly out of stock and likely need prep adjustments.</span>
                  </li>
                </ul>
              </section>

              {/* Top Attention Needed */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500"></div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
                    <Flame className="w-5 h-5" />
                  </div>
                  <h2 className="text-base font-black text-slate-900">Top Attention Needed</h2>
                </div>
                <div className="space-y-3 text-sm">
                  {insights.highStockRisk.length === 0 && insights.lowMargin.length === 0 ? (
                    <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl border border-emerald-100 flex items-center justify-center font-bold h-full">
                      No urgent risk clusters found. Great job!
                    </div>
                  ) : (
                    <>
                      {insights.highStockRisk.map((item) => (
                        <div key={`stock-${item.id}`} className="flex items-center justify-between rounded-xl bg-white border border-rose-100 p-3 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                            <span className="font-bold text-slate-800">{item.name}</span>
                          </div>
                          <span className="font-black text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg text-xs">{item.out_of_stock_events} stock-outs</span>
                        </div>
                      ))}
                      {insights.lowMargin.map((item) => (
                        <div key={`margin-${item.id}`} className="flex items-center justify-between rounded-xl bg-white border border-amber-100 p-3 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                            <span className="font-bold text-slate-800">{item.name}</span>
                          </div>
                          <span className="font-black text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg text-xs">{Math.round(item.marginPct)}% margin</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </section>
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="font-black text-slate-900">Detailed Diagnostic Report</h3>
                <span className="text-xs font-bold text-slate-500 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-sm">{items.length} Items Evaluated</span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-white border-b border-slate-100 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      <th className="px-6 py-4">Menu Item</th>
                      <th className="px-6 py-4">Diagnostic Flags</th>
                      <th className="px-6 py-4 text-right">Lifetime Orders</th>
                      <th className="px-6 py-4 text-right">Estimated Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {items.map((item) => {
                      const flags = [
                        item.missing_image ? { label: "no image", color: "text-amber-700 bg-amber-50 border-amber-200" } : null,
                        item.missing_model ? { label: "no 3D", color: "text-blue-700 bg-blue-50 border-blue-200" } : null,
                        item.missing_allergens ? { label: "no allergens", color: "text-rose-700 bg-rose-50 border-rose-200" } : null,
                        item.hidden_but_linked ? { label: "hidden but linked", color: "text-purple-700 bg-purple-50 border-purple-200" } : null,
                        item.order_count === 0 ? { label: "never ordered", color: "text-slate-700 bg-slate-100 border-slate-200" } : null,
                      ].filter(Boolean);

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{item.name}</div>
                            <div className="text-xs font-medium text-slate-500 mt-0.5">{item.category_name || "Uncategorized"}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-2">
                              {flags.length ? (
                                flags.map((flag: any) => (
                                  <span key={flag.label} className={`rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${flag.color}`}>
                                    {flag.label}
                                  </span>
                                ))
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-700">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Healthy
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <span className="font-black text-slate-900">{item.order_count}</span>
                            <span className="text-xs text-slate-400 ml-1">orders</span>
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <span className="font-black text-emerald-600">₹{Math.max(item.price - item.food_cost, 0)}</span>
                          </td>
                        </tr>
                      );
                    })}
                    {items.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-slate-500 font-medium">
                          No menu items found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
