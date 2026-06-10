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
          <div className="qrave-orb qrave-orb-1" />
          <div className="qrave-orb qrave-orb-2" />
          <div className="qrave-card" style={{ borderColor: "rgba(239,68,68,0.2)" }}>
            <div style={{ fontSize: 36, marginBottom: 16 }}>⚠️</div>
            <h1 className="qrave-title">Table Unavailable</h1>
            <p className="qrave-sub" style={{ marginTop: 10 }}>{tableError}</p>
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
          <div className="qrave-orb qrave-orb-1" />
          <div className="qrave-orb qrave-orb-2" />
          <div className="qrave-card">
            <div style={{ fontSize: 34, marginBottom: 14 }}>🍽️</div>
            <h2 className="qrave-title" style={{ fontSize: 20 }}>Active order at this table</h2>
            <p className="qrave-sub" style={{ marginTop: 10 }}>
              Someone is already ordering here. Join them or start your own separate bill.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 24, width: "100%" }}>
              <button onClick={() => handleChoose(false)} className="qrave-btn qrave-btn-primary">
                <span style={{ fontSize: 18 }}>🤝</span>
                <div>
                  <div style={{ fontWeight: 600 }}>Join shared order</div>
                  <div style={{ fontSize: 11, opacity: 0.65, marginTop: 2 }}>Order together, one bill</div>
                </div>
              </button>
              <button onClick={() => handleChoose(true)} className="qrave-btn qrave-btn-secondary">
                <span style={{ fontSize: 18 }}>🧾</span>
                <div>
                  <div style={{ fontWeight: 600 }}>Start my own bill</div>
                  <div style={{ fontSize: 11, opacity: 0.65, marginTop: 2 }}>Separate checkout</div>
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
        {/* Ambient gradient orbs */}
        <div className="qrave-orb qrave-orb-1" />
        <div className="qrave-orb qrave-orb-2" />
        <div className="qrave-orb qrave-orb-3" />

        {/* Spinning ring with icon */}
        <div className="qrave-ring-wrap">
          <svg className="qrave-ring-svg" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="60" cy="60" r="54" stroke="rgba(255,255,255,0.05)" strokeWidth="2.5"/>
            <circle cx="60" cy="60" r="54" stroke="url(#ringGrad)" strokeWidth="2.5"
              strokeLinecap="round" strokeDasharray="100 240" className="qrave-ring-arc"/>
            <defs>
              <linearGradient id="ringGrad" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FF6B35"/>
                <stop offset="1" stopColor="#FF9A5C" stopOpacity="0"/>
              </linearGradient>
            </defs>
          </svg>
          <div className="qrave-ring-icon">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <ellipse cx="16" cy="24" rx="10" ry="2.5" fill="rgba(255,107,53,0.15)"/>
              <path d="M8 16c0-4.418 3.582-8 8-8s8 3.582 8 8" stroke="#FF6B35" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="16" cy="20" r="2.5" fill="#FF6B35"/>
              <path d="M7 23h18" stroke="rgba(255,107,53,0.35)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
        </div>

        {/* Wordmark */}
        <div className="qrave-wordmark">
          {"Qrave".split("").map((char, i) => (
            <span key={i} className="qrave-letter" style={{ animationDelay: `${0.07 * i + 0.25}s` }}>
              {char}
            </span>
          ))}
        </div>

        {/* Tagline */}
        <p className="qrave-tagline">Preparing your table…</p>

        {/* Progress bar */}
        <div className="qrave-progress">
          <div className="qrave-progress-fill" />
        </div>
      </div>
    </>
  );
}

/* ─── CSS ──────────────────────────────────────────────────────── */
const animationStyles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Playfair+Display:wght@700&display=swap');

  *, *::before, *::after { box-sizing: border-box; }

  /* Override dark values to light */

  .qrave-loader {
    min-height: 100vh; min-height: 100dvh;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 20px;
    background: #FAF9F6;
    position: relative; overflow: hidden;
    font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    padding: 32px;
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
    font-family: 'Playfair Display', serif;
    font-size: 48px; font-weight: 700;
    letter-spacing: -1.5px; color: #0F172A;
    display: inline-block;
    opacity: 0;
    animation: letterReveal 0.45s cubic-bezier(0.22,1,0.36,1) forwards;
  }

  /* ── Tagline ──────────────────────────────── */
  .qrave-tagline {
    color: #64748B;
    font-size: 11px; font-weight: 500;
    letter-spacing: 0.18em; text-transform: uppercase;
    margin: 0;
    animation: fadeUp 0.6s ease 0.65s both;
  }

  /* ── Shimmer bar ──────────────────────────── */
  .qrave-progress {
    width: 120px; height: 2px;
    border-radius: 2px; background: rgba(15,23,42,0.08);
    overflow: hidden;
    animation: fadeUp 0.6s ease 0.75s both;
  }
  .qrave-progress-fill {
    width: 40%; height: 100%;
    border-radius: 2px;
    background: #0F172A;
    animation: progressSlide 1.6s ease-in-out infinite;
  }

  /* ── Card (error + choice) ────────────────── */
  .qrave-card {
    background: #FFFFFF;
    border: 1px solid rgba(15,23,42,0.08);
    border-radius: 24px;
    padding: 36px 28px;
    box-shadow: 0 8px 40px rgba(15,23,42,0.06), 0 1px 3px rgba(15,23,42,0.04);
    text-align: center; z-index: 2;
    max-width: 360px; width: 100%;
    animation: fadeUp 0.5s ease both;
  }
  .qrave-title {
    color: #0F172A;
    font-family: 'Playfair Display', serif;
    font-size: 22px; font-weight: 700;
    margin: 0; letter-spacing: -0.3px;
  }
  .qrave-sub {
    color: #64748B; font-size: 13px; margin: 0; line-height: 1.65;
  }

  .qrave-btn {
    display: flex; align-items: center; gap: 14px;
    width: 100%; padding: 15px 18px;
    border-radius: 14px; border: none;
    cursor: pointer; font-family: inherit;
    text-align: left; font-size: 14px;
    transition: transform 0.15s ease, background 0.15s ease;
  }
  .qrave-btn:active { transform: scale(0.97); }
  .qrave-btn-primary {
    background: #0F172A; color: #FFFFFF;
    box-shadow: 0 4px 16px rgba(15,23,42,0.18);
  }
  .qrave-btn-primary:hover { background: #1E293B; }
  .qrave-btn-secondary {
    background: #FAF9F6;
    border: 1px solid rgba(15,23,42,0.1) !important;
    color: #0F172A;
  }
  .qrave-btn-secondary:hover { background: #F1F0EC; }

  /* ── Keyframes ────────────────────────────── */
  @keyframes orbDrift1 {
    0%, 100% { transform: translate(0,0) scale(1); }
    50% { transform: translate(30px,20px) scale(1.04); }
  }
  @keyframes orbDrift2 {
    0%, 100% { transform: translate(0,0) scale(1); }
    50% { transform: translate(-20px,-30px) scale(1.06); }
  }
  @keyframes orbDrift3 {
    0%, 100% { transform: translate(-50%,-50%) scale(1); }
    50% { transform: translate(-50%,-50%) scale(1.12); }
  }
  @keyframes ringIn {
    from { opacity: 0; transform: scale(0.65); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes ringRotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes letterReveal {
    0% { opacity: 0; transform: translateY(14px); filter: blur(5px); }
    100% { opacity: 1; transform: translateY(0); filter: blur(0); }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes progressSlide {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(400%); }
  }
`;
