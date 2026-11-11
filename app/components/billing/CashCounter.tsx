"use client";

import { Minus, Plus, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

// Notes and coins a cashier is likely to be handed. ₹2000 notes are left out:
// the RBI withdrew them from circulation in 2023.
const NOTES = [500, 200, 100, 50, 20, 10] as const;
const COINS = [5, 2, 1] as const;
const DENOMINATIONS = [...NOTES, ...COINS];

export type CashCount = {
  /** Total cash counted so far (0 when nothing has been counted). */
  received: number;
  /** received - due, when something has been counted; negative means short. */
  difference: number;
  /** True when cash was counted but doesn't cover the bill. */
  isShort: boolean;
};

/** Fewest notes and coins that make up `amount` (whole rupees). */
export function changeBreakdown(amount: number): Array<[number, number]> {
  let left = Math.round(amount);
  const out: Array<[number, number]> = [];
  for (const d of DENOMINATIONS) {
    const n = Math.floor(left / d);
    if (n > 0) {
      out.push([d, n]);
      left -= n * d;
    }
  }
  return out;
}

const formatINR = (n: number) =>
  `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: Number.isInteger(n) ? 0 : 2 })}`;

/**
 * Counts the notes a guest hands over and shows the change to give back.
 * Counting is optional: with nothing counted, it reports received = 0 and
 * the caller can take the payment as before.
 */
export default function CashCounter({
  amountDue,
  onChange,
}: {
  amountDue: number;
  onChange?: (count: CashCount) => void;
}) {
  const [counts, setCounts] = useState<Record<number, number>>({});

  const received = useMemo(
    () => DENOMINATIONS.reduce((sum, d) => sum + d * (counts[d] || 0), 0),
    [counts],
  );
  const due = Math.round(amountDue * 100) / 100;
  const difference = Math.round((received - due) * 100) / 100;
  const counted = received > 0;
  const isShort = counted && difference < 0;

  useEffect(() => {
    onChange?.({ received, difference: counted ? difference : 0, isShort });
  }, [received, difference, counted, isShort, onChange]);

  const bump = (d: number, by: number) =>
    setCounts((prev) => ({ ...prev, [d]: Math.max(0, (prev[d] || 0) + by) }));

  const setCount = (d: number, raw: string) => {
    const n = Math.max(0, Math.floor(Number(raw) || 0));
    setCounts((prev) => ({ ...prev, [d]: n }));
  };

  const change = counted && difference > 0 ? changeBreakdown(difference) : [];

  const row = (d: number) => {
    const n = counts[d] || 0;
    return (
      <div
        key={d}
        className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 transition-colors ${
          n > 0 ? "border-slate-900/20 bg-white" : "border-slate-200 bg-white/60"
        }`}
      >
        <span className="w-11 text-xs font-bold text-slate-800 tabular-nums">₹{d}</span>
        <button
          type="button"
          onClick={() => bump(d, -1)}
          disabled={n === 0}
          aria-label={`One less ₹${d}`}
          className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-30"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={n === 0 ? "" : n}
          placeholder="0"
          onChange={(e) => setCount(d, e.target.value)}
          aria-label={`Number of ₹${d}`}
          className="h-7 w-10 rounded-md border border-slate-200 text-center text-xs font-bold tabular-nums text-slate-900 focus:border-slate-900 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={() => bump(d, 1)}
          aria-label={`One more ₹${d}`}
          className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-white hover:bg-black"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <span className="ml-auto text-xs font-semibold tabular-nums text-slate-500">
          {n > 0 ? formatINR(d * n) : ""}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-slate-900">Count cash received</p>
          <p className="text-[11px] text-slate-500">Optional — shows the change to give back</p>
        </div>
        {counted && (
          <button
            type="button"
            onClick={() => setCounts({})}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Notes</p>
        {NOTES.map(row)}
        <p className="pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Coins</p>
        {COINS.map(row)}
      </div>

      <div className="space-y-1 border-t border-slate-200 pt-2.5 text-xs">
        <div className="flex justify-between font-semibold text-slate-600">
          <span>Bill</span>
          <span className="tabular-nums">{formatINR(due)}</span>
        </div>
        <div className="flex justify-between font-semibold text-slate-600">
          <span>Received</span>
          <span className="tabular-nums">{formatINR(received)}</span>
        </div>
        {counted && (
          <div
            className={`flex justify-between rounded-lg px-2.5 py-2 text-sm font-bold ${
              isShort
                ? "bg-rose-50 text-rose-700"
                : difference > 0
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-800"
            }`}
          >
            <span>{isShort ? "Still short" : difference > 0 ? "Change to return" : "Exact amount"}</span>
            <span className="tabular-nums">{difference === 0 ? "✓" : formatINR(Math.abs(difference))}</span>
          </div>
        )}
        {change.length > 0 && (
          <p className="px-1 text-[11px] font-medium text-emerald-800">
            Give back: {change.map(([d, n]) => `${n} × ₹${d}`).join(" + ")}
          </p>
        )}
        {counted && !Number.isInteger(due) && difference > 0 && (
          <p className="px-1 text-[11px] text-slate-500">Paise are rounded when suggesting notes.</p>
        )}
      </div>
    </div>
  );
}
