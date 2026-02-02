"use client";

import { use, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/app/lib/api";

export default function TablePage({ params }: { params: Promise<{ table: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { table } = use(params);
  const restaurantFromUrl = searchParams.get("restaurant") || searchParams.get("r");

  useEffect(() => {
    async function start() {
      if (!table) {
        router.replace("/menu");
        return;
      }

      try {
        const isUUID =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(table);
        const normalizedTable = table.trim().toLowerCase().startsWith("t") ? table.trim().slice(1) : table.trim();
        const tableNumber = Number.parseInt(normalizedTable, 10);
        const restaurantId = restaurantFromUrl || localStorage.getItem("restaurant_id");

        if (!Number.isNaN(tableNumber)) {
          if (!restaurantId) {
            router.replace("/menu");
            return;
          }
          const res = await api<{ session_id: string; restaurant_id?: string; table_number?: number }>("/public/session/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              restaurant_id: restaurantId,
              table_number: tableNumber,
            }),
            credentials: "include",
          });

          localStorage.setItem("session_id", res.session_id);
          localStorage.setItem("table_number", table);
          if (restaurantId) {
            localStorage.setItem("restaurant_id", restaurantId);
          }
        } else if (isUUID) {
          const res = await api<{ session_id: string; restaurant_id?: string; table_number?: number }>("/public/session/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              table_id: table,
            }),
            credentials: "include",
          });

          localStorage.setItem("session_id", res.session_id);
          if (res.restaurant_id) {
            localStorage.setItem("restaurant_id", res.restaurant_id);
          }
          if (res.table_number) {
            localStorage.setItem("table_number", String(res.table_number));
          }
        } else {
          router.replace("/menu");
          return;
        }

      } catch (e) {
        console.error("Failed to start session:", e);
        localStorage.removeItem("session_id");
      }

      const storedTable = localStorage.getItem("table_number") || table;
      const storedRestaurant = localStorage.getItem("restaurant_id") || restaurantFromUrl;
      const base = `/menu?table=${storedTable}`;
      const withRestaurant = storedRestaurant ? `${base}&restaurant=${storedRestaurant}` : base;
      router.replace(withRestaurant);
    }

    start();
  }, [table, router, restaurantFromUrl]);

  return <div>Loading table {table}...</div>;
}
