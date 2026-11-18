"use client";

import { api } from "@/app/lib/api";
import { ArrowDownRight, ArrowUpRight, ChevronDown, ChevronRight, Search } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { CARD, INPUT, THEAD_ROW, TBODY, SectionHeader, EmptyState, fmtDay } from "./ui";
import { Loader2, TrendingUp } from "lucide-react";

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
  if (values.length < 2) return <span className="text-[#C4C4BE]">—</span>;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * 80},${22 - ((v - min) / span) * 20}`)
    .join(" ");
  return (
    <svg width="80" height="24" viewBox="0 0 80 24">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.6" className="text-[#9CA3AF]" />
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
    <div className="px-8 py-6">
      <SectionHeader
        title="Price history"
        count={loading ? undefined : `${groups.length} ${groups.length === 1 ? "ingredient" : "ingredients"}`}
        description="Cost per unit from every delivery you've received. The biggest price changes are listed first."
      >
        <div className="relative w-60">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search ingredient"
            aria-label="Search ingredient"
            className={`${INPUT} pl-9 text-[13px]`}
          />
        </div>
      </SectionHeader>

      <section className={CARD}>
        {loading ? (
          <div className="flex h-56 items-center justify-center gap-2 text-[14px] text-[#6B7280]">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading prices
          </div>
        ) : groups.length === 0 ? (
          query.trim() ? (
            <EmptyState icon={<Search className="h-6 w-6" />} title="No ingredients match your search" />
          ) : (
            <EmptyState
              icon={<TrendingUp className="h-6 w-6" />}
              title="No prices recorded yet"
              body="Receive a purchase order with unit costs and the price of each ingredient will be tracked here."
            />
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className={THEAD_ROW}>
                  <th className="w-10 py-3 pl-4" />
                  <th className="px-4 py-3 font-medium">Ingredient</th>
                  <th className="px-4 py-3 text-right font-medium">Latest price</th>
                  <th className="px-4 py-3 text-right font-medium">Change</th>
                  <th className="px-4 py-3 font-medium">Trend</th>
                  <th className="px-4 py-3 font-medium">Cheapest supplier</th>
                </tr>
              </thead>
              <tbody className={TBODY}>
                {groups.map((g) => {
                  const isOpen = open === g.id;
                  return (
                    <React.Fragment key={g.id}>
                      <tr
                        onClick={() => setOpen(isOpen ? null : g.id)}
                        aria-expanded={isOpen}
                        className={`cursor-pointer text-[13px] transition-colors hover:bg-[#FAFAF7] ${isOpen ? "bg-[#FAFAF7]" : ""}`}
                      >
                        <td className="py-3.5 pl-4 text-[#9CA3AF]">
                          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </td>
                        <td className="px-4 py-3.5 text-[14px] font-semibold text-[#0F1117]">{g.name}</td>
                        <td className="px-4 py-3.5 text-right">
                          <p className="font-semibold tabular-nums text-[#0F1117]">{inr(g.latest.cost_per_unit)}</p>
                          <p className="mt-0.5 text-[12px] text-[#9CA3AF]">{g.latest.supplier_name}</p>
                        </td>
                        <td className="px-4 py-3.5 text-right font-semibold tabular-nums">
                          {g.change === 0 ? (
                            <span className="text-[#C4C4BE]">—</span>
                          ) : (
                            <span className={`inline-flex items-center gap-0.5 ${g.change > 0 ? "text-rose-600" : "text-emerald-700"}`}>
                              {g.change > 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                              {Math.abs(g.change).toFixed(1)}%
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5"><Spark values={[...g.list].reverse().map((p) => p.cost_per_unit)} /></td>
                        <td className="px-4 py-3.5 text-[#4B5563]">
                          {g.suppliers > 1 && g.cheapest ? (
                            <>
                              <span className="text-[#0F1117]">{g.cheapest[0]}</span>{" "}
                              <span className="tabular-nums text-[#6B7280]">at {inr(g.cheapest[1])}</span>
                            </>
                          ) : (
                            <span className="text-[#9CA3AF]">Only one supplier</span>
                          )}
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-[#FAFAF7]">
                          <td />
                          <td colSpan={5} className="px-4 pb-4 pt-1">
                            <ul className="grid gap-1.5 sm:grid-cols-2">
                              {g.list.slice(0, 20).map((p, i) => (
                                <li key={i} className="flex justify-between gap-3 rounded-lg border border-[#E8E8E3] bg-white px-3 py-2 text-[12px]">
                                  <span className="text-[#6B7280]">
                                    <span className="tabular-nums">{fmtDay(p.received_at)}</span>, {p.supplier_name}
                                  </span>
                                  <span className="font-semibold tabular-nums text-[#0F1117]">{inr(p.cost_per_unit)}</span>
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
          </div>
        )}
      </section>
    </div>
  );
}
