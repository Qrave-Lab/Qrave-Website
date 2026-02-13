"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ModernFoodUI from "../(pages)/menu/MenuUi";
import { api } from "@/app/lib/api";
import { useCartStore } from "@/stores/cartStore";

export default function MenuClient({ table }: { table: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<any[] | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [currentTableNumber, setCurrentTableNumber] = useState<string | null>(null);
  const [isOccupiedNotice, setIsOccupiedNotice] = useState(false);
  const clearCart = useCartStore((state) => state.clearCart);

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

    const sessionId = localStorage.getItem("session_id");
    const previousTable = localStorage.getItem("table_number");
    const previousRestaurant = localStorage.getItem("restaurant_id");
    const normalizedTable =
      resolvedTable && resolvedTable.trim().toLowerCase().startsWith("t")
        ? resolvedTable.trim().slice(1)
        : resolvedTable;
    // If session is already active and URL is stale (e.g. table moved by staff),
    // keep current session context and let server-sync update URL/table.
    if (sessionId && previousTable && normalizedTable && previousTable !== normalizedTable) {
      localStorage.setItem(
        "session_context_key",
        `${previousRestaurant || resolvedRestaurant || "na"}::${previousTable}`
      );
      return;
    }

    const contextChanged =
      (!!normalizedTable && previousTable !== normalizedTable) ||
      (!!resolvedRestaurant && previousRestaurant !== resolvedRestaurant);
    if (contextChanged && !sessionId) {
      localStorage.removeItem("session_id");
      localStorage.removeItem("order_id");
      localStorage.removeItem("cart-storage");
      clearCart();
    }

    if (resolvedTable) {
      localStorage.setItem("table_number", normalizedTable || resolvedTable);
    }
    if (resolvedRestaurant) {
      localStorage.setItem("restaurant_id", resolvedRestaurant);
    }
    localStorage.setItem(
      "session_context_key",
      `${resolvedRestaurant || "na"}::${normalizedTable || resolvedTable || "na"}`
    );
  }, [resolvedTable, resolvedRestaurant, clearCart]);

  useEffect(() => {
    setSessionError(null);
    let interval: number | null = null;
    let cancelled = false;

    const syncSessionDetails = async () => {
      try {
        const details = await api<{ table_number?: number; restaurant_id?: string; session_id?: string }>("/api/customer/session", {
          credentials: "include",
        });
        if (cancelled) return;
        const serverTable = details?.table_number ? String(details.table_number) : null;
        if (serverTable) {
          localStorage.setItem("table_number", serverTable);
          setCurrentTableNumber(serverTable);
          const restaurant = details?.restaurant_id || resolvedRestaurant || localStorage.getItem("restaurant_id");
          if (restaurant) {
            localStorage.setItem("restaurant_id", restaurant);
          }
          localStorage.setItem(
            "session_context_key",
            `${restaurant || "na"}::${serverTable}`
          );
          const currentUrlTable = tableFromUrl;
          if (currentUrlTable !== serverTable) {
            const base = `/menu?table=${encodeURIComponent(serverTable)}`;
            const withRestaurant = restaurant
              ? `${base}&restaurant=${encodeURIComponent(restaurant)}`
              : base;
            router.replace(withRestaurant);
          }
        }
      } catch {
        // keep UI usable
      }
    };

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
            const res = await api<{ session_id: string; is_occupied?: boolean }>("/public/session/start", {
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
            const occupied = Boolean(res?.is_occupied);
            if (occupied) localStorage.setItem("table_occupied", "1");
            else localStorage.removeItem("table_occupied");
            if (resolvedRestaurant) {
              localStorage.setItem("restaurant_id", resolvedRestaurant);
            }
          } catch (err) {
            console.error("Failed to start session", err);
            localStorage.removeItem("session_id");
            if ((err as any)?.status === 403) {
              setSessionError("This table is currently disabled. Please ask staff for assistance.");
            }
            if ((err as any)?.status === 404) {
              setSessionError("This table QR is invalid or no longer active.");
            }
          }
        } else if (isUUID(resolvedTable)) {
          try {
            const res = await api<{ session_id: string; restaurant_id?: string; table_number?: number; is_occupied?: boolean }>("/public/session/start", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                table_id: resolvedTable,
              }),
              credentials: "include",
            });
            session = res.session_id;
            localStorage.setItem("session_id", res.session_id);
            if (res?.is_occupied) localStorage.setItem("table_occupied", "1");
            else localStorage.removeItem("table_occupied");
            if (res.restaurant_id) {
              localStorage.setItem("restaurant_id", res.restaurant_id);
            }
            if (res.table_number) {
              localStorage.setItem("table_number", String(res.table_number));
            }
          } catch (err) {
            console.error("Failed to start session", err);
            localStorage.removeItem("session_id");
            if ((err as any)?.status === 403) {
              setSessionError("This table is currently disabled. Please ask staff for assistance.");
            }
            if ((err as any)?.status === 404) {
              setSessionError("This table QR is invalid or no longer active.");
            }
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
        setIsOccupiedNotice(localStorage.getItem("table_occupied") === "1");
        const menu = await loadMenu(session || undefined);
        setItems(menu);
        await syncSessionDetails();
      } catch (err: any) {
        if (err?.status === 401 || String(err?.message || "").includes("session expired")) {
          localStorage.removeItem("session_id");
          session = null;
          if (resolvedTable && resolvedRestaurant) {
            const tableNumber = Number.parseInt(resolvedTable, 10);
            if (!Number.isNaN(tableNumber)) {
              try {
                const res = await api<{ session_id: string; is_occupied?: boolean }>("/public/session/start", {
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
                const occupied = Boolean(res?.is_occupied);
                if (occupied) localStorage.setItem("table_occupied", "1");
                else localStorage.removeItem("table_occupied");
                if (resolvedRestaurant) {
                  localStorage.setItem("restaurant_id", resolvedRestaurant);
                }
                const menu = await loadMenu(session);
                setItems(menu);
                setIsOccupiedNotice(localStorage.getItem("table_occupied") === "1");
                await syncSessionDetails();
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

      if (!cancelled) {
        interval = window.setInterval(syncSessionDetails, 5000);
      }
    };

    ensureSessionAndLoad();
    return () => {
      cancelled = true;
      if (interval !== null) window.clearInterval(interval);
    };
  }, [resolvedTable, resolvedRestaurant, router, tableFromUrl]);

  if (sessionError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-6">
        <div className="max-w-md rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-bold text-slate-900">Table unavailable</h1>
          <p className="mt-2 text-sm text-slate-600">{sessionError}</p>
        </div>
      </div>
    );
  }

  if (!items) return <div>Loading menu...</div>;

  return (
    <ModernFoodUI
      menuItems={items}
      tableNumber={currentTableNumber || resolvedTable || "N/A"}
      isTableOccupied={isOccupiedNotice}
    />
  );
}
