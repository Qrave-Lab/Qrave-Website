"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ModernFoodUI from "../(pages)/menu/MenuUi";
import { api } from "@/app/lib/api";

export default function MenuClient({ table }: { table: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<any[] | null>(null);

  const tableFromUrl = searchParams.get("table");
  const restaurantFromUrl =
    searchParams.get("restaurant") || searchParams.get("r");
  const resolvedTable = useMemo(() => {
    return (
      tableFromUrl ||
      table ||
      (typeof window !== "undefined" ? localStorage.getItem("table_number") : null) ||
      (typeof window !== "undefined" ? localStorage.getItem("table") : null) ||
      null
    );
  }, [tableFromUrl, table]);

  const resolvedRestaurant = useMemo(() => {
    return (
      restaurantFromUrl ||
      (typeof window !== "undefined" ? localStorage.getItem("restaurant_id") : null) ||
      null
    );
  }, [restaurantFromUrl]);

  useEffect(() => {
    if (!tableFromUrl && resolvedTable) {
      const base = `/menu?table=${encodeURIComponent(resolvedTable)}`;
      const withRestaurant = resolvedRestaurant
        ? `${base}&restaurant=${encodeURIComponent(resolvedRestaurant)}`
        : base;
      router.replace(withRestaurant);
    }
  }, [router, tableFromUrl, resolvedTable, resolvedRestaurant]);

  useEffect(() => {
    const ensureSessionAndLoad = async () => {
      let session = localStorage.getItem("session_id");

      if (!session && resolvedTable) {
        if (!resolvedRestaurant) {
          console.error("No restaurant found for session start");
          setItems([]);
          return;
        }
        const tableNumber = Number.parseInt(resolvedTable, 10);
        if (!Number.isNaN(tableNumber)) {
          try {
            const res = await api<{ session_id: string }>("/public/session/start", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                restaurant_id: resolvedRestaurant,
                table_number: tableNumber,
              }),
              credentials: "include",
            });
            session = res.session_id;
            localStorage.setItem("session_id", res.session_id);
            if (resolvedRestaurant) {
              localStorage.setItem("restaurant_id", resolvedRestaurant);
            }
          } catch (err) {
            console.error("Failed to start session", err);
          }
        }
      }

      if (!session) {
        setItems([]);
        return;
      }

      api<any[]>(`/api/customer/menu`, { credentials: "include" })
        .then(setItems)
        .catch((err) => {
          console.error("Menu fetch failed", err);
          setItems([]);
        });
    };

    ensureSessionAndLoad();
  }, [resolvedTable]);

  if (!items) return <div>Loading menu...</div>;

  return <ModernFoodUI menuItems={items} tableNumber={resolvedTable ?? "N/A"} />;
}
