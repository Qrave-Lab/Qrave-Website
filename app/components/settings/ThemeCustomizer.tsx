"use client";

import React, { useRef, useState } from "react";
import { Check, ImagePlus, Trash2, UploadCloud } from "lucide-react";
import type { ThemeConfig } from "./types";

// ─── Tab types & helpers ──────────────────────────────────────────────────────

type Tab = "presets" | "colors" | "typography" | "layout" | "background";

const TABS: { id: Tab; label: string }[] = [
  { id: "presets",    label: "Presets"     },
  { id: "colors",     label: "Colors"      },
  { id: "typography", label: "Typography"  },
  { id: "layout",     label: "Layout"      },
  { id: "background", label: "Background"  },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">{children}</p>;
}

function Divider() { return <div className="my-4 border-t border-slate-100" />; }

type VisualOpt<T extends string> = { value: T; label: string; icon?: string };

function VisualPicker<T extends string>({
  options, value, onChange, cols,
}: { options: VisualOpt<T>[]; value: T; onChange: (v: T) => void; cols?: number }) {
  const gridCols = cols ?? Math.min(options.length, 4);
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`relative flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-[11px] font-semibold transition-all ${
            value === opt.value
              ? "border-slate-900 bg-slate-900 text-white shadow-sm"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
          }`}
        >
          {opt.icon && <span className="text-sm leading-none">{opt.icon}</span>}
          <span>{opt.label}</span>
          {value === opt.value && (
            <span className="absolute top-1 right-1"><Check className="w-2.5 h-2.5" /></span>
          )}
        </button>
      ))}
    </div>
  );
}

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

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Presets
// ─────────────────────────────────────────────────────────────────────────────

function PresetsTab({ onChange }: { onChange: (next: ThemeConfig) => void }) {
  return (
    <div className="space-y-4">
      <SectionLabel>Starter presets</SectionLabel>
      <div className="grid grid-cols-2 gap-3">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange({ ...withDefaults(p.config) })}
            className="group flex flex-col items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-slate-400 hover:bg-white"
          >
            <span className="text-lg">{p.emoji}</span>
            <span className="text-sm font-semibold text-slate-800">{p.name}</span>
            <div className="flex gap-1">
              {p.palette.map((c, i) => (
                <span key={i} className="h-3 w-3 rounded-full border border-black/10" style={{ background: c }} />
              ))}
            </div>
          </button>
        ))}
      </div>
      <Divider />
      <button
        type="button"
        onClick={() => onChange(DEFAULT_THEME)}
        className="w-full rounded-xl border border-dashed border-slate-300 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50"
      >
        Reset to defaults
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Colors
// ─────────────────────────────────────────────────────────────────────────────

