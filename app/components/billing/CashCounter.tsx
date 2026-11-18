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
        className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 transition-colors ${
          n > 0 ? "border-[#fe5c13]/40 bg-[#FFF4EC]" : "border-[#E8E8E3] bg-white"
        }`}
      >
        <span className="w-11 text-[13px] font-semibold text-[#0F1117] tabular-nums">₹{d}</span>
        <button
          type="button"
          onClick={() => bump(d, -1)}
          disabled={n === 0}
          aria-label={`One less ₹${d}`}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E8E8E3] bg-white text-[#4B5563] transition-colors hover:border-[#D6D6CF] hover:text-[#0F1117] disabled:opacity-30"
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
          className="h-8 w-11 rounded-lg border border-[#E8E8E3] bg-white text-center text-[13px] font-medium tabular-nums text-[#0F1117] placeholder:text-[#C4C4BE] focus:border-[#fe5c13] focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={() => bump(d, 1)}
          aria-label={`One more ₹${d}`}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#fe5c13] text-white transition-colors hover:bg-[#e44e0b]"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <span className="ml-auto text-[13px] font-medium tabular-nums text-[#6B7280]">
          {n > 0 ? formatINR(d * n) : ""}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-3.5 rounded-xl border border-[#E8E8E3] bg-[#FAFAF7] p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[14px] font-semibold text-[#0F1117]">Count the cash</p>
          <p className="mt-0.5 text-[12px] text-[#6B7280]">Optional. Shows the change to give back.</p>
        </div>
        {counted && (
          <button
            type="button"
            onClick={() => setCounts({})}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium text-[#6B7280] hover:bg-[#F3F3EF] hover:text-[#0F1117]"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        <p className="text-[12px] font-medium text-[#6B7280]">Notes</p>
        {NOTES.map(row)}
        <p className="pt-1.5 text-[12px] font-medium text-[#6B7280]">Coins</p>
        {COINS.map(row)}
      </div>

      <div className="space-y-1.5 border-t border-[#E8E8E3] pt-3 text-[13px]">
        <div className="flex justify-between text-[#6B7280]">
          <span>Bill</span>
          <span className="tabular-nums text-[#0F1117]">{formatINR(due)}</span>
        </div>
        <div className="flex justify-between text-[#6B7280]">
          <span>Received</span>
          <span className="tabular-nums text-[#0F1117]">{formatINR(received)}</span>
        </div>
        {counted && (
          <div
            className={`flex justify-between rounded-lg px-3 py-2 text-[14px] font-semibold ${
              isShort
                ? "bg-rose-50 text-rose-700"
                : difference > 0
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-[#F3F3EF] text-[#0F1117]"
            }`}
          >
            <span>{isShort ? "Still short" : difference > 0 ? "Change to return" : "Exact amount"}</span>
            <span className="tabular-nums">{difference === 0 ? "No change" : formatINR(Math.abs(difference))}</span>
          </div>
        )}
        {change.length > 0 && (
          <p className="px-1 text-[12px] font-medium text-emerald-800">
            Give back: {change.map(([d, n]) => `${n} × ₹${d}`).join(" + ")}
          </p>
        )}
        {counted && !Number.isInteger(due) && difference > 0 && (
          <p className="px-1 text-[12px] text-[#6B7280]">Paise are rounded when suggesting notes.</p>
        )}
      </div>
    </div>
  );
}
