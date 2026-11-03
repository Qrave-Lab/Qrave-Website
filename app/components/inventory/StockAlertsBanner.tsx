"use client";

import { api } from "@/app/lib/api";
import { AlertTriangle, EyeOff } from "lucide-react";
import React, { useEffect, useState } from "react";

type Alerts = {
  low_stock: {
    ingredient_id: string;
    ingredient: string;
    stock: number;
    reorder_threshold: number;
  }[];
  auto_out_of_stock: { id: string; name: string }[];
};

/** Low-stock ingredients and dishes hidden automatically because they ran out. */
export default function StockAlertsBanner({ refreshKey }: { refreshKey?: number }) {
  const [alerts, setAlerts] = useState<Alerts | null>(null);

  useEffect(() => {
    api<Alerts>("/api/admin/inventory/advanced/alerts", { noCache: true })
      .then(setAlerts)
      .catch(() => setAlerts(null));
  }, [refreshKey]);

  if (!alerts) return null;
  const low = alerts.low_stock || [];
  const hidden = alerts.auto_out_of_stock || [];
  if (low.length === 0 && hidden.length === 0) return null;

  return (
    <div className="grid gap-3 border-b border-slate-100 bg-white px-8 py-4 md:grid-cols-2">
      {low.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-800">
            <AlertTriangle className="h-4 w-4" /> {low.length} ingredient
            {low.length === 1 ? "" : "s"} below reorder level
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {low.slice(0, 12).map((i) => (
              <li
                key={i.ingredient_id}
                className="rounded-lg border border-amber-200 bg-white px-2.5 py-1 text-[11px] font-bold text-amber-900"
              >
                {i.ingredient}{" "}
                <span className="font-medium text-amber-600">
                  {i.stock} / {i.reorder_threshold}
                </span>
              </li>
            ))}
            {low.length > 12 && (
              <li className="px-1 py-1 text-[11px] font-bold text-amber-700">
                +{low.length - 12} more
              </li>
            )}
          </ul>
        </div>
      )}
      {hidden.length > 0 && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-rose-800">
            <EyeOff className="h-4 w-4" /> {hidden.length} dish
            {hidden.length === 1 ? "" : "es"} hidden — out of stock
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {hidden.slice(0, 12).map((d) => (
              <li
                key={d.id}
                className="rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-[11px] font-bold text-rose-900"
              >
                {d.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
