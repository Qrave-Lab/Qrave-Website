"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Box, Flame, History, Image as ImageIcon, Info, RefreshCw } from "lucide-react";
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
      <div className="min-h-screen bg-slate-50">
        <div className="flex">
          <StaffSidebar />
          <main className="flex-1 p-8">
            <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h1 className="text-xl font-black text-slate-900">Insights Access Disabled</h1>
              <p className="mt-2 text-sm text-slate-600">Your role does not currently have access to Menu Health insights.</p>
              <button
                type="button"
                onClick={() => router.push("/staff")}
                className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
              >
                Go to Dashboard
              </button>
            </div>
          </main>
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
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        <StaffSidebar />
        <main className="flex-1 p-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/staff/menu")}
                  className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Menu Health</p>
                  <h1 className="text-2xl font-black text-slate-900">Gaps to fix before service</h1>
                </div>
              </div>
              <button
                type="button"
                onClick={refresh}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {cards.map((card) => (
                <div key={card.label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">{card.label}</span>
                    <card.icon className="h-4 w-4 text-indigo-500" />
                  </div>
                  <div className="mt-3 text-2xl font-black text-slate-900">{loading ? "..." : card.value}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-black text-slate-900">Actionable Insights</h2>
                <ul className="mt-3 space-y-2 text-xs text-slate-600">
                  <li>
                    {insights.neverOrdered} items have never been ordered. Consider replacing or promoting them.
                  </li>
                  <li>
                    {insights.missingAllergens} items are missing allergen info. Prioritize these for compliance.
                  </li>
                  <li>
                    {insights.highStockRisk.length} items are repeatedly out of stock and likely need prep adjustments.
                  </li>
                </ul>
              </section>
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-black text-slate-900">Top Attention Needed</h2>
                <div className="mt-3 space-y-2 text-xs">
                  {insights.highStockRisk.length === 0 && insights.lowMargin.length === 0 ? (
                    <p className="text-slate-500">No urgent risk clusters found.</p>
                  ) : (
                    <>
                      {insights.highStockRisk.map((item) => (
                        <div key={`stock-${item.id}`} className="flex items-center justify-between rounded-lg bg-rose-50 px-2.5 py-2">
                          <span className="font-semibold text-slate-800">{item.name}</span>
                          <span className="font-bold text-rose-700">{item.out_of_stock_events} stock-outs</span>
                        </div>
                      ))}
                      {insights.lowMargin.map((item) => (
                        <div key={`margin-${item.id}`} className="flex items-center justify-between rounded-lg bg-amber-50 px-2.5 py-2">
                          <span className="font-semibold text-slate-800">{item.name}</span>
                          <span className="font-bold text-amber-700">{Math.round(item.marginPct)}% margin</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </section>
            </div>

            <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wider text-slate-400">
                    <th className="px-2 py-2">Item</th>
                    <th className="px-2 py-2">Flags</th>
                    <th className="px-2 py-2 text-right">Orders</th>
                    <th className="px-2 py-2 text-right">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const flags = [
                      item.missing_image ? "no image" : "",
                      item.missing_model ? "no 3D" : "",
                      item.missing_allergens ? "no allergens" : "",
                      item.hidden_but_linked ? "hidden but linked" : "",
                      item.order_count === 0 ? "never ordered" : "",
                    ].filter(Boolean);
                    return (
                      <tr key={item.id} className="border-b border-slate-50">
                        <td className="px-2 py-2">
                          <div className="font-semibold text-slate-800">{item.name}</div>
                          <div className="text-xs text-slate-400">{item.category_name || "Uncategorized"}</div>
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex flex-wrap gap-1">
                            {flags.length ? (
                              flags.map((flag) => (
                                <span key={flag} className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                  {flag}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-emerald-600">Healthy</span>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-2 text-right font-semibold text-slate-700">{item.order_count}</td>
                        <td className="px-2 py-2 text-right font-semibold text-slate-700">₹{Math.max(item.price - item.food_cost, 0)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
