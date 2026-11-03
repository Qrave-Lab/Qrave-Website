"use client";

import { api } from "@/app/lib/api";
import { ArrowDownRight, ArrowUpRight, ChevronDown, ChevronRight, Search } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

type Point = {
  ingredient_id: string;
  ingredient_name: string;
  cost_per_unit: number;
  received_at: string;
  supplier_name: string;
};

const inr = (n: number) =>
  `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Spark({ values }: { values: number[] }) {
  if (values.length < 2) return <span className="text-slate-300">—</span>;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * 80},${22 - ((v - min) / span) * 20}`)
    .join(" ");
  return (
    <svg width="80" height="24" viewBox="0 0 80 24">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.6" className="text-slate-500" />
    </svg>
  );
}

/** What each ingredient has cost over time, and which supplier is cheapest. */
export default function PriceHistoryPanel() {
  const [points, setPoints] = useState<Point[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    api<{ prices: Point[] }>("/api/admin/inventory/advanced/price-history", { noCache: true })
      .then((r) => setPoints(r?.prices || []))
      .catch(() => setPoints([]))
      .finally(() => setLoading(false));
  }, []);

  const groups = useMemo(() => {
    const m = new Map<string, Point[]>();
    points.forEach((p) => m.set(p.ingredient_id, [...(m.get(p.ingredient_id) || []), p]));
    return Array.from(m.values())
      .map((list) => {
        // list is newest first
        const latest = list[0];
        const prev = list.find((p) => p.cost_per_unit !== latest.cost_per_unit);
        const change = prev ? ((latest.cost_per_unit - prev.cost_per_unit) / prev.cost_per_unit) * 100 : 0;
        const bySupplier = new Map<string, number>();
        list.forEach((p) => {
          if (!bySupplier.has(p.supplier_name)) bySupplier.set(p.supplier_name, p.cost_per_unit);
        });
        const cheapest = Array.from(bySupplier.entries()).sort((a, b) => a[1] - b[1])[0];
        return { name: latest.ingredient_name, id: latest.ingredient_id, list, latest, change, cheapest, suppliers: bySupplier.size };
      })
      .filter((g) => g.name.toLowerCase().includes(query.trim().toLowerCase()))
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  }, [points, query]);

  return (
    <div className="flex flex-1 flex-col animate-in fade-in duration-200">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-100 bg-white px-8 py-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Supplier price history</h2>
          <p className="mt-1 text-xs text-slate-500">
            Cost per unit from every stock receipt. Biggest price moves are shown first.
          </p>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search ingredient"
            className="w-56 rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      </div>

      {loading ? (
        <p className="p-10 text-center text-xs font-semibold text-slate-400">Loading prices…</p>
      ) : groups.length === 0 ? (
        <p className="m-auto p-16 text-center text-xs text-slate-400">
          No priced stock receipts yet. Receive a purchase order with unit costs to start tracking.
        </p>
      ) : (
        <table className="w-full border-collapse text-left text-sm text-slate-600">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-xs font-bold uppercase tracking-wider text-slate-500">
              <th className="w-10 px-4 py-3" />
              <th className="px-4 py-3">Ingredient</th>
              <th className="px-4 py-3">Latest</th>
              <th className="px-4 py-3">Change</th>
              <th className="px-4 py-3">Trend</th>
              <th className="px-4 py-3">Cheapest supplier</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {groups.map((g) => {
              const isOpen = open === g.id;
              return (
                <React.Fragment key={g.id}>
                  <tr onClick={() => setOpen(isOpen ? null : g.id)} className="cursor-pointer hover:bg-slate-50/60">
                    <td className="px-4 py-3.5 text-slate-300">
                      {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-slate-900">{g.name}</td>
                    <td className="px-4 py-3.5 font-mono">
                      {inr(g.latest.cost_per_unit)}
                      <span className="ml-1.5 text-xs font-sans text-slate-400">{g.latest.supplier_name}</span>
                    </td>
                    <td className="px-4 py-3.5 font-bold">
                      {g.change === 0 ? (
                        <span className="text-slate-300">—</span>
                      ) : (
                        <span className={`inline-flex items-center gap-1 ${g.change > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                          {g.change > 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                          {Math.abs(g.change).toFixed(1)}%
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5"><Spark values={[...g.list].reverse().map((p) => p.cost_per_unit)} /></td>
                    <td className="px-4 py-3.5 text-xs">
                      {g.suppliers > 1 && g.cheapest ? `${g.cheapest[0]} · ${inr(g.cheapest[1])}` : <span className="text-slate-300">Single supplier</span>}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-slate-50/60">
                      <td />
                      <td colSpan={5} className="px-4 py-3">
                        <ul className="grid gap-1 text-xs sm:grid-cols-2">
                          {g.list.slice(0, 20).map((p, i) => (
                            <li key={i} className="flex justify-between rounded-lg bg-white px-3 py-2 ring-1 ring-slate-100">
                              <span className="text-slate-500">
                                {new Date(p.received_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })} · {p.supplier_name}
                              </span>
                              <span className="font-mono font-bold text-slate-800">{inr(p.cost_per_unit)}</span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
