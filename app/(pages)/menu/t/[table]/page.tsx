"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/app/lib/api";
import { useCartStore } from "@/stores/cartStore";

export default function TablePage({ params }: { params: Promise<{ table: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { table } = use(params);
  const clearCart = useCartStore((state) => state.clearCart);
  const [tableError, setTableError] = useState<string | null>(null);
  const restaurantFromUrl = searchParams.get("restaurant") || searchParams.get("r");
  const normalizedScannedTable = useMemo(
    () => table.trim().toLowerCase().startsWith("t") ? table.trim().slice(1) : table.trim(),
    [table]
  );

  useEffect(() => {
    async function start() {
      setTableError(null);
      if (!table) {
        router.replace("/menu");
        return;
      }

      let redirectTable = table;
      let redirectRestaurant = restaurantFromUrl || localStorage.getItem("restaurant_id") || "";

      try {
        const isUUID =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(table);
        const normalizedTable = normalizedScannedTable;
        const tableNumber = Number.parseInt(normalizedTable, 10);
        const restaurantId = restaurantFromUrl || localStorage.getItem("restaurant_id");
        const nextTable = !Number.isNaN(tableNumber) ? String(tableNumber) : table;
        redirectTable = nextTable;
        redirectRestaurant = restaurantId || "";
        localStorage.setItem("session_context_key", `${restaurantId || "na"}::${nextTable || "na"}`);
        // QR scan should always start fresh for the scanned table context.
        localStorage.removeItem("session_id");
        localStorage.removeItem("order_id");
        localStorage.removeItem("cart-storage");
        clearCart();

        if (!Number.isNaN(tableNumber)) {
          if (!restaurantId) {
            router.replace("/menu");
            return;
          }
          const res = await api<{ session_id: string; restaurant_id?: string; table_number?: number; is_occupied?: boolean }>("/public/session/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              restaurant_id: restaurantId,
              table_number: tableNumber,
            }),
            credentials: "include",
          });

          localStorage.setItem("session_id", res.session_id);
          const effectiveTable = res.table_number ? String(res.table_number) : String(tableNumber);
          localStorage.setItem("table_number", effectiveTable);
          if (res.is_occupied) localStorage.setItem("table_occupied", "1");
          else localStorage.removeItem("table_occupied");
          redirectTable = effectiveTable;
          if (restaurantId) {
            localStorage.setItem("restaurant_id", restaurantId);
            redirectRestaurant = restaurantId;
          }
        } else if (isUUID) {
          const res = await api<{ session_id: string; restaurant_id?: string; table_number?: number; is_occupied?: boolean }>("/public/session/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              table_id: table,
            }),
            credentials: "include",
          });

          localStorage.setItem("session_id", res.session_id);
          if (res.is_occupied) localStorage.setItem("table_occupied", "1");
          else localStorage.removeItem("table_occupied");
          if (res.restaurant_id) {
            localStorage.setItem("restaurant_id", res.restaurant_id);
            redirectRestaurant = res.restaurant_id;
          }
          if (res.table_number) {
            localStorage.setItem("table_number", String(res.table_number));
            redirectTable = String(res.table_number);
          }
        } else {
          router.replace("/menu");
          return;
        }

      } catch (e: any) {
        console.error("Failed to start session:", e);
        localStorage.removeItem("session_id");
        if (e?.status === 403 && String(e?.message || "").toLowerCase().includes("disabled")) {
          setTableError("This table is currently disabled. Please contact the staff.");
          return;
        }
        if (e?.status === 404) {
          setTableError("This table QR is invalid or no longer active.");
          return;
        }
        setTableError("Unable to start session for this table.");
        return;
      }

      const storedTable = localStorage.getItem("table_number") || table;
      const storedRestaurant = localStorage.getItem("restaurant_id") || restaurantFromUrl;
      const base = `/menu?table=${redirectTable || storedTable}`;
      const withRestaurant = (redirectRestaurant || storedRestaurant)
        ? `${base}&restaurant=${redirectRestaurant || storedRestaurant}`
        : base;
      router.replace(withRestaurant);
    }

    start();
  }, [table, router, restaurantFromUrl, clearCart, normalizedScannedTable]);

  if (tableError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-6">
        <div className="max-w-md rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-bold text-slate-900">Table unavailable</h1>
          <p className="mt-2 text-sm text-slate-600">{tableError}</p>
        </div>
      </div>
    );
  }

  return <div>Loading table {table}...</div>;
}
