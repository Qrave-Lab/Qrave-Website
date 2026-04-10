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
    refresh();
  }, []);

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
    ],
    [items]
  );

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

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
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