function ColorsTab({
  theme,
  setColor,
  onChange,
}: {
  theme: ThemeConfig;
  setColor: (k: keyof NonNullable<ThemeConfig["colors"]>, v: string) => void;
  onChange: (next: ThemeConfig) => void;
}) {
  const SWATCH_KEYS: [keyof NonNullable<ThemeConfig["colors"]>, string][] = [
    ["bg", "Background"],
    ["surface", "Surface"],
    ["text", "Text"],
    ["muted", "Muted"],
    ["accent", "Accent"],
    ["accent_text", "Accent Text"],
    ["header_bg", "Header BG"],
    ["header_text", "Header Text"],
  ];
  return (
    <div className="space-y-4">
      <SectionLabel>Palettes</SectionLabel>
      <div className="grid grid-cols-5 gap-2">
        {PALETTES.map((pal) => (
          <button
            key={pal.name}
            type="button"
            title={pal.name}
            onClick={() => onChange({ ...theme, colors: { ...theme.colors, ...pal.colors } })}
            className="group flex flex-col items-center gap-1"
          >
            <div className="flex h-8 w-full overflow-hidden rounded-lg border border-slate-200 shadow-sm group-hover:ring-2 group-hover:ring-slate-400">
              <span className="flex-1" style={{ background: pal.colors.bg }} />
              <span className="flex-1" style={{ background: pal.colors.surface }} />
              <span className="flex-1" style={{ background: pal.colors.accent }} />
            </div>
            <span className="text-[10px] text-slate-500">{pal.name}</span>
          </button>
        ))}
      </div>
      <Divider />
      <SectionLabel>Individual colors</SectionLabel>
      <div className="grid grid-cols-2 gap-2">
        {SWATCH_KEYS.map(([key, label]) => (
          <div key={key} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
            <input
              type="color"
              value={theme.colors?.[key] || "#000000"}
              onChange={(e) => setColor(key, e.target.value.toUpperCase())}
              className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
            />
            <div className="min-w-0">
              <p className="truncate text-[10px] font-semibold text-slate-700">{label}</p>
              <input
                value={theme.colors?.[key] || ""}
                onChange={(e) => setColor(key, e.target.value)}
                className="w-full bg-transparent text-[11px] text-slate-500 outline-none"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Typography
// ─────────────────────────────────────────────────────────────────────────────

function TypographyTab({
  theme,
  setField,
}: {
  theme: ThemeConfig;
  setField: (k: keyof ThemeConfig, v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <SectionLabel>Body font</SectionLabel>
      <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200">
        {FONTS.map((f, i) => {
          const active = theme.font_family === f.value;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setField("font_family", f.value)}
              className={`flex w-full items-center gap-3 px-3 py-2 text-left transition ${i > 0 ? "border-t border-slate-100" : ""} ${active ? "bg-slate-900 text-white" : "hover:bg-slate-50"}`}
            >
              <span className="w-6 shrink-0 text-base" style={{ fontFamily: f.value }}>Aa</span>
              <div className="min-w-0 flex-1">
                <p className={`text-xs font-semibold ${active ? "text-white" : "text-slate-800"}`}>{f.label}</p>
                <p className={`text-[10px] ${active ? "text-slate-300" : "text-slate-400"}`}>{f.hint}</p>
              </div>
              {active && <Check className="h-3.5 w-3.5 shrink-0" />}
            </button>
          );
        })}
      </div>

      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Heading font (optional)</p>
        <select
          value={theme.heading_font || ""}
          onChange={(e) => setField("heading_font", e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">— Same as body —</option>
          {FONTS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      <Divider />
      <SectionLabel>Size</SectionLabel>
      <VisualPicker
        options={[
          { value: "sm", label: "Small" },
          { value: "md", label: "Medium" },
          { value: "lg", label: "Large" },
        ]}
        value={theme.font_size ?? "md"}
        onChange={(v) => setField("font_size", v)}
        cols={3}
      />

      <Divider />
      <SectionLabel>Hero texts</SectionLabel>
      <div className="space-y-2">
        <input
          value={theme.hero_title || ""}
          onChange={(e) => setField("hero_title", e.target.value)}
          placeholder="Main heading (e.g. Welcome to Osha Thai)"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-400"
        />
        <input
          value={theme.hero_subtitle || ""}
          onChange={(e) => setField("hero_subtitle", e.target.value)}
          placeholder="Sub-heading (e.g. Authentic flavours, every visit)"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-400"
        />
      </div>

      <Divider />
      <SectionLabel>Section icon</SectionLabel>
      <div className="flex flex-wrap gap-1.5">
        {["•", "◆", "✦", "✺", "◈", "✿", "▶", "›", "❖", "⬡", "◉", "◬"].map((ic) => (
          <button
            key={ic}
            type="button"
            onClick={() => setField("section_icon", ic)}
            className={`rounded-lg border px-2.5 py-1 text-sm ${theme.section_icon === ic ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
          >
            {ic}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Layout
// ─────────────────────────────────────────────────────────────────────────────

function LayoutTab({
  theme,
  setField,
}: {
  theme: ThemeConfig;
  setField: (k: keyof ThemeConfig, v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <SectionLabel>Menu layout</SectionLabel>
      <VisualPicker
        options={[
          { value: "list",    label: "List" },
          { value: "grid",    label: "Grid" },
          { value: "compact", label: "Compact" },
        ]}
        value={theme.layout ?? "list"}
        onChange={(v) => setField("layout", v)}
        cols={3}
      />

      <SectionLabel>Item images</SectionLabel>
      <VisualPicker
        options={[
          { value: "none",  label: "None" },
          { value: "small", label: "Small" },
          { value: "large", label: "Large" },
          { value: "full",  label: "Full" },
        ]}
        value={theme.image_style ?? "small"}
        onChange={(v) => setField("image_style", v)}
        cols={4}
      />

      <SectionLabel>Spacing</SectionLabel>
      <VisualPicker
        options={[
          { value: "compact",  label: "Compact" },
          { value: "normal",   label: "Normal" },
          { value: "relaxed",  label: "Relaxed" },
        ]}
        value={theme.spacing ?? "normal"}
        onChange={(v) => setField("spacing", v)}
        cols={3}
      />

      <SectionLabel>Card style</SectionLabel>
      <VisualPicker
        options={[
          { value: "sharp",   label: "Sharp" },
          { value: "rounded", label: "Rounded" },
          { value: "soft",    label: "Soft" },
        ]}
        value={theme.card_style ?? "rounded"}
        onChange={(v) => setField("card_style", v)}
        cols={3}
      />

      <SectionLabel>Button style</SectionLabel>
      <VisualPicker
        options={[
          { value: "solid",   label: "Solid" },
          { value: "outline", label: "Outline" },
          { value: "glass",   label: "Glass" },
        ]}
        value={theme.button_style ?? "solid"}
        onChange={(v) => setField("button_style", v)}
        cols={3}
      />

      <SectionLabel>Shadow</SectionLabel>
      <VisualPicker
        options={[
          { value: "none", label: "None" },
          { value: "sm",   label: "Sm" },
          { value: "md",   label: "Md" },
          { value: "lg",   label: "Lg" },
        ]}
        value={theme.shadow ?? "sm"}
        onChange={(v) => setField("shadow", v)}
        cols={4}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Background
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

  return (
    <div className="space-y-4">
      <SectionLabel>Pattern overlay</SectionLabel>
      <div className="grid grid-cols-4 gap-2">
        {PATTERNS.map((pat) => {
          const active = (theme.pattern_style ?? "none") === pat.id;
          return (
            <button
              key={pat.id}
              type="button"
              onClick={() => setField("pattern_style", pat.id)}
              className={`flex h-14 flex-col items-center justify-end rounded-xl border pb-1 transition ${active ? "border-slate-900 ring-2 ring-slate-900" : "border-slate-200 hover:border-slate-400"}`}
              style={
                pat.bgImage !== "none"
                  ? { backgroundImage: pat.bgImage, backgroundSize: pat.bgSize || "auto", backgroundColor: "#f8fafc" }
                  : { background: "#f8fafc" }
              }
            >
              <span className={`text-[10px] font-semibold ${active ? "text-slate-900" : "text-slate-500"}`}>{pat.label}</span>
            </button>
          );
        })}
      </div>

      <Divider />
      <SectionLabel>Header style</SectionLabel>
      <VisualPicker
        options={[
          { value: "classic",  label: "Classic" },
          { value: "elegant",  label: "Elegant" },
          { value: "festival", label: "Festival" },
        ]}
        value={theme.header_style ?? "classic"}
        onChange={(v) => setField("header_style", v)}
        cols={3}
      />

      <SectionLabel>Ornament level</SectionLabel>
      <VisualPicker
        options={[
          { value: "off",    label: "Off" },
          { value: "subtle", label: "Subtle" },
          { value: "bold",   label: "Bold" },
        ]}
        value={theme.ornament_level ?? "off"}
        onChange={(v) => setField("ornament_level", v)}
        cols={3}
      />

      <Divider />
      <SectionLabel>Background image</SectionLabel>
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={async (e) => { e.preventDefault(); setIsDragOver(false); await handleFile(e.dataTransfer.files?.[0]); }}
        className={`rounded-xl border-2 border-dashed p-5 text-center transition ${isDragOver ? "border-slate-500 bg-slate-50" : "border-slate-200"}`}
      >
        <UploadCloud className="mx-auto h-5 w-5 text-slate-400" />
        <p className="mt-1 text-xs font-medium text-slate-600">Drag image or</p>
        <button
          type="button"
          disabled={isBackgroundUploading}
          onClick={() => fileInputRef.current?.click()}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
        >
          <ImagePlus className="h-3.5 w-3.5" />
          {isBackgroundUploading ? "Uploading…" : "Browse"}
        </button>
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
      </div>

      {theme.bg_image_url && (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={theme.bg_image_url} alt="BG preview" className="h-24 w-full object-cover" />
          <div className="border-t border-slate-100 p-3">
            <label className="mb-1 block text-[11px] font-medium text-slate-600">
              Overlay tint ({Math.round((theme.bg_overlay_opacity ?? 0.92) * 100)}%)
            </label>
            <input
              type="range" min={60} max={99} step={1}
              value={Math.round((theme.bg_overlay_opacity ?? 0.92) * 100)}
              onChange={(e) => onChange({ ...theme, bg_overlay_opacity: Number(e.target.value) / 100 })}
              className="w-full"
            />
            <button
              type="button"
              onClick={() => setField("bg_image_url", "")}
              className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:underline"
            >
              <Trash2 className="h-3.5 w-3.5" /> Remove image
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

export default function ThemeCustomizer({
  value,
  onChange,
  onBackgroundUpload,
  isBackgroundUploading = false,
}: Props) {
  const theme = withDefaults(value);
  const [tab, setTab] = useState<Tab>("presets");

  const setField = (key: keyof ThemeConfig, val: string) =>
    onChange({ ...theme, [key]: val });
  const setColor = (key: keyof NonNullable<ThemeConfig["colors"]>, val: string) =>
    onChange({ ...theme, colors: { ...(theme.colors || {}), [key]: val } });

  return (
    <section className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Theme Studio</h2>
          <p className="text-[11px] text-slate-500">Customize your menu&apos;s look &amp; feel</p>
        </div>
        <button
          type="button"
          onClick={() => onChange(DEFAULT_THEME)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
        >
          Reset
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-slate-100 bg-slate-50">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 text-[11px] font-semibold transition ${tab === t.id ? "border-b-2 border-slate-900 bg-white text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {tab === "presets" && <PresetsTab onChange={onChange} />}
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
