"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronRight, Circle, Compass, Loader2, Sparkles, X } from "lucide-react";
import SetupTour, { tourSeen } from "./SetupTour";
import { useOnboarding } from "./useOnboarding";

/**
 * Guided setup: menu → tables → QR codes → payments → GST.
 * `variant="card"` sits on the dashboard and hides itself once finished or dismissed;
 * `variant="page"` always shows (used by /staff/setup).
 */
export default function SetupChecklist({ variant = "card" }: { variant?: "card" | "page" }) {
  const { data, busy, skip, dismiss, loadSample, removeSample } = useOnboarding();
  const [tour, setTour] = useState(false);

  // First visit to the dashboard: offer the tour once.
  const showFirstTour = variant === "card" && !!data && !data.dismissed;
  useEffect(() => {
    if (!showFirstTour || tourSeen()) return;
    const t = window.setTimeout(() => setTour(true), 800);
    return () => window.clearTimeout(t);
  }, [showFirstTour]);

  if (!data) return null;
  if (variant === "card" && (data.dismissed || (data.finished && !data.has_sample_data))) return null;

  const pct = Math.round((data.completed / data.total) * 100);
  const menuStep = data.steps.find((s) => s.key === "menu");

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Setup checklist">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-black text-slate-900">
            {data.finished ? "You're all set up" : "Get your restaurant ready"}
          </h2>
          <p className="mt-0.5 text-xs font-medium text-slate-500">
            {data.completed} of {data.total} steps done
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button onClick={() => setTour(true)} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">
            <Compass className="h-3.5 w-3.5" /> Take the tour
          </button>
          {variant === "card" && (
            <button onClick={() => dismiss(true)} disabled={busy} aria-label="Hide setup guide" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-[#fe5c13] transition-all" style={{ width: `${pct}%` }} />
      </div>

      <ol className="mt-4 divide-y divide-slate-100">
        {data.steps.map((s) => {
          const complete = s.done || s.skipped;
          const isNext = data.next_step === s.key;
          return (
            <li key={s.key} className="flex items-start gap-3 py-3">
              {complete ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" aria-label="Done" />
              ) : (
                <Circle className={`mt-0.5 h-5 w-5 shrink-0 ${isNext ? "text-[#fe5c13]" : "text-slate-300"}`} aria-label="To do" />
              )}
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-bold ${complete ? "text-slate-400 line-through" : "text-slate-900"}`}>
                  {s.title}
                  {s.skipped && <span className="ml-2 text-[10px] font-semibold normal-case text-slate-400 no-underline">skipped</span>}
                </p>
                {!complete && <p className="mt-0.5 text-xs font-medium leading-relaxed text-slate-500">{s.description}</p>}
                {!complete && s.skippable && (
                  <button onClick={() => skip(s.key, true)} disabled={busy} className="mt-1 text-[11px] font-semibold text-slate-400 underline hover:text-slate-600">
                    {s.skip_label}
                  </button>
                )}
                {s.skipped && (
                  <button onClick={() => skip(s.key, false)} disabled={busy} className="mt-0.5 text-[11px] font-semibold text-slate-400 underline hover:text-slate-600">
                    Undo
                  </button>
                )}
              </div>
              {!complete && (
                <Link
                  href={s.href}
                  className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold ${
                    isNext ? "bg-[#fe5c13] text-white" : "border border-slate-200 text-slate-600"
                  }`}
                >
                  {isNext ? "Start" : "Open"} <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </li>
          );
        })}
      </ol>

      {!data.has_sample_data && menuStep && !menuStep.done && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-600">
            <b>Want to see it working first?</b> Load a small sample menu to try QR ordering and the kitchen screen.
          </p>
          <button onClick={loadSample} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Load sample menu
          </button>
        </div>
      )}
      {data.has_sample_data && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-medium text-amber-900">
            Sample items are on your menu. Guests who scan your QR codes can see and order them, so remove them before you go live.
          </p>
          <button onClick={removeSample} disabled={busy} className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-amber-900">
            Remove sample menu
          </button>
        </div>
      )}
      {variant === "page" && data.dismissed && (
        <button onClick={() => dismiss(false)} disabled={busy} className="mt-3 text-xs font-bold text-slate-500 underline">
          Show this on my dashboard again
        </button>
      )}

      <SetupTour open={tour} onClose={() => setTour(false)} />
    </section>
  );
}
