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
    if (typeof window === "undefined") return;
    if (resolvedTable) {
      localStorage.setItem("table_number", resolvedTable);
    }
    if (resolvedRestaurant) {
      localStorage.setItem("restaurant_id", resolvedRestaurant);
    }
  }, [resolvedTable, resolvedRestaurant]);

  useEffect(() => {
    const ensureSessionAndLoad = async () => {
      let session = localStorage.getItem("session_id");

      const isUUID = (value: string) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

      if (!session && resolvedTable) {
        const normalizedTable = resolvedTable.trim().toLowerCase().startsWith("t")
          ? resolvedTable.trim().slice(1)
          : resolvedTable.trim();
        const tableNumber = Number.parseInt(normalizedTable, 10);
        if (!Number.isNaN(tableNumber)) {
          if (!resolvedRestaurant) {
            console.error("No restaurant found for session start");
            setItems([]);
            return;
          }
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
            localStorage.removeItem("session_id");
          }
        } else if (isUUID(resolvedTable)) {
          try {
            const res = await api<{ session_id: string; restaurant_id?: string; table_number?: number }>("/public/session/start", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                table_id: resolvedTable,
              }),
              credentials: "include",
            });
            session = res.session_id;
            localStorage.setItem("session_id", res.session_id);
            if (res.restaurant_id) {
              localStorage.setItem("restaurant_id", res.restaurant_id);
            }
            if (res.table_number) {
              localStorage.setItem("table_number", String(res.table_number));
            }
          } catch (err) {
            console.error("Failed to start session", err);
            localStorage.removeItem("session_id");
          }
        }
      }

      if (!session) {
        setItems([]);
        return;
      }

      const loadMenu = async (sessionId?: string) => {
        const menuPath = sessionId
          ? `/api/customer/menu?session_id=${sessionId}`
          : "/api/customer/menu";
        return api<any[]>(menuPath, { credentials: "include" });
      };

      try {
        const menu = await loadMenu(session || undefined);
        setItems(menu);
      } catch (err: any) {
        if (err?.status === 401 || String(err?.message || "").includes("session expired")) {
          localStorage.removeItem("session_id");
          session = null;
          if (resolvedTable && resolvedRestaurant) {
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
                const menu = await loadMenu(session);
                setItems(menu);
                return;
              } catch (e) {
                console.error("Menu fetch failed after session refresh", e);
              }
            }
          }
        } else {
          console.error("Menu fetch failed", err);
        }
        setItems([]);
      }
    };

    ensureSessionAndLoad();
  }, [resolvedTable]);

  if (!items) return <div>Loading menu...</div>;

  return <ModernFoodUI menuItems={items} tableNumber={resolvedTable ?? "N/A"} />;
}
