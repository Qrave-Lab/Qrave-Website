"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ModernFoodUI from "../(pages)/menu/MenuUi";
import { api } from "@/app/lib/api";
import { resolveRestaurantIdFromTenantSlug } from "@/app/lib/tenant";
import { useCartStore } from "@/stores/cartStore";

type ThemeConfig = {
  preset?: "thai" | "indian" | "minimal" | "";
  font_family?: string;
  bg_image_url?: string;
  bg_overlay_opacity?: number;
  card_style?: "rounded" | "soft" | "sharp" | "";
  button_style?: "solid" | "outline" | "glass" | "";
  motif?: "thai" | "indian" | "minimal" | "custom" | "";
  ornament_level?: "off" | "subtle" | "bold" | "";
  header_style?: "classic" | "elegant" | "festival" | "";
  pattern_style?: "none" | "silk" | "mandala" | "waves" | "leaf" | "";
  section_icon?: string;
  icon_pack?: "auto" | "thai" | "indian" | "minimal" | "";
  colors?: {
    bg?: string;
    surface?: string;
    text?: string;
    muted?: string;
    accent?: string;
    accent_text?: string;
  };
};

export default function MenuClient({ table }: { table: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clearCart = useCartStore((state) => state.clearCart);
  const menuCache = useCartStore((state) => state.menuCache);
  const setMenuCache = useCartStore((state) => state.setMenuCache);
  const [items, setItems] = useState<any[] | null>(() => {
    return menuCache && menuCache.length > 0 ? menuCache : null;
  });
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [currentTableNumber, setCurrentTableNumber] = useState<string | null>(null);
  const [isOccupiedNotice, setIsOccupiedNotice] = useState(false);
  const [isOrderingEnabled, setIsOrderingEnabled] = useState(true);
  const [initialThemeConfig, setInitialThemeConfig] = useState<ThemeConfig | undefined>(() => {
    if (typeof window === "undefined") return undefined;
    try {
      const cached = localStorage.getItem("menu_theme_config");
      return cached ? (JSON.parse(cached) as ThemeConfig) : undefined;
    } catch {
      return undefined;
    }
  });

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
          suppressErrorLog: true,
          skipAuthRedirect: true,
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
            setSessionError(
              "No restaurant ID was resolved. Please make sure to append the restaurant parameter to the URL, for example: ?table=1&restaurant=YOUR_RESTAURANT_ID"
            );
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
        const restaurantIdForTheme =
          localStorage.getItem("restaurant_id") ||
          detailsRestaurantIdFromSession(session || undefined) ||
          resolvedRestaurant ||
          "";
        const [menu, themeRes] = await Promise.all([
          loadMenu(session || undefined),
          restaurantIdForTheme
            ? api<{ theme_config?: ThemeConfig }>(`/public/restaurants/${restaurantIdForTheme}/theme`, {
              skipAuthRedirect: true,
              suppressErrorLog: true,
            }).catch(() => ({} as { theme_config?: ThemeConfig }))
            : Promise.resolve({} as { theme_config?: ThemeConfig }),
        ]);
        if (themeRes?.theme_config) {
          setInitialThemeConfig(themeRes.theme_config);
          localStorage.setItem("menu_theme_config", JSON.stringify(themeRes.theme_config));
        } else {
          try {
            const cached = localStorage.getItem("menu_theme_config");
            if (cached) setInitialThemeConfig(JSON.parse(cached));
          } catch { }
        }
        setItems(menu);
        setMenuCache(menu);
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
                try {
                  const rid = localStorage.getItem("restaurant_id");
                  if (rid) {
                    const themeRes = await api<{ theme_config?: ThemeConfig }>(`/public/restaurants/${rid}/theme`, {
                      skipAuthRedirect: true,
                      suppressErrorLog: true,
                    });
                    if (themeRes?.theme_config) {
                      setInitialThemeConfig(themeRes.theme_config);
                      localStorage.setItem("menu_theme_config", JSON.stringify(themeRes.theme_config));
                    }
                  }
                } catch { }
                const menu = await loadMenu(session);
                setItems(menu);
                setMenuCache(menu);
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
        interval = window.setInterval(syncSessionDetails, 30000);
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
        <div className="ml-orb ml-orb-1" />
        <div className="ml-orb ml-orb-2" />
        <div className="ml-orb ml-orb-3" />

        <div className="ml-ring-wrap">
          <svg className="ml-ring-svg" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="60" cy="60" r="54" stroke="rgba(15,23,42,0.08)" strokeWidth="2.5"/>
            <circle cx="60" cy="60" r="54" stroke="url(#mlRingGrad)" strokeWidth="2.5"
              strokeLinecap="round" strokeDasharray="100 240" className="ml-ring-arc"/>
            <defs>
              <linearGradient id="mlRingGrad" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
                <stop stopColor="#0F172A"/>
                <stop offset="1" stopColor="#0F172A" stopOpacity="0"/>
              </linearGradient>
            </defs>
          </svg>
          <div className="ml-ring-icon">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <ellipse cx="16" cy="24" rx="10" ry="2.5" fill="rgba(15,23,42,0.08)"/>
              <path d="M8 16c0-4.418 3.582-8 8-8s8 3.582 8 8" stroke="#0F172A" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="16" cy="20" r="2.5" fill="#0F172A"/>
              <path d="M7 23h18" stroke="rgba(15,23,42,0.25)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
        </div>

        <div className="ml-wordmark">
          {"Qrave".split("").map((char, i) => (
            <span key={i} className="ml-letter" style={{ animationDelay: `${0.07 * i + 0.25}s` }}>
              {char}
            </span>
          ))}
        </div>

        <p className="ml-tagline">Loading your menu…</p>

        <div className="ml-progress">
          <div className="ml-progress-fill" />
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
      initialThemeConfig={initialThemeConfig}
    />
  );
}

