"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "@/app/lib/api";

type Analytics = {
  days: number;
  unit: "points" | "stamps";
  members: number;
  new_members: number;
  active_members: number;
  repeat_members: number;
  repeat_rate: number;
  member_visits: number;
  member_sales: string | number;
  total_sales: string | number;
  non_member_sales: string | number;
  avg_member_bill: string | number;
  issued: number;
  bonus_issued: number;
  redeemed: number;
  outstanding: number;
  rewards_used: number;
  reward_discount: string | number;
  by_weekday: number[];
  by_hour: number[];
  top_members: { name: string; phone: string; visits: number; spend: string | number; balance: number; tier: string }[];
  tiers: Record<string, number>;
  branches?: { name: string; visits: number; member_sales: string | number }[];
  messages: Record<string, number>;
};

const money = (v: string | number) => `₹${Math.round(Number(v) || 0).toLocaleString("en-IN")}`;
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const hourLabel = (h: number) => (h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`);

/** One-series bar chart: thin bars, rounded tops, a hover tooltip on each bar. */
function Bars({ values, labels, caption, every = 1 }: { values: number[]; labels: string[]; caption: string; every?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...values);
  const total = values.reduce((a, b) => a + b, 0);
  return (
    <figure className="space-y-2">
      <figcaption className="text-xs font-semibold text-slate-700">{caption}</figcaption>
      {total === 0 ? (
        <p className="text-xs text-slate-400">No member visits in this period yet.</p>
      ) : (
        <div className="relative">
          <div className="flex h-28 items-end gap-[2px] border-b border-slate-200" role="img" aria-label={caption}>
            {values.map((v, i) => (
              <div
                key={i}
                className="relative flex h-full flex-1 items-end"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              >
                <div
                  className="w-full rounded-t-[4px] bg-teal-700/80 dark:bg-teal-400/80"
                  style={{ height: `${(v / max) * 100}%`, minHeight: v > 0 ? 2 : 0, opacity: hover === null || hover === i ? 1 : 0.45 }}
                />
                {hover === i && (
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] text-white shadow">
                    {labels[i]}: {v} {v === 1 ? "visit" : "visits"}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-1 flex gap-[2px]">
            {labels.map((l, i) => (
              <span key={i} className="flex-1 text-center text-[10px] text-slate-500">
                {i % every === 0 ? l : ""}
              </span>
            ))}
          </div>
        </div>
      )}
    </figure>
  );
}

function Tile({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
      {note && <p className="mt-0.5 text-[11px] text-slate-500">{note}</p>}
    </div>
  );
}

/** Owner view: how the loyalty card is doing. */
export default function LoyaltyInsights() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    api<Analytics>(`/api/admin/crm/loyalty/analytics?days=${days}`, { noCache: true })
      .then((d) => {
        if (alive) {
          setData(d);
          setError("");
        }
      })
      .catch((e: Error) => alive && setError(e.message || "Couldn't load insights."));
    return () => {
      alive = false;
    };
  }, [days]);

  if (error) return <p className="text-sm text-rose-600">{error}</p>;
  if (!data) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading insights...
      </div>
    );
  }
  const unit = data.unit === "stamps" ? "stamps" : "points";
  const memberShare = Number(data.total_sales) > 0 ? Math.round((Number(data.member_sales) / Number(data.total_sales)) * 100) : 0;
  const tierOrder = ["bronze", "silver", "gold", "platinum"].filter((t) => data.tiers[t]);
  const emailsSent = (data.messages["birthday:sent"] || 0) + (data.messages["winback:sent"] || 0);

  return (
    <div className="space-y-5" data-testid="loyalty-insights">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800">How the card is doing</p>
        <select
          value={days}
          onChange={(e) => {
            setData(null);
            setDays(Number(e.target.value));
          }}
          aria-label="Period"
          className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last year</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Members" value={data.members} note={`${data.new_members} joined in this period`} />
        <Tile label="Came in" value={data.active_members} note={`${data.member_visits} member visits`} />
        <Tile label="Came back (2+ visits)" value={`${Math.round(data.repeat_rate * 100)}%`} note={`${data.repeat_members} of ${data.active_members} members`} />
        <Tile label="Average member bill" value={money(data.avg_member_bill)} />
        <Tile label="Sales from members" value={money(data.member_sales)} note={`${memberShare}% of ${money(data.total_sales)} total`} />
        <Tile label="Sales from others" value={money(data.non_member_sales)} />
        <Tile label={`${unit[0].toUpperCase()}${unit.slice(1)} given`} value={data.issued + data.bonus_issued} note={`${data.bonus_issued} as bonuses`} />
        <Tile label="Rewards used" value={data.rewards_used} note={`${money(data.reward_discount)} off bills · ${data.outstanding} ${unit} unspent`} />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Bars caption="Busiest days for members" values={data.by_weekday} labels={DAYS} />
        <Bars caption="Busiest hours for members" values={data.by_hour} labels={data.by_hour.map((_, h) => hourLabel(h))} every={3} />
      </div>

      {data.branches && data.branches.length > 1 && (
        <div>
          <p className="mb-2 text-xs font-semibold text-slate-700">By branch</p>
          <table className="w-full text-xs">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-1 font-medium">Branch</th>
                <th className="py-1 text-right font-medium">Member visits</th>
                <th className="py-1 text-right font-medium">Member sales</th>
              </tr>
            </thead>
            <tbody className="text-slate-800">
              {data.branches.map((b) => (
                <tr key={b.name} className="border-t border-slate-100">
                  <td className="py-1.5">{b.name}</td>
                  <td className="py-1.5 text-right">{b.visits}</td>
                  <td className="py-1.5 text-right">{money(b.member_sales)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-[2fr_1fr]">
        <div>
          <p className="mb-2 text-xs font-semibold text-slate-700">Top members in this period</p>
          {data.top_members.length === 0 ? (
            <p className="text-xs text-slate-400">No member visits yet.</p>
          ) : (
            <table className="w-full text-xs">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="py-1 font-medium">Member</th>
                  <th className="py-1 text-right font-medium">Visits</th>
                  <th className="py-1 text-right font-medium">Spent</th>
                  <th className="py-1 text-right font-medium">Balance</th>
                </tr>
              </thead>
              <tbody className="text-slate-800">
                {data.top_members.map((m, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="py-1.5">
                      {m.name || m.phone}
                      {tierOrder.length > 0 && <span className="ml-1 text-[10px] uppercase text-slate-400">{m.tier}</span>}
                    </td>
                    <td className="py-1.5 text-right">{m.visits}</td>
                    <td className="py-1.5 text-right">{money(m.spend)}</td>
                    <td className="py-1.5 text-right">{m.balance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="space-y-3">
          {tierOrder.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-700">Members by tier</p>
              {tierOrder.map((t) => (
                <div key={t} className="flex justify-between border-t border-slate-100 py-1.5 text-xs text-slate-800">
                  <span className="capitalize">{t}</span>
                  <span>{data.tiers[t]}</span>
                </div>
              ))}
            </div>
          )}
          {(emailsSent > 0 || data.messages["birthday:failed"] || data.messages["winback:failed"]) && (
            <p className="text-xs text-slate-600">
              {emailsSent} birthday and win-back emails sent
              {(data.messages["birthday:failed"] || 0) + (data.messages["winback:failed"] || 0) > 0 &&
                `, ${(data.messages["birthday:failed"] || 0) + (data.messages["winback:failed"] || 0)} couldn't be sent`}
              .
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
