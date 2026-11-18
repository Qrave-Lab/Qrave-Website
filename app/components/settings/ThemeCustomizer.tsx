"use client";

import React, { useRef, useState } from "react";
import { Check, ImagePlus, Trash2, UploadCloud } from "lucide-react";
import type { ThemeConfig } from "./types";

import { Select } from "@/app/components/ui/Select";

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = "presets" | "colors" | "typography" | "layout" | "background";

const TABS: { id: Tab; label: string }[] = [
  { id: "presets", label: "Presets" },
  { id: "colors", label: "Colours" },
  { id: "typography", label: "Text" },
  { id: "layout", label: "Layout" },
  { id: "background", label: "Background" },
];

// ─── Shared look (Qrave palette) ─────────────────────────────────────────────

const INPUT =
  "h-10 w-full rounded-xl border border-[#E8E8E3] bg-white px-3.5 text-[14px] text-[#0F1117] outline-none transition-colors placeholder:text-[#9CA3AF] hover:border-[#D6D6CF] focus:border-[#fe5c13]";
const OPT_ON = "border-[#fe5c13] bg-[#FFF4EC] text-[#0F1117]";
const OPT_OFF = "border-[#E8E8E3] bg-white text-[#4B5563] hover:border-[#D6D6CF] hover:text-[#0F1117]";