function detailsRestaurantIdFromSession(_sessionId?: string): string | null {
  return null;
}

const menuLoadingStyles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Playfair+Display:wght@700&display=swap');

  *, *::before, *::after { box-sizing: border-box; }

  .ml-loader {
    min-height: 100vh; min-height: 100dvh;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 20px;
    background: #FAF9F6;
    position: relative; overflow: hidden;
    font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    padding: 32px;
  }

  .ml-orb {
    position: absolute; border-radius: 50%;
    filter: blur(80px); pointer-events: none;
    will-change: transform;
  }
  .ml-orb-1 {
    width: 380px; height: 380px;
    background: radial-gradient(circle, rgba(15,23,42,0.04) 0%, transparent 70%);
    top: -80px; left: -100px;
    animation: mlOrbDrift1 12s ease-in-out infinite;
  }
  .ml-orb-2 {
    width: 300px; height: 300px;
    background: radial-gradient(circle, rgba(100,116,139,0.06) 0%, transparent 70%);
    bottom: -60px; right: -80px;
    animation: mlOrbDrift2 15s ease-in-out infinite;
  }
  .ml-orb-3 {
    width: 220px; height: 220px;
    background: radial-gradient(circle, rgba(15,23,42,0.03) 0%, transparent 70%);
    top: 40%; left: 50%; transform: translate(-50%, -50%);
    animation: mlOrbDrift3 10s ease-in-out infinite;
  }

  .ml-ring-wrap {
    position: relative; width: 120px; height: 120px;
    display: flex; align-items: center; justify-content: center;
    animation: mlRingIn 0.7s cubic-bezier(0.34,1.56,0.64,1) both;
  }
  .ml-ring-svg {
    position: absolute; inset: 0; width: 100%; height: 100%;
    animation: mlRingRotate 2.4s linear infinite;
  }
  .ml-ring-arc { transform-origin: center; }
  .ml-ring-icon {
    position: relative; z-index: 1;
    width: 72px; height: 72px;
    background: #FFFFFF;
    border: 1px solid rgba(15,23,42,0.08);
    border-radius: 22px;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 20px rgba(15,23,42,0.07), 0 1px 3px rgba(15,23,42,0.04);
  }

  .ml-wordmark {
    display: flex; align-items: baseline; gap: 0;
    z-index: 2;
  }
  .ml-letter {
    font-family: 'Playfair Display', serif;
    font-size: 48px; font-weight: 700;
    color: #0F172A;
    letter-spacing: -1.5px;
    display: inline-block;
    opacity: 0;
    animation: mlLetterReveal 0.5s cubic-bezier(0.22,1,0.36,1) forwards;
  }

  .ml-tagline {
    color: #64748B;
    font-size: 11px; font-weight: 500;
    letter-spacing: 0.18em; text-transform: uppercase;
    margin: 0;
    animation: mlFadeUp 0.6s ease 0.7s both;
  }

  .ml-progress {
    width: 140px; height: 2px;
    background: rgba(15,23,42,0.08);
    border-radius: 2px; overflow: hidden;
    animation: mlFadeUp 0.6s ease 0.8s both;
  }
  .ml-progress-fill {
    height: 100%; width: 35%;
    background: #0F172A;
    border-radius: 2px;
    animation: mlProgressSlide 1.6s ease-in-out infinite;
  }

  @keyframes mlOrbDrift1 {
    0%, 100% { transform: translate(0,0) scale(1); }
    50% { transform: translate(30px,20px) scale(1.05); }
  }
  @keyframes mlOrbDrift2 {
    0%, 100% { transform: translate(0,0) scale(1); }
    50% { transform: translate(-20px,-30px) scale(1.08); }
  }
  @keyframes mlOrbDrift3 {
    0%, 100% { transform: translate(-50%,-50%) scale(1); }
    50% { transform: translate(-50%,-50%) scale(1.15); }
  }
  @keyframes mlRingIn {
    from { opacity: 0; transform: scale(0.6); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes mlRingRotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes mlLetterReveal {
    0% { opacity: 0; transform: translateY(16px); filter: blur(6px); }
    100% { opacity: 1; transform: translateY(0); filter: blur(0); }
  }
  @keyframes mlFadeUp {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes mlProgressSlide {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(400%); }
  }
`;

