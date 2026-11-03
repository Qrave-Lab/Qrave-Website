"use client";

import { Calculator, Hash } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

const DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5, 2, 1] as const;

export const fmtINR = (n: number) =>
  `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type Props = {
  /** Called whenever the counted total changes. null = nothing entered yet. */
  onChange: (total: number | null) => void;
  autoFocus?: boolean;
};

/**
 * Cash counting widget: either tally notes/coins by denomination or type the
 * grand total directly. Reports the total to the parent.
 */
export default function CashCounter({ onChange, autoFocus }: Props) {
  const [mode, setMode] = useState<"count" | "manual">("count");
  const [counts, setCounts] = useState<Record<number, string>>({});
  const [manual, setManual] = useState("");

  const countedTotal = useMemo(
    () =>
      DENOMINATIONS.reduce(
        (sum, d) => sum + d * (parseInt(counts[d] || "0", 10) || 0),
        0,
      ),
    [counts],
  );
  const anyCounted = DENOMINATIONS.some((d) => (counts[d] || "") !== "");

  useEffect(() => {
    if (mode === "manual") {
      const v = parseFloat(manual);
      onChange(isNaN(v) || v < 0 ? null : Math.round(v * 100) / 100);
    } else {
      onChange(anyCounted ? countedTotal : null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, manual, countedTotal, anyCounted]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Count the drawer
        </span>
        <div className="flex rounded-lg bg-slate-100 p-0.5 text-[10px] font-black uppercase tracking-wider">
          <button
            type="button"
            onClick={() => setMode("count")}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 transition-all ${mode === "count" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
          >
            <Calculator className="h-3 w-3" /> Notes
          </button>
          <button
            type="button"
            onClick={() => setMode("manual")}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 transition-all ${mode === "manual" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
          >
            <Hash className="h-3 w-3" /> Total
          </button>
        </div>
      </div>

      {mode === "count" ? (
        <div className="grid grid-cols-3 gap-2 p-3">
          {DENOMINATIONS.map((d, i) => (
            <label
              key={d}
              className="rounded-xl border border-slate-200 bg-slate-50/60 px-2.5 py-2 focus-within:border-[#fe5c13] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#fe5c13]/10"
            >
              <span className="block text-[10px] font-black text-slate-400">
                ₹{d} ×
              </span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                autoFocus={autoFocus && i === 0}
                value={counts[d] ?? ""}
                onChange={(e) =>
                  setCounts((c) => ({ ...c, [d]: e.target.value }))
                }
                placeholder="0"
                className="w-full bg-transparent text-sm font-extrabold text-slate-800 outline-none placeholder:text-slate-300"
              />
            </label>
          ))}
        </div>
      ) : (
        <div className="p-3">
          <input
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            autoFocus={autoFocus}
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-lg font-extrabold text-slate-800 shadow-sm focus:border-[#fe5c13] focus:outline-none focus:ring-4 focus:ring-[#fe5c13]/10"
          />
        </div>
      )}

      {mode === "count" && (
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-4 py-2.5 rounded-b-2xl">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Counted total
          </span>
          <span className="text-base font-black text-slate-900">
            {fmtINR(countedTotal)}
          </span>
        </div>
      )}
    </div>
  );
}

/** Reconciliation banner shared by shift clock-out and drawer close. */
export function VarianceBanner({
  expected,
  counted,
}: {
  expected: number;
  counted: number | null;
}) {
  if (counted === null) return null;
  const diff = Math.round((counted - expected) * 100) / 100;
  if (diff === 0) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-bold text-emerald-800">
        Drawer is balanced — no difference.
      </div>
    );
  }
  const short = diff < 0;
  return (
    <div
      className={`rounded-xl border px-3.5 py-2.5 text-xs ${short ? "border-rose-200 bg-rose-50 text-rose-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}
    >
      <p className="font-black uppercase tracking-wider text-[10px]">
        {short ? "Shortage" : "Overage"} of {fmtINR(Math.abs(diff))}
      </p>
      <p className="mt-0.5 font-medium opacity-80">
        Expected {fmtINR(expected)} · Counted {fmtINR(counted)}. A note is
        required, and large differences need a manager PIN.
      </p>
    </div>
  );
}
