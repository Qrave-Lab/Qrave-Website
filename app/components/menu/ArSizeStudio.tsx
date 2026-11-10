"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, RotateCcw, Ruler } from "lucide-react";
import {
  type Dims,
  MAX_SIZE_CM,
  MIN_SIZE_CM,
  SIZE_PRESETS,
  acrossCm,
  clampCm,
  formatCm,
  portionGuess,
  ratioFor,
  readNaturalDims,
  scaleString,
} from "@/app/lib/arSizing";
import { useModelViewerEvents } from "@/app/lib/useModelViewerEvents";

type StudioVariant = { id: string; label: string; width_cm?: number };

export type ArSizePatch = {
  width_cm?: number;
  height_cm?: number;
  depth_cm?: number;
  modelScale?: number;
  variants?: StudioVariant[];
};

type Props = {
  glbUrl: string;
  ready: boolean;
  widthCm?: number;
  /** Old "% offset" value. Folded into the cm sizes on load, then reset to 1. */
  legacyScale?: number;
  variants: StudioVariant[];
  onChange: (patch: ArSizePatch) => void;
};

const BASE = "__base__";
const STEP = 0.5;

const num = (v: unknown): number | undefined => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

/**
 * Staff tool for setting how big a dish really is. The 3D stage uses a fixed
 * camera, so changing the size visibly grows or shrinks the dish, with live cm
 * labels pinned to it and a top-down comparison against a plate and a phone.
 * Customers see exactly this size in AR and can't resize it.
 */
