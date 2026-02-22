"use client";

import React, { useMemo } from "react";
import type { ThemeConfig } from "./types";

type Props = {
  theme: ThemeConfig;
  restaurantName?: string;
};

const DEFAULT_THEME: ThemeConfig = {
  preset: "",
  font_family: "'Inter', 'Segoe UI', sans-serif",
  bg_image_url: "",
  bg_overlay_opacity: 0.92,
  card_style: "rounded",
  button_style: "solid",
  motif: "minimal",
  ornament_level: "off",
  header_style: "classic",
  pattern_style: "none",
  section_icon: "•",
  icon_pack: "auto",
  colors: {
    bg: "#F8FAFC",
    surface: "#FFFFFF",
    text: "#0F172A",
    muted: "#64748B",
    accent: "#0F172A",
    accent_text: "#FFFFFF",
  },
};

const PRESETS: Record<string, ThemeConfig> = {
  thai: {
    motif: "thai",
    ornament_level: "bold",
    header_style: "elegant",
    pattern_style: "silk",
    section_icon: "✦",
    icon_pack: "thai",
  },
  indian: {
    motif: "indian",
    ornament_level: "bold",
    header_style: "festival",
    pattern_style: "mandala",
    section_icon: "✺",
    icon_pack: "indian",
  },
  minimal: {
    motif: "minimal",
    ornament_level: "off",
    header_style: "classic",
    pattern_style: "none",
    section_icon: "•",
    icon_pack: "minimal",
  },
};

const mergeTheme = (raw?: ThemeConfig | null): ThemeConfig => {
  const preset = raw?.preset ? PRESETS[raw.preset] || {} : {};
  return {
    ...DEFAULT_THEME,
    ...preset,
    ...(raw || {}),
    colors: {
      ...(DEFAULT_THEME.colors || {}),
      ...(raw?.colors || {}),
    },
    bg_overlay_opacity: Math.min(0.98, Math.max(0.7, Number(raw?.bg_overlay_opacity ?? preset.bg_overlay_opacity ?? DEFAULT_THEME.bg_overlay_opacity))),
  };
};

const resolveIconPack = (theme: ThemeConfig) => {
  if (theme.icon_pack && theme.icon_pack !== "auto") return theme.icon_pack;
  if (theme.motif === "thai" || theme.motif === "indian" || theme.motif === "minimal") return theme.motif;
  return "minimal";
};

const getIcon = (pack: string, section: string, fallback: string) => {
  const s = section.toLowerCase();
  if (pack === "thai") {
    if (s.includes("starter")) return "🥟";
    if (s.includes("main")) return "🍜";
    if (s.includes("drink")) return "🧋";
    return "🪷";
  }
  if (pack === "indian") {
    if (s.includes("starter")) return "🥘";
    if (s.includes("main")) return "🍛";
    if (s.includes("drink")) return "🧉";
    return "🪔";
  }
  return fallback;
};

const getAsset = (motif?: string) => {
  if (motif === "thai") return "/theme/thai-border.svg";
  if (motif === "indian") return "/theme/indian-rangoli.svg";
  return "/theme/minimal-divider.svg";
};

export default function ThemeLivePreview({ theme, restaurantName = "Your Restaurant" }: Props) {
  const active = useMemo(() => mergeTheme(theme), [theme]);
  const sectionIcon = (active.section_icon || "•").trim() || "•";
  const iconPack = resolveIconPack(active);
  const divider = getAsset(active.motif);

  const radiusClass =
    active.card_style === "sharp" ? "rounded-md" : active.card_style === "soft" ? "rounded-3xl" : "rounded-2xl";

  const buttonClass =
    active.button_style === "outline"
      ? "bg-transparent border text-[var(--pv-accent)] border-[var(--pv-accent)]"
      : active.button_style === "glass"
        ? "bg-[color-mix(in_oklab,var(--pv-accent),transparent_60%)] backdrop-blur text-[var(--pv-accentText)]"
        : "bg-[var(--pv-accent)] text-[var(--pv-accentText)]";

  const phoneVars = {
    ["--pv-bg" as string]: active.colors?.bg || "#F8FAFC",
    ["--pv-surface" as string]: active.colors?.surface || "#FFFFFF",
    ["--pv-text" as string]: active.colors?.text || "#0F172A",
    ["--pv-muted" as string]: active.colors?.muted || "#64748B",
    ["--pv-accent" as string]: active.colors?.accent || "#0F172A",
    ["--pv-accentText" as string]: active.colors?.accent_text || "#FFFFFF",
    ["--pv-font" as string]: active.font_family || "'Inter', 'Segoe UI', sans-serif",
  } as React.CSSProperties;

  return (
    <div className="mx-auto w-[300px]">
      <div className="relative bg-white rounded-[3rem] p-4 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.16)] border-[8px] border-slate-900 h-[600px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white via-transparent to-slate-100/60 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-2xl z-20" />
        <div
          className="relative z-10 h-full overflow-y-auto pt-8"
          style={phoneVars}
        >
          <div className={`relative overflow-hidden border-b border-slate-200 ${radiusClass} shadow-sm`}>
            <div className="h-8 bg-repeat-x bg-[length:auto_32px]" style={{ backgroundImage: `url('${divider}')` }} />
            <div
              className="p-4 space-y-4"
              style={{
                background: active.bg_image_url
                  ? `linear-gradient(rgba(255,255,255,${active.bg_overlay_opacity ?? 0.92}), rgba(255,255,255,${active.bg_overlay_opacity ?? 0.92})), url('${active.bg_image_url}')`
                  : "var(--pv-bg)",
                backgroundSize: "cover",
                fontFamily: "var(--pv-font)",
                color: "var(--pv-text)",
              }}
            >
              <div className={`p-3 border border-slate-200 ${radiusClass}`} style={{ background: "var(--pv-surface)" }}>
                <div className="text-sm font-bold">{restaurantName}</div>
                {active.ornament_level !== "off" && (
                  <div className="text-[10px] mt-1 tracking-[0.25em] uppercase font-black" style={{ color: "var(--pv-accent)" }}>
                    {sectionIcon} {restaurantName} {sectionIcon}
                  </div>
                )}
              </div>

              {["Starters", "Mains", "Drinks"].map((cat) => (
                <div key={cat} className={`p-3 border border-slate-200 ${radiusClass}`} style={{ background: "var(--pv-surface)" }}>
                  <div className="text-xs font-black uppercase tracking-wider flex items-center gap-2" style={{ color: "var(--pv-muted)" }}>
                    <span>{getIcon(iconPack, cat, sectionIcon)}</span>
                    <span>{cat}</span>
                  </div>
                  <div className="mt-2 text-sm font-semibold" style={{ color: "var(--pv-text)" }}>Sample Dish Name</div>
                  <div className="text-xs mt-1" style={{ color: "var(--pv-muted)" }}>Short description of item and tasting notes.</div>
                  <button className={`mt-3 px-3 py-2 text-xs font-bold ${radiusClass} ${buttonClass}`}>Add to Cart</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
