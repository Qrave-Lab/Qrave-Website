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
        const restaurantId = restaurantFromUrl || localStorage.getItem("restaurant_id");
        if (!restaurantId) {
          router.replace("/menu");
          return;
        }
        const tableNumber = Number.parseInt(table, 10);
        if (Number.isNaN(tableNumber)) {
          router.replace("/menu");
          return;
        }
        const res = await api<{ session_id: string }>("/public/session/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            restaurant_id: restaurantId,
            table_number: tableNumber,
          }),
          credentials: "include",
        });

        console.log("Started session:", res.session_id);

        localStorage.setItem("session_id", res.session_id);
        localStorage.setItem("table_number", table);
        if (restaurantId) {
          localStorage.setItem("restaurant_id", restaurantId);
        }

      } catch (e) {
        console.error("Failed to start session:", e);
      }

      const base = `/menu?table=${table}`;
      const withRestaurant = restaurantFromUrl ? `${base}&restaurant=${restaurantFromUrl}` : base;
      router.replace(withRestaurant);
    }

    start();
  }, [table, router, restaurantFromUrl]);

  return <div>Loading table {table}...</div>;
}
