"use client";

import React, { useRef, useState } from "react";
import { ImagePlus, Trash2, UploadCloud } from "lucide-react";
import type { ThemeConfig } from "./types";

type Props = {
  value: ThemeConfig;
  onChange: (next: ThemeConfig) => void;
  onBackgroundUpload?: (file: File) => Promise<string>;
  isBackgroundUploading?: boolean;
};

const PRESETS: Array<{ id: "thai" | "indian" | "minimal"; name: string; config: ThemeConfig }> = [
  {
    id: "thai",
    name: "Thai",
    config: {
      preset: "thai",
      motif: "thai",
      ornament_level: "bold",
      header_style: "elegant",
      pattern_style: "silk",
      section_icon: "✦",
      icon_pack: "thai",
      font_family: "'Noto Sans Thai', 'Trebuchet MS', sans-serif",
      card_style: "rounded",
      button_style: "solid",
      colors: {
        bg: "#FFF7E8",
        surface: "#FFF1D2",
        text: "#3A1D0F",
        muted: "#8C5E3C",
        accent: "#C2410C",
        accent_text: "#FFFFFF",
      },
    },
  },
  {
    id: "indian",
    name: "Indian",
    config: {
      preset: "indian",
      motif: "indian",
      ornament_level: "bold",
      header_style: "festival",
      pattern_style: "mandala",
      section_icon: "✺",
      icon_pack: "indian",
      font_family: "'Hind', 'Segoe UI', sans-serif",
      card_style: "soft",
      button_style: "solid",
      colors: {
        bg: "#FFF9F2",
        surface: "#FFF1E4",
        text: "#1F2937",
        muted: "#8B5E3C",
        accent: "#D97706",
        accent_text: "#FFFFFF",
      },
    },
  },
  {
    id: "minimal",
    name: "Minimal",
    config: {
      preset: "minimal",
      motif: "minimal",
      ornament_level: "off",
      header_style: "classic",
      pattern_style: "none",
      section_icon: "•",
      icon_pack: "minimal",
      font_family: "'Inter', 'Segoe UI', sans-serif",
      card_style: "sharp",
      button_style: "outline",
      colors: {
        bg: "#F8FAFC",
        surface: "#FFFFFF",
        text: "#0F172A",
        muted: "#64748B",
        accent: "#0F172A",
        accent_text: "#FFFFFF",
      },
    },
  },
];

