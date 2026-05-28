"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/app/lib/api";
import { resolveRestaurantIdFromTenantSlug } from "@/app/lib/tenant";
import { useCartStore } from "@/stores/cartStore";

type SessionResult = {
  session_id: string;
  restaurant_id?: string;
  table_number?: number;
  is_occupied?: boolean;
  ordering_enabled?: boolean;
};

type Phase = "loading" | "choosing" | "error";

export default function TablePage({ params }: { params: Promise<{ table: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { table } = use(params);
  const clearCart = useCartStore((state) => state.clearCart);
  const [phase, setPhase] = useState<Phase>("loading");
  const [tableError, setTableError] = useState<string>("");
  const [pendingRedirect, setPendingRedirect] = useState<string>("");

  const restaurantFromUrl = searchParams.get("restaurant") || searchParams.get("r");
  const normalizedScannedTable = useMemo(
    () => table.trim().toLowerCase().startsWith("t") ? table.trim().slice(1) : table.trim(),
    [table]
  );

  useEffect(() => {
    async function start() {
      setPhase("loading");
      setTableError("");

      if (!table) {
        router.replace("/menu");
        return;
      }

      let redirectTable = table;
      let redirectRestaurant =
        restaurantFromUrl || localStorage.getItem("restaurant_id") || "";

      try {
        const isUUID =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(table);
        const normalizedTable = normalizedScannedTable;
        const tableNumber = Number.parseInt(normalizedTable, 10);
        const restaurantId =
          restaurantFromUrl ||
          localStorage.getItem("restaurant_id") ||
          (await resolveRestaurantIdFromTenantSlug());
        const nextTable = !Number.isNaN(tableNumber) ? String(tableNumber) : table;
        redirectTable = nextTable;
        redirectRestaurant = restaurantId || "";
        localStorage.setItem("session_context_key", `${restaurantId || "na"}::${nextTable || "na"}`);
        localStorage.removeItem("session_id");
        localStorage.removeItem("order_id");
        localStorage.removeItem("cart-storage");
        localStorage.removeItem("separate_bill");
        localStorage.removeItem("my_order_ids");
        clearCart();

        let res: SessionResult;

        if (!Number.isNaN(tableNumber)) {
          if (!restaurantId) {
            router.replace("/menu");
            return;
          }
          res = await api<SessionResult>("/public/session/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              restaurant_id: restaurantId,
              table_number: tableNumber,
            }),
            credentials: "include",
          });
        } else if (isUUID) {
          res = await api<SessionResult>("/public/session/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ table_id: table }),
            credentials: "include",
          });
        } else {
          router.replace("/menu");
          return;
        }

        localStorage.setItem("session_id", res.session_id);
        if (res.table_number) {
          localStorage.setItem("table_number", String(res.table_number));
          redirectTable = String(res.table_number);
        }
        if (res.is_occupied) localStorage.setItem("table_occupied", "1");
        else localStorage.removeItem("table_occupied");
        if (typeof res.ordering_enabled === "boolean") {
          localStorage.setItem("ordering_enabled", res.ordering_enabled ? "1" : "0");
        } else {
          localStorage.removeItem("ordering_enabled");
        }
        if (res.restaurant_id) {
          localStorage.setItem("restaurant_id", res.restaurant_id);
          redirectRestaurant = res.restaurant_id;
        }

        const redirectUrl = "/menu";

        if (res.is_occupied) {
          setPendingRedirect(redirectUrl);
          setPhase("choosing");
        } else {
          router.replace(redirectUrl);
        }
      } catch (e: any) {
        console.error("Failed to start session:", e);
        localStorage.removeItem("session_id");
        if (e?.status === 403 && String(e?.message || "").toLowerCase().includes("disabled")) {
          setTableError("This table is currently disabled. Please contact the staff.");
        } else if (e?.status === 404) {
          setTableError("This table QR is invalid or no longer active.");
        } else {
          setTableError("Unable to start session for this table.");
        }
        setPhase("error");
      }
    }

    start();
  }, [table, router, restaurantFromUrl, clearCart, normalizedScannedTable]);

  const handleChoose = (separate: boolean) => {
    if (separate) {
      localStorage.setItem("separate_bill", "1");
    } else {
      localStorage.removeItem("separate_bill");
    }
    router.replace(pendingRedirect);
  };

  /* ── Error state ────────────────────────────────────────────── */
  if (phase === "error") {
    return (
      <>
        <style>{animationStyles}</style>
        <div className="qrave-loader">
          <div className="qrave-card" style={{ borderColor: "rgba(239,68,68,0.15)" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <h1 className="qrave-title" style={{ color: "#1e293b" }}>Table Unavailable</h1>
            <p className="qrave-sub" style={{ marginTop: 8 }}>{tableError}</p>
          </div>
        </div>
      </>
    );
  }

  /* ── Choosing state – shared or separate bill ───────────────── */
  if (phase === "choosing") {
    return (
      <>
        <style>{animationStyles}</style>
        <div className="qrave-loader">
          <div className="qrave-card" style={{ animation: "qFadeUp 0.5s ease" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🍽️</div>
            <h2 className="qrave-title" style={{ fontSize: 18 }}>This table has an active order</h2>
            <p className="qrave-sub" style={{ marginTop: 8, lineHeight: 1.5 }}>
              Someone is already ordering here. Would you like to share the order or keep a separate bill?
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 24, width: "100%" }}>
              <button onClick={() => handleChoose(false)} className="qrave-btn qrave-btn-primary">
                <span style={{ fontSize: 20 }}>🤝</span>
                <div>
                  <div style={{ fontWeight: 700 }}>Join shared order</div>
                  <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>Order together, one bill</div>
                </div>
              </button>
              <button onClick={() => handleChoose(true)} className="qrave-btn qrave-btn-secondary">
                <span style={{ fontSize: 20 }}>🧾</span>
                <div>
                  <div style={{ fontWeight: 700 }}>Start my own bill</div>
                  <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>Separate checkout</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  /* ── Loading state ──────────────────────────────────────────── */
  return (
    <>
      <style>{animationStyles}</style>
      <div className="qrave-loader">
        {/* Floating food particles */}
        <div className="qrave-particle p1">🍕</div>
        <div className="qrave-particle p2">🍜</div>
        <div className="qrave-particle p3">🥗</div>
        <div className="qrave-particle p4">🍰</div>
        <div className="qrave-particle p5">☕</div>
        <div className="qrave-particle p6">🍣</div>

        {/* Plate circle */}
        <div className="qrave-plate">
          <div className="qrave-plate-inner" />
          <div className="qrave-plate-rim" />
        </div>

        {/* Animated Qrave wordmark emerging from plate */}
        <div className="qrave-brand">
          {"Qrave".split("").map((char, i) => (
            <span
              key={i}
              className="qrave-letter"
              style={{ animationDelay: `${0.15 * i}s` }}
            >
              {char}
            </span>
          ))}
        </div>

        {/* Tagline */}
        <p className="qrave-tagline">Preparing your table…</p>

        {/* Shimmer loading bar */}
        <div className="qrave-bar-track">
          <div className="qrave-bar-fill" />
        </div>
      </div>
    </>
  );
}

/* ─── CSS ──────────────────────────────────────────────────────── */
const animationStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&family=Outfit:wght@400;500;600;700&display=swap');

  .qrave-loader {
    min-height: 100vh; min-height: 100dvh;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 28px;
    background: #FAF8F2;
    position: relative; overflow: hidden;
    font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    padding: 24px;
  }

  /* ── Floating food particles ──────────────── */
  .qrave-particle {
    position: absolute; font-size: 22px;
    opacity: 0; pointer-events: none;
    animation: qFloat 4s ease-in-out infinite;
  }
  .p1 { top: 12%; left: 10%; animation-delay: 0s; }
  .p2 { top: 18%; right: 14%; animation-delay: 0.7s; }
  .p3 { bottom: 22%; left: 16%; animation-delay: 1.4s; }
  .p4 { bottom: 14%; right: 10%; animation-delay: 0.3s; }
  .p5 { top: 40%; left: 6%; animation-delay: 1.8s; }
  .p6 { top: 35%; right: 8%; animation-delay: 1s; }

  /* ── Plate illustration ───────────────────── */
  .qrave-plate {
    width: 160px; height: 160px;
    border-radius: 50%; position: relative;
    animation: qPlateIn 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }
  .qrave-plate-rim {
    position: absolute; inset: 0;
    border-radius: 50%;
    border: 3px solid #EFEBE4;
    animation: qRimSpin 8s linear infinite;
    border-top-color: #FF561F;
    border-right-color: transparent;
  }
  .qrave-plate-inner {
    position: absolute; inset: 18px;
    border-radius: 50%;
    background: radial-gradient(circle at 40% 40%, #ffffff, #FAF8F2);
    border: 1px solid #EFEBE4;
    box-shadow: inset 0 2px 8px rgba(0,0,0,0.02);
  }

  /* ── Brand wordmark ───────────────────────── */
  .qrave-brand {
    display: flex; gap: 1px;
    z-index: 2; margin-top: -20px;
  }
  .qrave-letter {
    font-family: 'Fredoka', sans-serif;
    font-size: 52px; font-weight: 700;
    letter-spacing: -0.5px; color: #FF561F;
    display: inline-block;
    opacity: 0;
    animation: qLetterIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }

  /* ── Tagline ──────────────────────────────── */
  .qrave-tagline {
    color: #5E594F; font-size: 14px; font-weight: 600;
    letter-spacing: 0.5px; margin: 0;
    animation: qFadeUp 0.8s ease 0.9s both;
  }

  /* ── Shimmer bar ──────────────────────────── */
  .qrave-bar-track {
    width: 120px; height: 3px;
    border-radius: 3px; background: #EFEBE4;
    overflow: hidden;
    animation: qFadeUp 0.8s ease 1s both;
  }
  .qrave-bar-fill {
    width: 40%; height: 100%;
    border-radius: 3px;
    background: #FF561F;
    animation: qShimmer 1.4s ease-in-out infinite;
  }

  /* ── Card (error + choice) ────────────────── */
  .qrave-card {
    background: #ffffff;
    border: 1px solid #EFEBE4;
    border-radius: 24px;
    padding: 32px 28px;
    box-shadow: 0 8px 32px rgba(107,76,33,0.04);
    text-align: center; z-index: 2;
    max-width: 360px; width: 100%;
  }
  .qrave-title {
    color: #1E2430; font-family: 'Fredoka', sans-serif; font-size: 20px; font-weight: 700;
    margin: 0; letter-spacing: -0.3px;
  }
  .qrave-sub {
    color: #64748b; font-size: 13px; margin: 0;
  }

  /* ── Choice buttons ───────────────────────── */
  .qrave-btn {
    display: flex; align-items: center; gap: 14px;
    width: 100%; padding: 16px 20px;
    border-radius: 16px; border: none;
    cursor: pointer; font-family: inherit;
    text-align: left; font-size: 14px;
    transition: all 0.2s ease;
  }
  .qrave-btn-primary {
    background: #FF561F; color: white;
    box-shadow: 0 4px 16px rgba(255,86,31,0.25);
  }
  .qrave-btn-primary:active { transform: scale(0.97); }
  .qrave-btn-secondary {
    background: #FAF8F2;
    border: 1px solid #EFEBE4 !important;
    color: #1E2430;
  }
  .qrave-btn-secondary:active { transform: scale(0.97); }

  /* ── Keyframes ────────────────────────────── */
  @keyframes qLetterIn {
    0% {
      opacity: 0;
      transform: translateY(40px) scale(0.3) rotate(-20deg);
      filter: blur(8px);
    }
    100% {
      opacity: 1;
      transform: translateY(0) scale(1) rotate(0deg);
      filter: blur(0);
    }
  }
  @keyframes qPlateIn {
    0% { opacity: 0; transform: scale(0.4) rotate(-90deg); }
    100% { opacity: 1; transform: scale(1) rotate(0deg); }
  }
  @keyframes qRimSpin {
    to { transform: rotate(360deg); }
  }
  @keyframes qFloat {
    0%, 100% { opacity: 0; transform: translateY(0) scale(0.8); }
    30% { opacity: 0.3; }
    50% { opacity: 0.4; transform: translateY(-18px) scale(1); }
    70% { opacity: 0.3; }
  }
  @keyframes qShimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(350%); }
  }
  @keyframes qFadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;
