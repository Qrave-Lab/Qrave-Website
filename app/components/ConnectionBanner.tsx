"use client";

import { useEffect, useRef, useState } from "react";
import { WifiOff } from "lucide-react";
import { NETWORK_EVENT } from "@/app/lib/api";

/**
 * The web staff app has no offline mode: orders and payments go straight to
 * the server. When the server can't be reached this banner says so plainly,
 * so nobody keeps taking orders that aren't being saved.
 *
 * It trusts real request failures (not just navigator.onLine, which stays
 * true on Wi-Fi with no internet) and checks the server every 5 seconds
 * until it answers again.
 */
export default function ConnectionBanner() {
  const [down, setDown] = useState(false);
  const [backOnline, setBackOnline] = useState(false);
  const wasDown = useRef(false);

  useEffect(() => {
    const mark = (ok: boolean) => {
      if (!ok) {
        wasDown.current = true;
        setDown(true);
        setBackOnline(false);
      } else if (wasDown.current) {
        wasDown.current = false;
        setDown(false);
        setBackOnline(true);
      }
    };
    const onApi = (e: Event) => mark(Boolean((e as CustomEvent<{ ok: boolean }>).detail?.ok));
    const onOffline = () => mark(false);
    const onOnline = () => void ping();
    const ping = async () => {
      try {
        const res = await fetch("/api/proxy/health", { cache: "no-store" });
        mark(res.ok);
      } catch {
        mark(false);
      }
    };

    if (typeof navigator !== "undefined" && !navigator.onLine) mark(false);
    window.addEventListener(NETWORK_EVENT, onApi);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    const timer = setInterval(() => {
      if (wasDown.current) void ping();
    }, 5000);
    return () => {
      window.removeEventListener(NETWORK_EVENT, onApi);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!backOnline) return;
    const t = setTimeout(() => setBackOnline(false), 4000);
    return () => clearTimeout(t);
  }, [backOnline]);

  if (down) {
    return (
      <div role="alert" className="fixed inset-x-0 top-0 z-[200] flex items-start gap-3 bg-rose-600 px-4 py-3 text-white shadow-lg print:hidden">
        <WifiOff className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="text-sm">
          <p className="font-black">No connection: orders and payments are NOT being saved.</p>
          <p className="font-medium opacity-90">
            Stop taking orders on this screen until it reconnects. Use the Qrave POS desktop app or note orders on paper. This
            banner clears by itself when the connection is back.
          </p>
        </div>
      </div>
    );
  }
  return null;
}
