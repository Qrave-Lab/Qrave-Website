"use client";

import React, { useEffect, useMemo, useState } from "react";
import StaffSidebar from "@/app/components/StaffSidebar";
import { analyticsApi } from "@/app/lib/analyticsApi";
import {
  BarChart3,
  Calendar,
  CreditCard,
  Download,
  Loader2,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

type Bucket = "day" | "week" | "month";

type SalesPoint = { t: string; sales: number };

const fmtINR = (n: number) =>
  `₹${Math.round(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

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
  const [bucket, setBucket] = useState<Bucket>("day");
  const [range, setRange] = useState<{ start: string; end: string }>({
    start: "",
    end: "",
  });
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<SalesPoint[]>([]);
  const [mix, setMix] = useState<{ mode: string; amount: number; percent: number }[]>([]);
  const [topItems, setTopItems] = useState<{ name: string; quantity: number; revenue: number }[]>([]);
  const [tx, setTx] = useState<any[]>([]);
  const [insights, setInsights] = useState<{ anomalies: any[]; forecast: any[] } | null>(null);

  const totals = useMemo(() => {
    const totalSales = sales.reduce((sum, p) => sum + (p.sales || 0), 0);
    const avg = sales.length ? totalSales / sales.length : 0;
    return { totalSales, avg };
  }, [sales]);

  const load = async () => {
    setLoading(true);
    try {
      const qs =
        range.start && range.end ? `&start=${range.start}&end=${range.end}` : "";
      const [salesRes, mixRes, topRes, txRes, insRes] = await Promise.all([
        analyticsApi<any>(`/v1/sales/timeseries?bucket=${bucket}${qs}`),
        analyticsApi<any>(`/v1/payment-mix${range.start && range.end ? `?start=${range.start}&end=${range.end}` : ""}`),
        analyticsApi<any>(`/v1/top-items${range.start && range.end ? `?start=${range.start}&end=${range.end}` : ""}`),
        analyticsApi<any>(`/v1/transactions${range.start && range.end ? `?start=${range.start}&end=${range.end}` : ""}`),
        analyticsApi<any>(`/v1/insights?bucket=day${qs}`),
      ]);
      setSales(salesRes?.points || []);
      setMix(mixRes?.mix || []);
      setTopItems(topRes?.items || []);
      setTx(txRes?.transactions || []);
      setInsights({ anomalies: insRes?.anomalies || [], forecast: insRes?.forecast || [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucket]);

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
        <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between z-20 sticky top-0">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-slate-500" /> Analytics
            </h1>
            <p className="text-xs text-slate-500 mt-1">Sales, transactions, and top items.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-sm">
              {(["day", "week", "month"] as Bucket[]).map((b) => (
                <button
                  key={b}
                  onClick={() => setBucket(b)}
                  className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                    bucket === b ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900"
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

        <main className="flex-1 overflow-y-auto p-8 bg-[#F8FAFC]">
          {loading ? (
            <div className="flex items-center justify-center py-32 text-slate-500 font-medium">
              <Loader2 className="w-8 h-8 animate-spin mr-3" /> Loading analytics…
            </div>
          ) : (
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
          )}
        </main>
      </div>
    </div>
  );
}
