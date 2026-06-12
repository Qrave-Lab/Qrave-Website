"use client";

import { useEffect, useState } from "react";
import { api } from "@/app/lib/api";
import { useCartStore } from "@/stores/cartStore";
import MenuClient from "../../MenuClient";

type Props = { token: string };

export default function MenuByToken({ token }: Props) {
  const clearCart = useCartStore((s) => s.clearCart);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const existing = localStorage.getItem("session_id");
    const lastToken = localStorage.getItem("qr_token");

    if (existing && lastToken === token) {
      setReady(true);
      return;
    }

    localStorage.removeItem("session_id");
    localStorage.removeItem("order_id");
    localStorage.removeItem("cart-storage");
    localStorage.removeItem("table_number");
    localStorage.removeItem("restaurant_id");
    clearCart();

    api<{
      session_id: string;
      restaurant_id: string;
      table_number: number;
      is_occupied?: boolean;
      ordering_enabled?: boolean;
    }>("/public/session/start-by-token", {
      method: "POST",
      body: JSON.stringify({ token }),
      credentials: "include",
    })
      .then((res) => {
        localStorage.setItem("session_id", res.session_id);
        localStorage.setItem("restaurant_id", res.restaurant_id);
        localStorage.setItem("table_number", String(res.table_number));
        localStorage.setItem("qr_token", token);
        if (res.is_occupied) localStorage.setItem("table_occupied", "1");
        else localStorage.removeItem("table_occupied");
        if (typeof res.ordering_enabled === "boolean") {
          localStorage.setItem("ordering_enabled", res.ordering_enabled ? "1" : "0");
        }
        setReady(true);
      })
      .catch((err) => {
        if (err?.status === 404) {
          setError("This QR code is no longer valid. Please scan the QR code on your table again.");
        } else if (err?.status === 403) {
          setError("This table is currently disabled. Please ask staff for assistance.");
        } else if (err?.status === 402) {
          setError("This restaurant is not currently accepting orders.");
        } else {
          setError("Something went wrong. Please try scanning the QR code again.");
        }
      });
  }, [token, clearCart]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-6">
        <div className="max-w-md rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
          <div className="mb-4 text-4xl">📵</div>
          <h1 className="text-lg font-bold text-slate-900">Invalid QR Code</h1>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading your menu…</p>
        </div>
      </div>
    );
  }

  return <MenuClient table={null} />;
}
