"use client";

import React, { useCallback, useEffect, useState } from "react";

type TourStep = { href: string; title: string; body: string };

const STEPS: TourStep[] = [
  { href: "/staff", title: "Floor & Tables", body: "Your live view. See every table, who is seated, what's been ordered and which guests need help." },
  { href: "/staff/menu", title: "Menu & Inventory", body: "Add dishes, set prices, mark items out of stock and attach photos or 3D models." },
  { href: "/staff/takeaway", title: "Takeaway & Delivery", body: "Take phone and walk-in orders and track deliveries next to your dine-in tables." },
  { href: "/staff/analytics", title: "Sales & Reports", body: "Daily and monthly sales, top items and exports for your accountant." },
  { href: "/staff/settings", title: "Settings", body: "Tables, QR codes, payments, GST, staff roles and security all live here." },
];

type Box = { top: number; left: number; width: number; height: number };

export const TOUR_KEY = "qrave_tour_done_v1";

export function tourSeen(): boolean {
  try {
    return localStorage.getItem(TOUR_KEY) === "1";
  } catch {
    return true;
  }
}

/** Spotlights sidebar links one by one. Falls back to a centred card when a link isn't on screen (e.g. mobile). */
export default function SetupTour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [i, setI] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const step = STEPS[i];

  const measure = useCallback(() => {
    const el = document.querySelector<HTMLElement>(`a[href="${step.href}"]`);
    const r = el?.getBoundingClientRect();
    setBox(r && r.width > 0 && r.height > 0 ? { top: r.top, left: r.left, width: r.width, height: r.height } : null);
  }, [step.href]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
    };
  }, [open, measure]);

  const finish = useCallback(() => {
    try {
      localStorage.setItem(TOUR_KEY, "1");
    } catch {
      /* private mode: the tour just shows again */
    }
    setI(0);
    onClose();
  }, [onClose]);

  const next = useCallback(() => (i + 1 >= STEPS.length ? finish() : setI(i + 1)), [i, finish]);
  const back = useCallback(() => setI((v) => Math.max(0, v - 1)), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      if (e.key === "ArrowRight" || e.key === "Enter") next();
      if (e.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, finish, next, back]);

  if (!open) return null;

  const pad = 6;
  const cardW = 320;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight : 768;
  const cardStyle: React.CSSProperties = box
    ? {
        left: Math.min(box.left + box.width + 16, vw - cardW - 16),
        top: Math.max(16, Math.min(box.top - 8, vh - 220)),
        width: cardW,
      }
    : { left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: Math.min(cardW, vw - 32) };

  return (
    <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true" aria-label="Product tour">
      {/* click-blocker; the spotlight's huge shadow dims everything else */}
      <div className="absolute inset-0" onClick={finish} />
      {box ? (
        <div
          className="pointer-events-none absolute rounded-xl ring-2 ring-[#fe5c13] transition-all duration-200"
          style={{
            top: box.top - pad,
            left: box.left - pad,
            width: box.width + pad * 2,
            height: box.height + pad * 2,
            boxShadow: "0 0 0 9999px rgba(15,23,42,0.6)",
          }}
        />
      ) : (
        <div className="pointer-events-none absolute inset-0 bg-slate-900/60" />
      )}
      <div className="absolute rounded-2xl bg-white p-5 shadow-2xl" style={cardStyle}>
        <p className="text-[10px] font-black uppercase tracking-widest text-[#fe5c13]">
          Step {i + 1} of {STEPS.length}
        </p>
        <h3 className="mt-1 text-base font-black text-slate-900">{step.title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{step.body}</p>
        <div className="mt-4 flex items-center justify-between">
          <button onClick={finish} className="text-xs font-bold text-slate-400 hover:text-slate-600">
            Skip tour
          </button>
          <div className="flex gap-2">
            {i > 0 && (
              <button onClick={back} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600">
                Back
              </button>
            )}
            <button onClick={next} className="rounded-lg bg-[#fe5c13] px-4 py-1.5 text-xs font-bold text-white">
              {i + 1 === STEPS.length ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
