"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Loader2 } from "lucide-react";
import { type Analytics, fcAdmin, istDate } from "@/app/lib/foodCourtAdmin";
import { Card } from "./FcAdminShell";

const RANGES = [
  { label: "Today", days: 0 },
  { label: "7 days", days: 6 },
  { label: "30 days", days: 29 },
];

const ACCENT = "#ea580c";

export default function FoodCourtOverview() {
  const [days, setDays] = useState(6);
  const [data, setData] = useState<{ days: number; a: Analytics } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fcAdmin
      .analytics(istDate(days), istDate(0))
      .then((a) => !cancelled && (setData({ days, a }), setFailed(false)))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [days]);

  const a = data?.days === days ? data.a : null;
  const total3d = a?.stalls.reduce((n, s) => n + s.view3d, 0) ?? 0;
  const hours = Array.from({ length: 24 }, (_, h) => {
    const key = String(h).padStart(2, "0");
    return { key, visitors: a?.byHour.find((r) => r.key === key)?.visitors ?? 0 };
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-extrabold">Overview</h2>
        <div className="flex rounded-full border border-slate-200 bg-white p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => setDays(r.days)}
              className={`rounded-full px-3 py-1 text-sm font-semibold ${days === r.days ? "bg-slate-900 text-white" : "text-slate-600"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {failed && <p className="text-sm text-red-600">Couldn&apos;t load analytics. Try again in a moment.</p>}
      {!a && !failed && (
        <div className="flex justify-center py-16 text-slate-400">
          <Loader2 className="animate-spin" />
        </div>
      )}

      {a && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Visitors" value={a.visitors} hint="Different phones" />
            <Stat label="Menu opens" value={a.opens} hint="QR scans and visits" />
            <Stat label="3D views" value={total3d} hint="People who opened a 3D dish" />
            <Stat label="Searches with no result" value={a.noResults.reduce((n, s) => n + s.zeroResults, 0)} hint="Dishes people wanted" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {days > 0 && (
              <Card title="Visitors per day">
                <Chart data={a.byDay.map((d) => ({ key: d.key.slice(5), visitors: d.visitors }))} />
              </Card>
            )}
            <Card title="Busiest hours">
              <Chart data={hours} />
            </Card>
          </div>

          <Card title="Stalls">
            <div className="-mx-4 overflow-x-auto px-4">
              <table className="w-full min-w-[480px] text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2 font-semibold">Stall</th>
                    <th className="py-2 text-right font-semibold">Menu views</th>
                    <th className="py-2 text-right font-semibold">Dish views</th>
                    <th className="py-2 text-right font-semibold">3D views</th>
                    <th className="py-2 text-right font-semibold">AR opens</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {a.stalls.map((s) => (
                    <tr key={s.restaurantId}>
                      <td className="py-2 font-semibold">{s.name}</td>
                      <td className="py-2 text-right tabular-nums">{s.views}</td>
                      <td className="py-2 text-right tabular-nums">{s.itemViews}</td>
                      <td className="py-2 text-right tabular-nums">{s.view3d}</td>
                      <td className="py-2 text-right tabular-nums">{s.arOpens}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-slate-400">Counts are different visitors, not taps.</p>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card title="Top searches">
              <SearchList rows={a.topSearches} count={(r) => r.searches} empty="No searches yet." />
            </Card>
            <Card title="Searched, not found">
              <SearchList rows={a.noResults} count={(r) => r.zeroResults} empty="Every search found something." />
              <p className="mt-2 text-xs text-slate-400">Dishes or cuisines no stall offers yet.</p>
            </Card>
            <Card title="Scans by QR code">
              {a.byZone.length === 0 ? (
                <p className="text-sm text-slate-500">No scans yet.</p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {a.byZone.map((z) => (
                    <li key={z.key} className="flex justify-between">
                      <span>{z.key}</span>
                      <span className="tabular-nums font-semibold">{z.visitors}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums">{value.toLocaleString("en-IN")}</p>
      <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p>
    </div>
  );
}

function Chart({ data }: { data: { key: string; visitors: number }[] }) {
  if (data.every((d) => d.visitors === 0)) {
    return <p className="py-10 text-center text-sm text-slate-400">No visitors in this period.</p>;
  }
  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="key" tickLine={false} axisLine={false} fontSize={11} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
          <Tooltip cursor={{ fill: "#f1f5f9" }} formatter={(v) => [v, "Visitors"]} />
          <Bar dataKey="visitors" fill={ACCENT} radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function SearchList<T extends { query: string }>({
  rows,
  count,
  empty,
}: {
  rows: T[];
  count: (r: T) => number;
  empty: string;
}) {
  if (rows.length === 0) return <p className="text-sm text-slate-500">{empty}</p>;
  return (
    <ul className="space-y-1.5 text-sm">
      {rows.slice(0, 10).map((r) => (
        <li key={r.query} className="flex justify-between gap-2">
          <span className="truncate">{r.query}</span>
          <span className="tabular-nums font-semibold">{count(r)}</span>
        </li>
      ))}
    </ul>
  );
}