function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2.5">
        <p className="text-[13px] font-semibold text-[#0F1117]">{title}</p>
        {hint && <p className="mt-0.5 text-[12px] text-[#6B7280]">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function Divider() {
  return <div className="border-t border-[#F0F0EB]" />;
}

type VisualOpt<T extends string> = { value: T; label: string; art?: React.ReactNode };

function VisualPicker<T extends string>({
  options,
  value,
  onChange,
  cols,
  label,
}: {
  options: VisualOpt<T>[];
  value: T;
  onChange: (v: T) => void;
  cols?: number;
  label?: string;
}) {
  const gridCols = cols ?? Math.min(options.length, 4);
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }} role="radiogroup" aria-label={label}>
      {options.map((opt) => {
        const on = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(opt.value)}
            className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border px-2 text-[13px] font-medium transition-colors ${opt.art ? "py-3" : "h-10"} ${on ? OPT_ON : OPT_OFF}`}
          >
            {opt.art}
            <span>{opt.label}</span>
            {on && opt.art && (
              <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#fe5c13] text-white">
                <Check className="h-2.5 w-2.5" strokeWidth={3} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* Tiny schematics so a layout choice shows what it does */
const bar = "rounded-[2px] bg-current";
const LayoutArt = {
  list: (
    <span className="flex w-10 flex-col gap-1 opacity-60">
      {[0, 1, 2].map((i) => (
        <span key={i} className="flex items-center gap-1">
          <span className={`h-2.5 w-2.5 ${bar}`} />
          <span className={`h-1 flex-1 ${bar}`} />
        </span>
      ))}
    </span>
  ),
  grid: (
    <span className="grid w-10 grid-cols-2 gap-1 opacity-60">
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className={`h-2.5 ${bar}`} />
      ))}
    </span>
  ),
  compact: (
    <span className="flex w-10 flex-col gap-[3px] opacity-60">
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className={`h-[3px] ${bar}`} />
      ))}
    </span>
  ),
  magazine: (
    <span className="flex w-10 flex-col gap-1 opacity-60">
      <span className={`h-4 ${bar}`} />
      <span className="grid grid-cols-2 gap-1">
        <span className={`h-2 ${bar}`} />
        <span className={`h-2 ${bar}`} />
      </span>
    </span>
  ),
};

// ─── Props ───────────────────────────────────────────────────────────────────

type Props = {
  value: ThemeConfig;
  onChange: (next: ThemeConfig) => void;
  onBackgroundUpload?: (file: File) => Promise<string>;
  isBackgroundUploading?: boolean;
};

// ─── Static data ─────────────────────────────────────────────────────────────

type Preset = { id: string; name: string; emoji: string; palette: string[]; config: ThemeConfig };

const PRESETS: Preset[] = [
  {
    id: "minimal", name: "Minimal", emoji: "◻",
    palette: ["#F8FAFC", "#FFFFFF", "#0F172A", "#64748B", "#0F172A"],
    config: {
      preset: "minimal", motif: "minimal", ornament_level: "off", header_style: "classic",
      pattern_style: "none", section_icon: "•", icon_pack: "minimal",
      font_family: "'Inter', system-ui, sans-serif", card_style: "sharp",
      button_style: "outline", layout: "list", image_style: "small", spacing: "normal", shadow: "none",
      colors: { bg: "#F8FAFC", surface: "#FFFFFF", text: "#0F172A", muted: "#64748B", accent: "#0F172A", accent_text: "#FFFFFF", header_bg: "#FFFFFF", header_text: "#0F172A" },
    },
  },
  {
    id: "thai", name: "Thai", emoji: "✦",
    palette: ["#FFF7E8", "#FFF1D2", "#3A1D0F", "#8C5E3C", "#C2410C"],
    config: {
      preset: "thai", motif: "thai", ornament_level: "bold", header_style: "elegant",
      pattern_style: "silk", section_icon: "✦", icon_pack: "thai",
      font_family: "'Noto Sans Thai', 'Trebuchet MS', sans-serif", card_style: "rounded",
      button_style: "solid", layout: "list", image_style: "large", spacing: "normal", shadow: "md",
      colors: { bg: "#FFF7E8", surface: "#FFF1D2", text: "#3A1D0F", muted: "#8C5E3C", accent: "#C2410C", accent_text: "#FFFFFF", header_bg: "#FFF1D2", header_text: "#3A1D0F" },
    },
  },
  {
    id: "indian", name: "Indian", emoji: "✺",
    palette: ["#FFF9F2", "#FFF1E4", "#1F2937", "#8B5E3C", "#D97706"],
    config: {
      preset: "indian", motif: "indian", ornament_level: "bold", header_style: "festival",
      pattern_style: "mandala", section_icon: "✺", icon_pack: "indian",
      font_family: "'Hind', 'Segoe UI', sans-serif", card_style: "soft",
      button_style: "solid", layout: "grid", image_style: "large", spacing: "normal", shadow: "md",
      colors: { bg: "#FFF9F2", surface: "#FFF1E4", text: "#1F2937", muted: "#8B5E3C", accent: "#D97706", accent_text: "#FFFFFF", header_bg: "#FFF1E4", header_text: "#1F2937" },
    },
  },
  {
    id: "dark", name: "Dark", emoji: "◈",
    palette: ["#0F172A", "#1E293B", "#F1F5F9", "#94A3B8", "#38BDF8"],
    config: {
      preset: "dark", motif: "minimal", ornament_level: "off", header_style: "classic",
      pattern_style: "grid", section_icon: "·", icon_pack: "minimal",
      font_family: "'Space Grotesk', sans-serif", card_style: "sharp",
      button_style: "solid", layout: "list", image_style: "small", spacing: "normal", shadow: "lg",
      colors: { bg: "#0F172A", surface: "#1E293B", text: "#F1F5F9", muted: "#94A3B8", accent: "#38BDF8", accent_text: "#0F172A", header_bg: "#1E293B", header_text: "#F1F5F9" },
    },
  },
  {
    id: "bistro", name: "Bistro", emoji: "◬",
    palette: ["#FAF6F1", "#F0E8DC", "#2C1810", "#7A5C40", "#8B4A2B"],
    config: {
      preset: "bistro", motif: "minimal", ornament_level: "subtle", header_style: "elegant",
      pattern_style: "dots", section_icon: "❧", icon_pack: "minimal",
      font_family: "'Playfair Display', Georgia, serif", heading_font: "'Raleway', sans-serif",
      card_style: "soft", button_style: "outline", layout: "list", image_style: "large", spacing: "relaxed", shadow: "sm",
      colors: { bg: "#FAF6F1", surface: "#F0E8DC", text: "#2C1810", muted: "#7A5C40", accent: "#8B4A2B", accent_text: "#FFFFFF", header_bg: "#2C1810", header_text: "#FAF6F1" },
    },
  },
  {
    id: "street", name: "Street", emoji: "◉",
    palette: ["#FFFBEB", "#FEF3C7", "#1C1A00", "#92400E", "#DC2626"],
    config: {
      preset: "street", motif: "custom", ornament_level: "subtle", header_style: "festival",
      pattern_style: "chevron", section_icon: "▶", icon_pack: "minimal",
      font_family: "'Poppins', sans-serif", heading_font: "'Josefin Sans', sans-serif",
      card_style: "rounded", button_style: "solid", layout: "grid", image_style: "full", spacing: "compact", shadow: "md",
      colors: { bg: "#FFFBEB", surface: "#FEF3C7", text: "#1C1A00", muted: "#92400E", accent: "#DC2626", accent_text: "#FFFFFF", header_bg: "#DC2626", header_text: "#FFFFFF" },
    },
  },
];

const PALETTES = [
  { name: "Chalk",    colors: { bg: "#FAFAFA", surface: "#FFFFFF", text: "#111827", muted: "#6B7280", accent: "#111827", accent_text: "#FFFFFF", header_bg: "#FFFFFF", header_text: "#111827" } },
  { name: "Cream",    colors: { bg: "#FDF6EC", surface: "#FFF9F2", text: "#1C0F00", muted: "#8B5E3C", accent: "#C2410C", accent_text: "#FFFFFF", header_bg: "#FFF9F2", header_text: "#1C0F00" } },
  { name: "Dark",     colors: { bg: "#0F172A", surface: "#1E293B", text: "#F1F5F9", muted: "#94A3B8", accent: "#38BDF8", accent_text: "#0F172A", header_bg: "#1E293B", header_text: "#F1F5F9" } },
  { name: "Forest",   colors: { bg: "#F0FDF4", surface: "#DCFCE7", text: "#14532D", muted: "#4B7A5E", accent: "#16A34A", accent_text: "#FFFFFF", header_bg: "#DCFCE7", header_text: "#14532D" } },
  { name: "Rose",     colors: { bg: "#FFF1F2", surface: "#FFE4E6", text: "#881337", muted: "#BE123C", accent: "#E11D48", accent_text: "#FFFFFF", header_bg: "#FFE4E6", header_text: "#881337" } },
  { name: "Indigo",   colors: { bg: "#EEF2FF", surface: "#E0E7FF", text: "#1E1B4B", muted: "#6366F1", accent: "#4F46E5", accent_text: "#FFFFFF", header_bg: "#E0E7FF", header_text: "#1E1B4B" } },
  { name: "Gold",     colors: { bg: "#FFFBEB", surface: "#FEF3C7", text: "#1C1A00", muted: "#92400E", accent: "#D97706", accent_text: "#FFFFFF", header_bg: "#FEF3C7", header_text: "#1C1A00" } },
  { name: "Midnight", colors: { bg: "#09090B", surface: "#18181B", text: "#FAFAFA",  muted: "#A1A1AA", accent: "#FBBF24", accent_text: "#09090B", header_bg: "#18181B", header_text: "#FAFAFA" } },
  { name: "Olive",    colors: { bg: "#F5F1E8", surface: "#EDE9DC", text: "#1C2B10", muted: "#5A6B40", accent: "#4A6A1F", accent_text: "#FFFFFF", header_bg: "#1C2B10", header_text: "#F5F1E8" } },
  { name: "Coral",    colors: { bg: "#FFF5F0", surface: "#FFE9E0", text: "#7C2D12", muted: "#C2440D", accent: "#EA580C", accent_text: "#FFFFFF", header_bg: "#EA580C", header_text: "#FFFFFF" } },
];

const FONTS = [
  { label: "Inter",            value: "'Inter', system-ui, sans-serif",          hint: "Clean & modern" },
  { label: "Poppins",          value: "'Poppins', sans-serif",                   hint: "Round & friendly" },
  { label: "Playfair Display", value: "'Playfair Display', Georgia, serif",       hint: "Elegant & editorial" },
  { label: "Merriweather",     value: "'Merriweather', Georgia, serif",           hint: "Classic & readable" },
  { label: "DM Serif Display", value: "'DM Serif Display', serif",               hint: "Premium & refined" },
  { label: "Lora",             value: "'Lora', serif",                           hint: "Warm & literary" },
  { label: "Raleway",          value: "'Raleway', sans-serif",                   hint: "Geometric & minimal" },
  { label: "Nunito",           value: "'Nunito', sans-serif",                    hint: "Soft & approachable" },
  { label: "Space Grotesk",    value: "'Space Grotesk', sans-serif",             hint: "Tech & contemporary" },
  { label: "Josefin Sans",     value: "'Josefin Sans', sans-serif",              hint: "Slim & architectural" },
  { label: "Hind",             value: "'Hind', sans-serif",                     hint: "Hindi / Devanagari" },
  { label: "Noto Sans Thai",   value: "'Noto Sans Thai', sans-serif",            hint: "Thai script" },
  { label: "Noto Serif",       value: "'Noto Serif', serif",                    hint: "Multi-language support" },
];

const PATTERNS: { id: string; label: string; bgImage: string; bgSize: string }[] = [
  { id: "none",    label: "None",    bgImage: "none", bgSize: "" },
  { id: "dots",    label: "Dots",    bgImage: "radial-gradient(circle, rgba(0,0,0,0.13) 1.5px, transparent 1.5px)", bgSize: "10px 10px" },
  { id: "grid",    label: "Grid",    bgImage: "linear-gradient(rgba(0,0,0,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.07) 1px, transparent 1px)", bgSize: "16px 16px" },
  { id: "silk",    label: "Silk",    bgImage: "repeating-linear-gradient(45deg, rgba(0,0,0,0.06) 0, rgba(0,0,0,0.06) 1px, transparent 0, transparent 50%)", bgSize: "10px 10px" },
  { id: "chevron", label: "Chevron", bgImage: "linear-gradient(135deg,rgba(0,0,0,0.05) 25%,transparent 25%),linear-gradient(225deg,rgba(0,0,0,0.05) 25%,transparent 25%),linear-gradient(315deg,rgba(0,0,0,0.05) 25%,transparent 25%),linear-gradient(45deg,rgba(0,0,0,0.05) 25%,transparent 25%)", bgSize: "16px 16px" },
  { id: "waves",   label: "Waves",   bgImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.05) 0, rgba(0,0,0,0.05) 1px, transparent 0, transparent 8px)", bgSize: "" },
  { id: "mandala", label: "Mandala", bgImage: "radial-gradient(circle, rgba(0,0,0,0.08) 1px, transparent 1px)", bgSize: "14px 14px" },
  { id: "leaf",    label: "Leaf",    bgImage: "radial-gradient(ellipse at 50% 0%, rgba(0,0,0,0.1) 30%, transparent 70%)", bgSize: "20px 20px" },
];

const DEFAULT_THEME: ThemeConfig = {
  preset: "",
  font_family: "'Inter', system-ui, sans-serif",
  heading_font: "",
  font_size: "md",
  hero_title: "",
  hero_subtitle: "",
  layout: "list",
  image_style: "small",
  spacing: "normal",
  shadow: "sm",
  card_style: "rounded",
  button_style: "solid",
  section_icon: "•",
  bg_image_url: "",
  bg_overlay_opacity: 0.92,
  pattern_style: "none",
  motif: "minimal",
  ornament_level: "off",
  header_style: "classic",
  icon_pack: "auto",
  colors: {
    bg: "#F8FAFC", surface: "#FFFFFF", text: "#0F172A", muted: "#64748B",
    accent: "#0F172A", accent_text: "#FFFFFF", header_bg: "#FFFFFF", header_text: "#0F172A",
  },
};

const withDefaults = (v?: ThemeConfig): ThemeConfig => ({
  ...DEFAULT_THEME, ...v,
  colors: { ...DEFAULT_THEME.colors, ...(v?.colors || {}) },
});


export const THEME_DEFAULTS = DEFAULT_THEME;

// ─────────────────────────────────────────────────────────────────────────────
// Presets
// ─────────────────────────────────────────────────────────────────────────────

function PresetsTab({ theme, onChange }: { theme: ThemeConfig; onChange: (next: ThemeConfig) => void }) {
  return (
    <div className="space-y-6">
      <Group title="Start from a preset" hint="Sets colours, fonts and layout in one go. You can fine-tune everything afterwards.">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {PRESETS.map((p) => {
            const c = p.config.colors || {};
            const on = theme.preset === p.id;
            const radius = p.config.card_style === "sharp" ? 4 : p.config.card_style === "soft" ? 12 : 8;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onChange({ ...withDefaults(p.config) })}
                aria-pressed={on}
                className={`group overflow-hidden rounded-xl border text-left transition-colors ${on ? "border-[#fe5c13] ring-1 ring-[#fe5c13]" : "border-[#E8E8E3] hover:border-[#D6D6CF]"}`}
              >
                <span className="block p-3" style={{ background: c.bg }}>
                  <span
                    className="flex items-center justify-between px-2.5 py-1.5 text-[11px] font-semibold"
                    style={{ background: c.header_bg, color: c.header_text, borderRadius: radius, fontFamily: p.config.heading_font || p.config.font_family }}
                  >
                    Aa Menu
                  </span>
                  <span className="mt-2 flex items-center gap-2 p-2" style={{ background: c.surface, borderRadius: radius }}>
                    <span className="h-6 w-6 shrink-0" style={{ background: c.muted, opacity: 0.35, borderRadius: radius / 2 }} />
                    <span className="min-w-0 flex-1 space-y-1">
                      <span className="block h-1.5 w-3/4 rounded-full" style={{ background: c.text, opacity: 0.85 }} />
                      <span className="block h-1.5 w-1/2 rounded-full" style={{ background: c.muted, opacity: 0.6 }} />
                    </span>
                    <span
                      className="h-4 w-7 shrink-0"
                      style={
                        p.config.button_style === "outline"
                          ? { border: `1.5px solid ${c.accent}`, borderRadius: 999 }
                          : { background: c.accent, borderRadius: 999 }
                      }
                    />
                  </span>
                </span>
                <span className="flex items-center justify-between border-t border-[#F0F0EB] bg-white px-3 py-2">
                  <span className="text-[13px] font-semibold text-[#0F1117]">{p.name}</span>
                  {on ? (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#fe5c13] text-white">
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    </span>
                  ) : (
                    <span className="flex -space-x-1">
                      {p.palette.slice(2).map((col, i) => (
                        <span key={i} className="h-3 w-3 rounded-full border border-white" style={{ background: col }} />
                      ))}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </Group>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Colours
// ─────────────────────────────────────────────────────────────────────────────

type ColorKey = keyof NonNullable<ThemeConfig["colors"]>;

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex h-10 items-center gap-2.5 rounded-xl border border-[#E8E8E3] bg-white pl-1.5 pr-3 transition-colors hover:border-[#D6D6CF] focus-within:border-[#fe5c13]">
      <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-lg border border-black/10" style={{ background: value || "#000000" }}>
        <input
          type="color"
          value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          aria-label={`${label} colour`}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </span>
      <span className="min-w-0 flex-1 truncate text-[13px] text-[#4B5563]">{label}</span>
      <input
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        aria-label={`${label} hex code`}
        spellCheck={false}
        className="w-[4.75rem] bg-transparent text-right text-[12px] uppercase tabular-nums text-[#0F1117] outline-none"
      />
    </label>
  );
}

function ColorsTab({
  theme,
  setColor,
  onChange,
}: {
  theme: ThemeConfig;
  setColor: (k: ColorKey, v: string) => void;
  onChange: (next: ThemeConfig) => void;
}) {
  const GROUPS: { title: string; keys: [ColorKey, string][] }[] = [
    { title: "Page", keys: [["bg", "Background"], ["surface", "Cards"]] },
    { title: "Text", keys: [["text", "Main text"], ["muted", "Secondary text"]] },
    { title: "Buttons", keys: [["accent", "Button"], ["accent_text", "Button text"]] },
    { title: "Header", keys: [["header_bg", "Header"], ["header_text", "Header text"]] },
  ];
  const cur = theme.colors || {};
  return (
    <div className="space-y-6">
      <Group title="Colour palettes" hint="Applies a matching set of colours.">
        <div className="grid grid-cols-5 gap-2">
          {PALETTES.map((pal) => {
            const on = cur.bg === pal.colors.bg && cur.accent === pal.colors.accent && cur.surface === pal.colors.surface;
            return (
              <button
                key={pal.name}
                type="button"
                title={pal.name}
                aria-pressed={on}
                onClick={() => onChange({ ...theme, colors: { ...theme.colors, ...pal.colors } })}
                className="group flex flex-col items-center gap-1.5"
              >
                <span
                  className={`flex h-9 w-full overflow-hidden rounded-lg border transition-colors ${on ? "border-[#fe5c13] ring-1 ring-[#fe5c13]" : "border-[#E8E8E3] group-hover:border-[#D6D6CF]"}`}
                >
                  <span className="flex-1" style={{ background: pal.colors.bg }} />
                  <span className="flex-1" style={{ background: pal.colors.surface }} />
                  <span className="flex-1" style={{ background: pal.colors.accent }} />
                </span>
                <span className={`text-[12px] ${on ? "font-semibold text-[#0F1117]" : "text-[#6B7280]"}`}>{pal.name}</span>
              </button>
            );
          })}
        </div>
      </Group>
      <Divider />
      <Group title="Fine-tune" hint="Click a swatch to pick a colour, or type a hex code.">
        <div className="space-y-4">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <p className="mb-1.5 text-[12px] font-medium text-[#6B7280]">{g.title}</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {g.keys.map(([key, label]) => (
                  <ColorField key={key} label={label} value={cur[key] || ""} onChange={(v) => setColor(key, v)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Group>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Text
// ─────────────────────────────────────────────────────────────────────────────

function TypographyTab({ theme, setField }: { theme: ThemeConfig; setField: (k: keyof ThemeConfig, v: string) => void }) {
  return (
    <div className="space-y-6">
      <Group title="Welcome text" hint="Shown at the top of your menu.">
        <div className="space-y-3">
          <div>
            <label htmlFor="th-hero" className="mb-1.5 block text-[13px] font-medium text-[#4B5563]">Heading</label>
            <input
              id="th-hero"
              value={theme.hero_title || ""}
              onChange={(e) => setField("hero_title", e.target.value)}
              placeholder="Welcome to Osha Thai"
              className={INPUT}
            />
          </div>
          <div>
            <label htmlFor="th-sub" className="mb-1.5 block text-[13px] font-medium text-[#4B5563]">Tagline</label>
            <input
              id="th-sub"
              value={theme.hero_subtitle || ""}
              onChange={(e) => setField("hero_subtitle", e.target.value)}
              placeholder="Authentic flavours, every visit"
              className={INPUT}
            />
          </div>
        </div>
      </Group>
      <Divider />
      <Group title="Font">
        <div className="max-h-64 overflow-y-auto rounded-xl border border-[#E8E8E3]" role="radiogroup" aria-label="Font">
          {FONTS.map((f, i) => {
            const active = theme.font_family === f.value;
            return (
              <button
                key={f.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setField("font_family", f.value)}
                className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors ${i > 0 ? "border-t border-[#F0F0EB]" : ""} ${active ? "bg-[#FFF4EC]" : "hover:bg-[#FAFAF7]"}`}
              >
                <span className="w-8 shrink-0 text-[18px] text-[#0F1117]" style={{ fontFamily: f.value }}>Aa</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-medium text-[#0F1117]" style={{ fontFamily: f.value }}>{f.label}</span>
                  <span className="block text-[12px] text-[#6B7280]">{f.hint}</span>
                </span>
                {active && (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#fe5c13] text-white">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Group>
      <div className="grid gap-4 sm:grid-cols-2">
        <Group title="Heading font">
          <Select value={theme.heading_font || ""} onChange={(e) => setField("heading_font", e.target.value)} className={INPUT}>
            <option value="">Same as the font above</option>
            {FONTS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </Select>
        </Group>
        <Group title="Text size">
          <VisualPicker
            label="Text size"
            options={[
              { value: "sm", label: "Small" },
              { value: "md", label: "Medium" },
              { value: "lg", label: "Large" },
            ]}
            value={theme.font_size ?? "md"}
            onChange={(v) => setField("font_size", v)}
            cols={3}
          />
        </Group>
      </div>
      <Divider />
      <Group title="Category marker" hint="The small symbol shown before each menu category.">
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Category marker">
          {["•", "◆", "✦", "✺", "◈", "✿", "▶", "›", "❖", "⬡", "◉", "◬"].map((ic) => {
            const on = theme.section_icon === ic;
            return (
              <button
                key={ic}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setField("section_icon", ic)}
                className={`flex h-9 w-9 items-center justify-center rounded-lg border text-[15px] transition-colors ${on ? OPT_ON : OPT_OFF}`}
              >
                {ic}
              </button>
            );
          })}
        </div>
      </Group>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Layout
// ─────────────────────────────────────────────────────────────────────────────

function LayoutTab({ theme, setField }: { theme: ThemeConfig; setField: (k: keyof ThemeConfig, v: string) => void }) {
  return (
    <div className="space-y-6">
      <Group title="Menu layout" hint="How dishes are arranged on the page.">
        <VisualPicker
          label="Menu layout"
          options={[
            { value: "list", label: "List", art: LayoutArt.list },
            { value: "grid", label: "Grid", art: LayoutArt.grid },
            { value: "compact", label: "Compact", art: LayoutArt.compact },
            { value: "magazine", label: "Magazine", art: LayoutArt.magazine },
          ]}
          value={theme.layout ?? "list"}
          onChange={(v) => setField("layout", v)}
          cols={4}
        />
      </Group>
      <Group title="Dish photos">
        <VisualPicker
          label="Dish photos"
          options={[
            { value: "none", label: "None" },
            { value: "small", label: "Small" },
            { value: "large", label: "Large" },
            { value: "full", label: "Full width" },
          ]}
          value={theme.image_style ?? "small"}
          onChange={(v) => setField("image_style", v)}
          cols={4}
        />
      </Group>
      <Divider />
      <div className="grid gap-6 sm:grid-cols-2">
        <Group title="Spacing">
          <VisualPicker
            label="Spacing"
            options={[
              { value: "compact", label: "Tight" },
              { value: "normal", label: "Normal" },
              { value: "relaxed", label: "Airy" },
            ]}
            value={theme.spacing ?? "normal"}
            onChange={(v) => setField("spacing", v)}
            cols={3}
          />
        </Group>
        <Group title="Card corners">
          <VisualPicker
            label="Card corners"
            options={[
              { value: "sharp", label: "Sharp" },
              { value: "rounded", label: "Rounded" },
              { value: "soft", label: "Soft" },
            ]}
            value={theme.card_style ?? "rounded"}
            onChange={(v) => setField("card_style", v)}
            cols={3}
          />
        </Group>
        <Group title="Buttons">
          <VisualPicker
            label="Buttons"
            options={[
              { value: "solid", label: "Solid" },
              { value: "outline", label: "Outline" },
              { value: "glass", label: "Glass" },
            ]}
            value={theme.button_style ?? "solid"}
            onChange={(v) => setField("button_style", v)}
            cols={3}
          />
        </Group>
        <Group title="Shadow">
          <VisualPicker
            label="Shadow"
            options={[
              { value: "none", label: "None" },
              { value: "sm", label: "Light" },
              { value: "md", label: "Medium" },
              { value: "lg", label: "Strong" },
            ]}
            value={theme.shadow ?? "sm"}
            onChange={(v) => setField("shadow", v)}
            cols={4}
          />
        </Group>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Background
// ─────────────────────────────────────────────────────────────────────────────

function BackgroundTab({
  theme,
  setField,
  onChange,
  onBackgroundUpload,
  isBackgroundUploading,
}: {
  theme: ThemeConfig;
  setField: (k: keyof ThemeConfig, v: string) => void;
  onChange: (next: ThemeConfig) => void;
  onBackgroundUpload?: (file: File) => Promise<string>;
  isBackgroundUploading: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = async (file?: File | null) => {
    if (!file || !onBackgroundUpload || !file.type.startsWith("image/")) return;
    const url = await onBackgroundUpload(file);
    if (url) setField("bg_image_url", url);
  };
  const tint = Math.round((theme.bg_overlay_opacity ?? 0.92) * 100);

  return (
    <div className="space-y-6">
      <Group title="Background photo" hint="A photo behind your menu, softened so dishes stay readable.">
        {theme.bg_image_url ? (
          <div className="overflow-hidden rounded-xl border border-[#E8E8E3]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={theme.bg_image_url} alt="Menu background" className="h-28 w-full object-cover" />
            <div className="space-y-3 border-t border-[#F0F0EB] p-4">
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="th-tint" className="text-[13px] font-medium text-[#4B5563]">Soften photo</label>
                  <span className="text-[12px] tabular-nums text-[#6B7280]">{tint}%</span>
                </div>
                <input
                  id="th-tint"
                  type="range"
                  min={60}
                  max={99}
                  step={1}
                  value={tint}
                  onChange={(e) => onChange({ ...theme, bg_overlay_opacity: Number(e.target.value) / 100 })}
                  className="w-full accent-[#fe5c13]"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isBackgroundUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#E8E8E3] bg-white px-3 text-[13px] font-semibold text-[#374151] transition-colors hover:border-[#D6D6CF] hover:text-[#0F1117] disabled:opacity-60"
                >
                  <ImagePlus className="h-4 w-4 text-[#6B7280]" /> {isBackgroundUploading ? "Uploading" : "Replace"}
                </button>
                <button
                  type="button"
                  onClick={() => setField("bg_image_url", "")}
                  className="inline-flex h-9 items-center gap-2 rounded-xl px-3 text-[13px] font-medium text-[#6B7280] transition-colors hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 className="h-4 w-4" /> Remove
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={async (e) => { e.preventDefault(); setIsDragOver(false); await handleFile(e.dataTransfer.files?.[0]); }}
            className={`flex flex-col items-center rounded-xl border border-dashed px-5 py-7 text-center transition-colors ${isDragOver ? "border-[#fe5c13] bg-[#FFF4EC]" : "border-[#D6D6CF] bg-[#FAFAF7]"}`}
          >
            <UploadCloud className="h-5 w-5 text-[#9CA3AF]" />
            <p className="mt-2 text-[13px] text-[#4B5563]">Drop a photo here, or</p>
            <button
              type="button"
              disabled={isBackgroundUploading}
              onClick={() => fileInputRef.current?.click()}
              className="mt-2.5 inline-flex h-9 items-center gap-2 rounded-xl border border-[#E8E8E3] bg-white px-3 text-[13px] font-semibold text-[#374151] transition-colors hover:border-[#D6D6CF] hover:text-[#0F1117] disabled:opacity-60"
            >
              <ImagePlus className="h-4 w-4 text-[#6B7280]" />
              {isBackgroundUploading ? "Uploading" : "Choose a photo"}
            </button>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const f = e.currentTarget.files?.[0];
            await handleFile(f);
            e.currentTarget.value = "";
          }}
        />
      </Group>
      <Divider />
      <Group title="Pattern" hint="A subtle texture behind the menu.">
        <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Pattern">
          {PATTERNS.map((pat) => {
            const active = (theme.pattern_style ?? "none") === pat.id;
            return (
              <button
                key={pat.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setField("pattern_style", pat.id)}
                className={`flex h-16 flex-col items-center justify-end rounded-xl border pb-1.5 transition-colors ${active ? "border-[#fe5c13] ring-1 ring-[#fe5c13]" : "border-[#E8E8E3] hover:border-[#D6D6CF]"}`}
                style={
                  pat.bgImage !== "none"
                    ? { backgroundImage: pat.bgImage, backgroundSize: pat.bgSize || "auto", backgroundColor: "#FAFAF7" }
                    : { background: "#FAFAF7" }
                }
              >
                <span className={`rounded-md bg-white/90 px-1.5 text-[12px] ${active ? "font-semibold text-[#0F1117]" : "text-[#6B7280]"}`}>{pat.label}</span>
              </button>
            );
          })}
        </div>
      </Group>
      <div className="grid gap-6 sm:grid-cols-2">
        <Group title="Header style">
          <VisualPicker
            label="Header style"
            options={[
              { value: "classic", label: "Classic" },
              { value: "elegant", label: "Elegant" },
              { value: "festival", label: "Festive" },
            ]}
            value={theme.header_style ?? "classic"}
            onChange={(v) => setField("header_style", v)}
            cols={3}
          />
        </Group>
        <Group title="Decorations">
          <VisualPicker
            label="Decorations"
            options={[
              { value: "off", label: "Off" },
              { value: "subtle", label: "Subtle" },
              { value: "bold", label: "Bold" },
            ]}
            value={theme.ornament_level ?? "off"}
            onChange={(v) => setField("ornament_level", v)}
            cols={3}
          />
        </Group>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

export default function ThemeCustomizer({ value, onChange, onBackgroundUpload, isBackgroundUploading = false }: Props) {
  const theme = withDefaults(value);
  const [tab, setTab] = useState<Tab>("presets");

  const setField = (key: keyof ThemeConfig, val: string) => onChange({ ...theme, [key]: val });
  const setColor = (key: ColorKey, val: string) => onChange({ ...theme, colors: { ...(theme.colors || {}), [key]: val } });

  return (
    <section className="flex flex-col overflow-hidden rounded-2xl border border-[#E8E8E3] bg-white">
      <nav className="flex items-center gap-1 overflow-x-auto border-b border-[#F0F0EB] px-3" role="tablist" aria-label="Theme settings">
        {TABS.map((t) => {
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setTab(t.id)}
              className={`-mb-px h-12 shrink-0 border-b-2 px-3 text-[13px] transition-colors ${on ? "border-[#fe5c13] font-semibold text-[#0F1117]" : "border-transparent font-medium text-[#6B7280] hover:text-[#0F1117]"}`}
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      <div className="flex-1 p-6">
        {tab === "presets" && <PresetsTab theme={theme} onChange={onChange} />}
        {tab === "colors" && <ColorsTab theme={theme} setColor={setColor} onChange={onChange} />}
        {tab === "typography" && <TypographyTab theme={theme} setField={setField} />}
        {tab === "layout" && <LayoutTab theme={theme} setField={setField} />}
        {tab === "background" && (
          <BackgroundTab
            theme={theme}
            setField={setField}
            onChange={onChange}
            onBackgroundUpload={onBackgroundUpload}
            isBackgroundUploading={isBackgroundUploading}
          />
        )}
      </div>
    </section>
  );
}