export default function ArSizeStudio({ glbUrl, ready, widthCm, legacyScale, variants, onChange }: Props) {
  const viewerRef = useRef<any>(null);
  const attachViewer = useModelViewerEvents(
    { load: (v) => setLoaded({ url: glbUrl, dims: readNaturalDims(v) }) },
    viewerRef,
  );
  // Measured size of the file, tagged with its url so a new upload starts fresh.
  const [loaded, setLoaded] = useState<{ url: string; dims: Dims | null } | null>(null);
  const natural = loaded?.url === glbUrl ? loaded.dims : null;
  const [picked, setPicked] = useState<string>(BASE);
  const active = picked !== BASE && variants.some((v) => v.id === picked) ? picked : BASE;
  const setActive = setPicked;
  const [measure, setMeasure] = useState<"across" | "height">("across");
  const [draft, setDraft] = useState<string>("");
  const foldedRef = useRef<string | null>(null);

  const fileAcross = natural ? acrossCm(natural) : null;
  const baseCm = num(widthCm) ?? (fileAcross ? Math.round(fileAcross * 10) / 10 : undefined);

  const variantCm = useCallback(
    (v: StudioVariant) => num(v.width_cm) ?? (baseCm ? Math.round(baseCm * portionGuess(v.label) * 10) / 10 : undefined),
    [baseCm],
  );

  const activeVariant = variants.find((v) => v.id === active);
  const activeCm = activeVariant ? variantCm(activeVariant) : baseCm;
  const activeIsAuto = Boolean(activeVariant && !num(activeVariant.width_cm));
  const ratio = natural && activeCm ? ratioFor(natural, activeCm) : 1;

  const dims = useMemo(() => {
    if (!natural) return null;
    const w = natural.x * 100 * ratio;
    const d = natural.z * 100 * ratio;
    const h = natural.y * 100 * ratio;
    return { w, d, h, across: Math.max(w, d) };
  }, [natural, ratio]);

  const shownValue = dims ? (measure === "across" ? dims.across : dims.h) : activeCm;

  // Keep the text box in sync unless the user is mid-typing.
  const typingRef = useRef(false);
  useEffect(() => {
    if (!typingRef.current && shownValue) setDraft(String(Math.round(shownValue * 10) / 10));
  }, [shownValue]);

  // Old items: fold the separate % offset into real cm sizes once.
  useEffect(() => {
    if (!natural || foldedRef.current === glbUrl) return;
    foldedRef.current = glbUrl;
    const s = num(legacyScale);
    if (!s || Math.abs(s - 1) < 0.001) return;
    const base = num(widthCm) ?? acrossCm(natural);
    const nextBase = clampCm(base * s);
    const r = ratioFor(natural, nextBase);
    onChange({
      width_cm: nextBase,
      height_cm: Math.round(natural.y * 100 * r * 10) / 10,
      depth_cm: Math.round(Math.min(natural.x, natural.z) * 100 * r * 10) / 10,
      modelScale: 1,
      variants: variants.map((v) => (num(v.width_cm) ? { ...v, width_cm: clampCm(num(v.width_cm)! * s) } : v)),
    });
  }, [natural, glbUrl, legacyScale, widthCm, variants, onChange]);

  const applyAcross = useCallback(
    (cm: number) => {
      const next = clampCm(cm);
      if (active === BASE) {
        const patch: ArSizePatch = { width_cm: next, modelScale: 1 };
        if (natural) {
          const r = ratioFor(natural, next);
          patch.height_cm = Math.round(natural.y * 100 * r * 10) / 10;
          patch.depth_cm = Math.round(Math.min(natural.x, natural.z) * 100 * r * 10) / 10;
        }
        onChange(patch);
      } else {
        onChange({ variants: variants.map((v) => (v.id === active ? { ...v, width_cm: next } : v)) });
      }
    },
    [active, natural, onChange, variants],
  );

  const applyShown = useCallback(
    (value: number) => {
      if (!Number.isFinite(value) || value <= 0) return;
      if (measure === "height" && natural) {
        applyAcross(value * (acrossCm(natural) / (natural.y * 100)));
      } else {
        applyAcross(value);
      }
    },
    [applyAcross, measure, natural],
  );

  const resetVariant = () => {
    if (!activeVariant) return;
    onChange({ variants: variants.map((v) => (v.id === active ? { ...v, width_cm: undefined } : v)) });
  };

  // Pin W/H/D labels to the edges of the dish after every size change.
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !natural || !viewer.getBoundingBoxCenter) return;
    let cancelled = false;
    const raf = requestAnimationFrame(async () => {
      try {
        // Re-centre the fixed camera on the resized dish.
        await viewer.updateFraming?.();
        if (cancelled) return;
        const c = viewer.getBoundingBoxCenter();
        const d = viewer.getDimensions();
        const set = (name: string, pos: string) => viewer.updateHotspot?.({ name, position: pos });
        set("hotspot-w", `${c.x}m ${c.y - d.y / 2}m ${c.z + d.z / 2}m`);
        set("hotspot-d", `${c.x + d.x / 2}m ${c.y - d.y / 2}m ${c.z}m`);
        set("hotspot-h", `${c.x}m ${c.y + d.y / 2}m ${c.z}m`);
      } catch {
        // Labels are a nicety; the size itself is already applied.
      }
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [natural, ratio]);

  const sliderMax = measure === "height" && natural ? Math.min(MAX_SIZE_CM, MAX_SIZE_CM * (natural.y / Math.max(natural.x, natural.z))) : MAX_SIZE_CM;
  const sliderMin = measure === "height" && natural ? Math.max(1, MIN_SIZE_CM * (natural.y / Math.max(natural.x, natural.z))) : MIN_SIZE_CM;

  const tabs = [{ id: BASE, label: "Base", cm: baseCm, auto: false }, ...variants.map((v) => ({ id: v.id, label: v.label || "Option", cm: variantCm(v), auto: !num(v.width_cm) }))];

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 md:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-800">
            <Ruler className="h-3.5 w-3.5 text-indigo-500" /> Real-world size
          </h4>
          <p className="mt-1 text-[11px] font-medium text-slate-500">
            Customers see the dish at exactly this size on their table. They can&apos;t pinch to resize it.
          </p>
        </div>
        {tabs.length > 1 && (
          <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1" role="tablist" aria-label="Size option">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active === t.id}
                onClick={() => setActive(t.id)}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors ${
                  active === t.id ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {t.label}
                {t.cm ? <span className={`ml-1 font-semibold ${active === t.id ? "text-indigo-100" : "text-slate-400"}`}>{Math.round(t.cm)}cm{t.auto ? "*" : ""}</span> : null}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.15fr_1fr]">
        {/* 3D stage: fixed camera, so size changes are visible */}
        <div className="relative h-72 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-100 md:h-80">
          {ready && glbUrl ? (
            <model-viewer
              ref={attachViewer}
              key={glbUrl}
              src={glbUrl}
              alt="Dish size preview"
              camera-controls
              disable-zoom
              interaction-prompt="none"
              camera-orbit="35deg 62deg 0.9m"
              min-camera-orbit="auto 20deg 0.9m"
              max-camera-orbit="auto 88deg 0.9m"
              field-of-view="32deg"
              max-field-of-view="45deg"
              shadow-intensity="1"
              shadow-softness="0.6"
              tone-mapping="commerce"
              scale={natural && activeCm ? scaleString(ratio) : "1 1 1"}
              style={{ width: "100%", height: "100%", background: "transparent", opacity: natural ? 1 : 0, transition: "opacity 200ms" }}
            >
              {dims && (
                <>
                  <span slot="hotspot-w" data-position="0m 0m 0m" className="ar-dim-label">
                    ↔ {formatCm(Math.round(dims.w * 10) / 10)}
                  </span>
                  <span slot="hotspot-d" data-position="0m 0m 0m" className="ar-dim-label">
                    ⤢ {formatCm(Math.round(dims.d * 10) / 10)}
                  </span>
                  <span slot="hotspot-h" data-position="0m 0m 0m" className="ar-dim-label">
                    ↕ {formatCm(Math.round(dims.h * 10) / 10)}
                  </span>
                </>
              )}
            </model-viewer>
          ) : null}
          {(!ready || !natural) && (
            <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-400">Loading 3D model…</div>
          )}
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-slate-600 shadow-sm">
            Drag to look around · camera distance is fixed
          </div>
          <style>{`
            .ar-dim-label {
              display: block; transform: translate(-50%, -50%);
              background: rgba(15, 23, 42, 0.86); color: #fff;
              font: 700 10px/1 ui-sans-serif, system-ui, sans-serif;
              padding: 4px 7px; border-radius: 999px; white-space: nowrap;
              pointer-events: none; transition: opacity 0.2s;
            }
          `}</style>
        </div>

        {/* Controls */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Measure by</span>
            <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
              {(["across", "height"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMeasure(m)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-bold ${measure === m ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-800"}`}
                >
                  {m === "across" ? "Widest side" : "Height"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Smaller"
              onClick={() => shownValue && applyShown(shownValue - STEP)}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm active:scale-95"
            >
              <Minus className="h-4 w-4" />
            </button>
            <label className="relative flex-1">
              <span className="sr-only">{measure === "across" ? "Widest side in cm" : "Height in cm"}</span>
              <input
                type="number"
                inputMode="decimal"
                step={STEP}
                min={1}
                max={MAX_SIZE_CM}
                value={draft}
                onFocus={() => (typingRef.current = true)}
                onChange={(e) => {
                  setDraft(e.target.value);
                  const v = parseFloat(e.target.value);
                  if (Number.isFinite(v) && v >= 1) applyShown(v);
                }}
                onBlur={() => {
                  typingRef.current = false;
                  if (shownValue) setDraft(String(Math.round(shownValue * 10) / 10));
                }}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-4 pr-12 text-center text-lg font-black text-slate-900 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">cm</span>
            </label>
            <button
              type="button"
              aria-label="Bigger"
              onClick={() => shownValue && applyShown(shownValue + STEP)}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm active:scale-95"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <input
            type="range"
            aria-label="Size"
            min={sliderMin}
            max={sliderMax}
            step={STEP}
            value={shownValue ?? MIN_SIZE_CM}
            disabled={!natural}
            onChange={(e) => applyShown(parseFloat(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-indigo-600 disabled:opacity-40"
          />

          {activeVariant && (
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px]">
              {activeIsAuto ? (
                <span className="font-medium text-slate-500">
                  * Guessed from the name &ldquo;{activeVariant.label}&rdquo;. Change it to set an exact size.
                </span>
              ) : (
                <>
                  <span className="font-medium text-slate-500">Custom size for {activeVariant.label}</span>
                  <button type="button" onClick={resetVariant} className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-800">
                    <RotateCcw className="h-3 w-3" /> Auto
                  </button>
                </>
              )}
            </div>
          )}

          <div>
            <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">Quick sizes (widest side)</span>
            <div className="flex flex-wrap gap-1.5">
              {SIZE_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  disabled={!natural}
                  onClick={() => {
                    setMeasure("across");
                    applyAcross(p.cm);
                  }}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors disabled:opacity-40 ${
                    dims && Math.abs(dims.across - p.cm) < 0.5
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
                  }`}
                >
                  {p.label} <span className="text-slate-400">{p.cm}</span>
                </button>
              ))}
            </div>
          </div>

          {dims && <TopDownCompare w={dims.w} d={dims.d} />}

          {dims && (
            <p className="text-[11px] font-semibold text-slate-600">
              Customers see: {formatCm(Math.round(dims.w))} wide × {formatCm(Math.round(dims.d))} deep × {formatCm(Math.round(dims.h))} tall
              {fileAcross && Math.abs(fileAcross - dims.across) > 0.5 ? (
                <span className="font-medium text-slate-400"> (file is {formatCm(Math.round(fileAcross))} across)</span>
              ) : null}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Top-down, to-scale sketch: the dish on a 27 cm dinner plate next to a phone. */
function TopDownCompare({ w, d }: { w: number; d: number }) {
  // viewBox units are cm; it widens for big dishes so nothing is clipped.
  const plate = 27;
  const span = Math.max(w, plate);
  const cx = 26 + span / 2;
  const vbW = Math.max(100, cx + span / 2 + 6);
  const vbH = Math.max(48, Math.max(d, plate) + 14);
  const cy = vbH / 2 - 1.5;
  return (
    <figure className="rounded-xl border border-slate-200 bg-white p-2">
      <svg viewBox={`0 0 ${vbW} ${vbH}`} className="h-36 w-full" role="img" aria-label={`Dish is ${Math.round(w)} by ${Math.round(d)} cm, next to a 27 cm plate and a phone`}>
        <defs>
          <pattern id="ar-grid" width="5" height="5" patternUnits="userSpaceOnUse">
            <path d="M5 0H0V5" fill="none" stroke="#e2e8f0" strokeWidth="0.15" />
          </pattern>
        </defs>
        <rect width={vbW} height={vbH} fill="url(#ar-grid)" />
        {/* phone 7.1 × 14.7 cm */}
        <rect x="8" y={cy - 7.35} width="7.1" height="14.7" rx="1.1" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="0.3" />
        <text x="11.55" y={cy + 10.5} textAnchor="middle" fontSize="2.6" fill="#64748b" fontWeight="700">Phone</text>
        {/* dinner plate */}
        <circle cx={cx} cy={cy} r={plate / 2} fill="none" stroke="#94a3b8" strokeWidth="0.3" strokeDasharray="1 0.8" />
        <text x={cx} y={cy + plate / 2 + 3.2} textAnchor="middle" fontSize="2.6" fill="#64748b" fontWeight="700">27 cm plate</text>
        {/* dish footprint */}
        <ellipse cx={cx} cy={cy} rx={w / 2} ry={d / 2} fill="rgba(79,70,229,0.18)" stroke="#4f46e5" strokeWidth="0.4" style={{ transition: "rx 120ms, ry 120ms" }} />
      </svg>
      <figcaption className="sr-only">To-scale top view</figcaption>
    </figure>
  );
}