const DEFAULT_THEME: ThemeConfig = {
  preset: "",
  font_family: "",
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

const withDefaults = (v?: ThemeConfig): ThemeConfig => ({
  ...DEFAULT_THEME,
  ...v,
  colors: {
    ...DEFAULT_THEME.colors,
    ...(v?.colors || {}),
  },
});

export default function ThemeCustomizer({
  value,
  onChange,
  onBackgroundUpload,
  isBackgroundUploading = false,
}: Props) {
  const theme = withDefaults(value);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const setField = (key: keyof ThemeConfig, val: string) => onChange({ ...theme, [key]: val });
  const setColor = (key: keyof NonNullable<ThemeConfig["colors"]>, val: string) =>
    onChange({ ...theme, colors: { ...(theme.colors || {}), [key]: val } });

  const handleBackgroundFile = async (file?: File | null) => {
    if (!file || !onBackgroundUpload || !file.type.startsWith("image/")) return;
    const publicUrl = await onBackgroundUpload(file);
    if (publicUrl) setField("bg_image_url", publicUrl);
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Customize Menu Theme</h2>
            <p className="text-xs text-slate-500">Start with preset, then fine-tune only what you need.</p>
          </div>
          <button
            type="button"
            onClick={() => onChange(DEFAULT_THEME)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Preset</p>
          <div className="flex flex-wrap gap-2">
            <PresetButton label="Default" onClick={() => onChange(DEFAULT_THEME)} />
            {PRESETS.map((p) => (
              <PresetButton key={p.id} label={p.name} onClick={() => onChange(p.config)} />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Box title="Style Basics">
            <div className="space-y-3">
              <Input label="Font Family">
                <input
                  value={theme.font_family || ""}
                  onChange={(e) => setField("font_family", e.target.value)}
                  placeholder="'Hind', 'Segoe UI', sans-serif"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </Input>

              <div className="grid grid-cols-2 gap-3">
                <Input label="Motif">
                  <select value={theme.motif || "minimal"} onChange={(e) => setField("motif", e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                    <option value="thai">Thai</option>
                    <option value="indian">Indian</option>
                    <option value="minimal">Minimal</option>
                    <option value="custom">Custom</option>
                  </select>
                </Input>
                <Input label="Card Style">
                  <select value={theme.card_style || "rounded"} onChange={(e) => setField("card_style", e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                    <option value="rounded">Rounded</option>
                    <option value="soft">Soft</option>
                    <option value="sharp">Sharp</option>
                  </select>
                </Input>
                <Input label="Button Style">
                  <select value={theme.button_style || "solid"} onChange={(e) => setField("button_style", e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                    <option value="solid">Solid</option>
                    <option value="outline">Outline</option>
                    <option value="glass">Glass</option>
                  </select>
                </Input>
                <Input label="Section Icon">
                  <input value={theme.section_icon || ""} onChange={(e) => setField("section_icon", e.target.value.slice(0, 8))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </Input>
              </div>
            </div>
          </Box>

          <Box title="Background">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={async (e) => {
                e.preventDefault();
                setIsDragOver(false);
                await handleBackgroundFile(e.dataTransfer.files?.[0]);
              }}
              className={`rounded-xl border-2 border-dashed p-4 text-center ${isDragOver ? "border-slate-500 bg-slate-50" : "border-slate-200"}`}
            >
              <UploadCloud className="mx-auto h-5 w-5 text-slate-500" />
              <p className="mt-1 text-sm font-medium text-slate-800">Drag image here</p>
              <p className="text-xs text-slate-500">PNG / JPG / WEBP</p>
              <button
                type="button"
                disabled={isBackgroundUploading}
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
              >
                <ImagePlus className="h-4 w-4" />
                {isBackgroundUploading ? "Uploading..." : "Upload"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const input = e.currentTarget;
                  const file = input.files?.[0];
                  await handleBackgroundFile(file);
                  input.value = "";
                }}
              />
            </div>
            {theme.bg_image_url ? (
              <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={theme.bg_image_url} alt="Theme background" className="h-24 w-full object-cover" />
                <button type="button" onClick={() => setField("bg_image_url", "")} className="w-full border-t border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                  <Trash2 className="mr-1 inline h-3.5 w-3.5" />
                  Remove image
                </button>
              </div>
            ) : null}
            <div className="mt-3">
              <label className="mb-1 block text-[11px] font-medium text-slate-600">
                Background intensity ({Math.round((theme.bg_overlay_opacity ?? 0.92) * 100)}%)
              </label>
              <input
                type="range"
                min={70}
                max={98}
                step={1}
                value={Math.round((theme.bg_overlay_opacity ?? 0.92) * 100)}
                onChange={(e) => onChange({ ...theme, bg_overlay_opacity: Number(e.target.value) / 100 })}
                className="w-full"
              />
            </div>
          </Box>
        </div>

        <details className="rounded-xl border border-slate-200">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-800">Advanced style controls</summary>
          <div className="grid grid-cols-1 gap-3 border-t border-slate-100 px-4 py-3 md:grid-cols-2">
            <Input label="Ornament">
              <select value={theme.ornament_level || "off"} onChange={(e) => setField("ornament_level", e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option value="off">Off</option><option value="subtle">Subtle</option><option value="bold">Bold</option>
              </select>
            </Input>
            <Input label="Header">
              <select value={theme.header_style || "classic"} onChange={(e) => setField("header_style", e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option value="classic">Classic</option><option value="elegant">Elegant</option><option value="festival">Festival</option>
              </select>
            </Input>
            <Input label="Pattern">
              <select value={theme.pattern_style || "none"} onChange={(e) => setField("pattern_style", e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option value="none">None</option><option value="silk">Silk</option><option value="mandala">Mandala</option><option value="waves">Waves</option><option value="leaf">Leaf</option>
              </select>
            </Input>
            <Input label="Icon Pack">
              <select value={theme.icon_pack || "auto"} onChange={(e) => setField("icon_pack", e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option value="auto">Auto</option><option value="thai">Thai</option><option value="indian">Indian</option><option value="minimal">Minimal</option>
              </select>
            </Input>
          </div>
        </details>

        <details className="rounded-xl border border-slate-200">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-800">Colors</summary>
          <div className="grid grid-cols-1 gap-3 border-t border-slate-100 px-4 py-3 md:grid-cols-2 lg:grid-cols-3">
            {([
              ["bg", "Background"],
              ["surface", "Surface"],
              ["text", "Text"],
              ["muted", "Muted"],
              ["accent", "Accent"],
              ["accent_text", "Accent Text"],
            ] as const).map(([key, label]) => (
              <div key={key} className="rounded-lg border border-slate-200 p-2">
                <label className="mb-1 block text-[11px] font-medium text-slate-600">{label}</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={theme.colors?.[key] || "#000000"} onChange={(e) => setColor(key, e.target.value.toUpperCase())} className="h-8 w-8 rounded border border-slate-200 p-0" />
                  <input value={theme.colors?.[key] || ""} onChange={(e) => setColor(key, e.target.value)} className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs" />
                </div>
              </div>
            ))}
          </div>
        </details>
      </div>
    </section>
  );
}

function PresetButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
      {label}
    </button>
  );
}

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 p-3.5">
      <h3 className="mb-3 text-sm font-semibold text-slate-800">{title}</h3>
      {children}
    </section>
  );
}

function Input({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-slate-600">{label}</label>
      {children}
    </div>
  );
}
