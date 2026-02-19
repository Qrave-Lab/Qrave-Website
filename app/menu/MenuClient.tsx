"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ModernFoodUI from "../(pages)/menu/MenuUi";
import { api } from "@/app/lib/api";
import { resolveRestaurantIdFromTenantSlug } from "@/app/lib/tenant";
import { useCartStore } from "@/stores/cartStore";

export default function MenuClient({ table }: { table: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<any[] | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [currentTableNumber, setCurrentTableNumber] = useState<string | null>(null);
  const [isOccupiedNotice, setIsOccupiedNotice] = useState(false);
  const [isOrderingEnabled, setIsOrderingEnabled] = useState(true);
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
        const details = await api<{ table_number?: number; restaurant_id?: string; session_id?: string; ordering_enabled?: boolean }>("/api/customer/session", {
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

        }
        if (typeof details?.ordering_enabled === "boolean") {
          setIsOrderingEnabled(details.ordering_enabled);
          localStorage.setItem("ordering_enabled", details.ordering_enabled ? "1" : "0");
        }
      } catch {
        // keep UI usable
      }
    };

    const ensureSessionAndLoad = async () => {
      let session = localStorage.getItem("session_id");
      let restaurantForSession =
        resolvedRestaurant || localStorage.getItem("restaurant_id");
      if (!restaurantForSession) {
        restaurantForSession = await resolveRestaurantIdFromTenantSlug();
      }

      const isUUID = (value: string) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

      if (!session && resolvedTable) {
        const normalizedTable = resolvedTable.trim().toLowerCase().startsWith("t")
          ? resolvedTable.trim().slice(1)
          : resolvedTable.trim();
        const tableNumber = Number.parseInt(normalizedTable, 10);
        if (!Number.isNaN(tableNumber)) {
          if (!restaurantForSession) {
            console.error("No restaurant found for session start");
            setItems([]);
            return;
          }
          try {
            const res = await api<{ session_id: string; is_occupied?: boolean; ordering_enabled?: boolean }>("/public/session/start", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                restaurant_id: restaurantForSession,
                table_number: tableNumber,
              }),
              credentials: "include",
            });
            session = res.session_id;
            localStorage.setItem("session_id", res.session_id);
            const occupied = Boolean(res?.is_occupied);
            if (occupied) localStorage.setItem("table_occupied", "1");
            else localStorage.removeItem("table_occupied");
            if (typeof res?.ordering_enabled === "boolean") {
              setIsOrderingEnabled(res.ordering_enabled);
              localStorage.setItem("ordering_enabled", res.ordering_enabled ? "1" : "0");
            }
            if (restaurantForSession) {
              localStorage.setItem("restaurant_id", restaurantForSession);
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
            const res = await api<{ session_id: string; restaurant_id?: string; table_number?: number; is_occupied?: boolean; ordering_enabled?: boolean }>("/public/session/start", {
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
            if (typeof res?.ordering_enabled === "boolean") {
              setIsOrderingEnabled(res.ordering_enabled);
              localStorage.setItem("ordering_enabled", res.ordering_enabled ? "1" : "0");
            }
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
          if (resolvedTable && restaurantForSession) {
            const tableNumber = Number.parseInt(resolvedTable, 10);
            if (!Number.isNaN(tableNumber)) {
              try {
                const res = await api<{ session_id: string; is_occupied?: boolean; ordering_enabled?: boolean }>("/public/session/start", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    restaurant_id: restaurantForSession,
                    table_number: tableNumber,
                  }),
                  credentials: "include",
                });
                session = res.session_id;
                localStorage.setItem("session_id", res.session_id);
                const occupied = Boolean(res?.is_occupied);
                if (occupied) localStorage.setItem("table_occupied", "1");
                else localStorage.removeItem("table_occupied");
                if (typeof res?.ordering_enabled === "boolean") {
                  setIsOrderingEnabled(res.ordering_enabled);
                  localStorage.setItem("ordering_enabled", res.ordering_enabled ? "1" : "0");
                }
                if (restaurantForSession) {
                  localStorage.setItem("restaurant_id", restaurantForSession);
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

  if (!items) return (
    <>
      <style>{menuLoadingStyles}</style>
      <div className="ml-loader">
        <div className="ml-particle p1">🍕</div>
        <div className="ml-particle p2">🍜</div>
        <div className="ml-particle p3">🥗</div>
        <div className="ml-particle p4">🍰</div>
        <div className="ml-particle p5">☕</div>
        <div className="ml-particle p6">🍣</div>

        <div className="ml-plate">
          <div className="ml-plate-inner" />
          <div className="ml-plate-rim" />
        </div>

        <div className="ml-brand">
          {"Qrave".split("").map((char, i) => (
            <span key={i} className="ml-letter" style={{ animationDelay: `${0.15 * i}s` }}>{char}</span>
          ))}
        </div>

        <p className="ml-tagline">Loading your menu…</p>

        <div className="ml-bar-track">
          <div className="ml-bar-fill" />
        </div>
      </div>
    </>
  );

  return (
    <ModernFoodUI
      menuItems={items}
      tableNumber={currentTableNumber || resolvedTable || "N/A"}
      isTableOccupied={isOccupiedNotice}
      orderingEnabled={isOrderingEnabled}
    />
  );
}

const menuLoadingStyles = `
  .ml-loader {
    min-height: 100vh; min-height: 100dvh;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 28px;
    background: #ffffff;
    position: relative; overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    padding: 24px;
  }
  .ml-particle {
    position: absolute; font-size: 22px;
    opacity: 0; pointer-events: none;
    animation: mlFloat 4s ease-in-out infinite;
  }
  .p1 { top: 12%; left: 10%; animation-delay: 0s; }
  .p2 { top: 18%; right: 14%; animation-delay: 0.7s; }
  .p3 { bottom: 22%; left: 16%; animation-delay: 1.4s; }
  .p4 { bottom: 14%; right: 10%; animation-delay: 0.3s; }
  .p5 { top: 40%; left: 6%; animation-delay: 1.8s; }
  .p6 { top: 35%; right: 8%; animation-delay: 1s; }
  .ml-plate {
    width: 160px; height: 160px;
    border-radius: 50%; position: relative;
    animation: mlPlateIn 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }
  .ml-plate-rim {
    position: absolute; inset: 0;
    border-radius: 50%;
    border: 3px solid #e2e8f0;
    animation: mlRimSpin 8s linear infinite;
    border-top-color: #0f172a;
    border-right-color: transparent;
  }
  .ml-plate-inner {
    position: absolute; inset: 18px;
    border-radius: 50%;
    background: radial-gradient(circle at 40% 40%, #f8fafc, #f1f5f9);
    border: 1px solid #e2e8f0;
    box-shadow: inset 0 2px 8px rgba(0,0,0,0.04);
  }
  .ml-brand {
    display: flex; gap: 2px;
    z-index: 2; margin-top: -20px;
  }
  .ml-letter {
    font-size: 48px; font-weight: 900;
    letter-spacing: -1px; color: #0f172a;
    display: inline-block;
    opacity: 0;
    animation: mlLetterIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }
  .ml-tagline {
    color: #94a3b8; font-size: 14px; font-weight: 500;
    letter-spacing: 0.5px; margin: 0;
    animation: mlFadeUp 0.8s ease 0.9s both;
  }
  .ml-bar-track {
    width: 120px; height: 3px;
    border-radius: 3px; background: #f1f5f9;
    overflow: hidden;
    animation: mlFadeUp 0.8s ease 1s both;
  }
  .ml-bar-fill {
    width: 40%; height: 100%;
    border-radius: 3px;
    background: #0f172a;
    animation: mlShimmer 1.4s ease-in-out infinite;
  }
  @keyframes mlLetterIn {
    0% { opacity: 0; transform: translateY(40px) scale(0.3) rotate(-20deg); filter: blur(8px); }
    100% { opacity: 1; transform: translateY(0) scale(1) rotate(0deg); filter: blur(0); }
  }
  @keyframes mlPlateIn {
    0% { opacity: 0; transform: scale(0.4) rotate(-90deg); }
    100% { opacity: 1; transform: scale(1) rotate(0deg); }
  }
  @keyframes mlRimSpin { to { transform: rotate(360deg); } }
  @keyframes mlFloat {
    0%, 100% { opacity: 0; transform: translateY(0) scale(0.8); }
    30% { opacity: 0.3; }
    50% { opacity: 0.4; transform: translateY(-18px) scale(1); }
    70% { opacity: 0.3; }
  }
  @keyframes mlShimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(350%); }
  }
  @keyframes mlFadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;
