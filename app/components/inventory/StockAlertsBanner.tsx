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
    <div className="mb-5 grid gap-3 md:grid-cols-2">
      {low.length > 0 && (
        <section className="rounded-2xl border border-[#E8E8E3] bg-white p-4">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-[#0F1117]">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            {low.length} ingredient{low.length === 1 ? "" : "s"} below reorder level
          </p>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {low.slice(0, 12).map((i) => (
              <li
                key={i.ingredient_id}
                className="rounded-lg border border-[#E8E8E3] bg-[#FAFAF7] px-2.5 py-1 text-[12px] font-medium text-[#0F1117]"
              >
                {i.ingredient}{" "}
                <span className="tabular-nums text-amber-700">
                  {i.stock} of {i.reorder_threshold}
                </span>
              </li>
            ))}
            {low.length > 12 && (
              <li className="px-1 py-1 text-[12px] font-medium text-[#6B7280]">
                +{low.length - 12} more
              </li>
            )}
          </ul>
        </section>
      )}
      {hidden.length > 0 && (
        <section className="rounded-2xl border border-[#E8E8E3] bg-white p-4">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-[#0F1117]">
            <EyeOff className="h-4 w-4 text-rose-600" />
            {hidden.length === 1 ? "1 dish is" : `${hidden.length} dishes are`} hidden from the menu because {hidden.length === 1 ? "it" : "they"} ran out
          </p>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {hidden.slice(0, 12).map((d) => (
              <li
                key={d.id}
                className="rounded-lg border border-rose-200/70 bg-rose-50 px-2.5 py-1 text-[12px] font-medium text-rose-800"
              >
                {d.name}
              </li>
            ))}
            {hidden.length > 12 && (
              <li className="px-1 py-1 text-[12px] font-medium text-[#6B7280]">
                +{hidden.length - 12} more
              </li>
            )}
          </ul>
        </section>
      )}
    </div>
  );
}
