"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, RotateCcw } from "lucide-react";
import SettingsPageLayout from "@/app/components/settings/SettingsPageLayout";
import ThemeCustomizer, { THEME_DEFAULTS } from "@/app/components/settings/ThemeCustomizer";
import type { ThemeConfig } from "@/app/components/settings/types";
import { api } from "@/app/lib/api";
import toast from "react-hot-toast";

const BTN_SECONDARY =
  "inline-flex h-10 items-center gap-2 rounded-xl border border-[#E8E8E3] bg-white px-3.5 text-[13px] font-semibold text-[#374151] transition-colors hover:border-[#D6D6CF] hover:text-[#0F1117] disabled:opacity-50";

export default function ThemeSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [restaurantName, setRestaurantName] = useState("Your Restaurant");
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>({});
  const [savedConfig, setSavedConfig] = useState<ThemeConfig>({});

  useEffect(() => {
    (async () => {
      try {
        const me = await api<{ restaurant?: string; theme_config?: ThemeConfig }>("/api/admin/me", { method: "GET" });
        setRestaurantName(me.restaurant || "Your Restaurant");
        setThemeConfig(me.theme_config || {});
        setSavedConfig(me.theme_config || {});
      } catch { toast.error("Failed to load theme settings"); } finally { setLoading(false); }
    })();
  }, []);

  const isDirty = useMemo(() => JSON.stringify(themeConfig) !== JSON.stringify(savedConfig), [themeConfig, savedConfig]);

  const saveTheme = async () => {
    setSaving(true);
    try {
      await api("/api/admin/update-details", { method: "PATCH", body: JSON.stringify({ theme_config: themeConfig }) });
      setSavedConfig(themeConfig);
      toast.success("Theme saved");
    }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed to save theme"); } finally { setSaving(false); }
  };

  const uploadBackground = async (file: File): Promise<string> => {
    if (!file || !file.type.startsWith("image/")) { toast.error("Please upload an image file"); return ""; }
    setUploadingBg(true);
    try {
      const ct = encodeURIComponent(file.type || "image/png");
      const { upload_url, public_url } = await api<{ upload_url: string; public_url: string }>(`/api/admin/theme/background/upload-url?content_type=${ct}`, { method: "POST" });
      const putRes = await fetch(upload_url, { method: "PUT", headers: { "Content-Type": file.type || "image/png" }, body: file });
      if (!putRes.ok) throw new Error("Upload failed");
      toast.success("Background uploaded"); return public_url;
    } catch { toast.error("Background upload failed"); return ""; } finally { setUploadingBg(false); }
  };

  const previewUrl = `/preview/menu?name=${encodeURIComponent(restaurantName)}&theme=${encodeURIComponent(JSON.stringify(themeConfig || {}))}`;

  return (
    <SettingsPageLayout
      title="Theme studio"
      description="How your QR menu looks to guests. The preview updates as you go."
      maxWidth="max-w-[1400px]"
      action={
        <>
          {isDirty && !saving && (
            <span className="hidden items-center gap-1.5 text-[13px] text-[#6B7280] md:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Unsaved changes
            </span>
          )}
          {isDirty && !saving ? (
            <button type="button" onClick={() => setThemeConfig(savedConfig)} className={BTN_SECONDARY}>
              Discard
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setThemeConfig(THEME_DEFAULTS)}
              disabled={loading}
              title="Go back to the default look. Nothing is saved until you press Save theme."
              className={BTN_SECONDARY}
            >
              <RotateCcw className="h-4 w-4 text-[#6B7280]" /> Reset to default
            </button>
          )}
          <button
            onClick={saveTheme}
            disabled={loading || saving || !isDirty}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#fe5c13] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#e44e0b] disabled:cursor-not-allowed disabled:bg-[#F3F3EF] disabled:text-[#9CA3AF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fe5c13]/40 focus-visible:ring-offset-2"
          >
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving</> : isDirty ? "Save theme" : "Saved"}
          </button>
        </>
      }
    >
      {loading ? (
        <div className="grid animate-pulse grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="rounded-2xl border border-[#E8E8E3] bg-white">
            <div className="h-12 border-b border-[#F0F0EB]" />
            <div className="grid grid-cols-3 gap-3 p-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-32 rounded-xl bg-[#F3F3EF]" />
              ))}
            </div>
          </div>
          <div className="h-[700px] rounded-2xl border border-[#E8E8E3] bg-white" />
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <ThemeCustomizer value={themeConfig} onChange={setThemeConfig} onBackgroundUpload={uploadBackground} isBackgroundUploading={uploadingBg} />

          <section className="overflow-hidden rounded-2xl border border-[#E8E8E3] bg-white xl:sticky xl:top-0">
            <div className="flex items-center justify-between gap-3 border-b border-[#F0F0EB] px-5 py-3.5">
              <div>
                <h2 className="text-[14px] font-semibold text-[#0F1117]">Live preview</h2>
                <p className="mt-0.5 text-[12px] text-[#6B7280]">Your real menu, on a phone.</p>
              </div>
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#E8E8E3] px-2.5 text-[12px] font-semibold text-[#374151] transition-colors hover:border-[#D6D6CF] hover:text-[#0F1117]"
              >
                Open full preview <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
            <div className="flex justify-center bg-[#FAFAF7] py-6">
              <div className="relative w-[300px] rounded-[2.6rem] border-[7px] border-[#0F1117] bg-[#0F1117] shadow-[0_24px_48px_-20px_rgba(15,17,23,0.35)]" style={{ height: 620 }}>
                <div className="relative h-full w-full overflow-hidden rounded-[2.1rem] bg-white">
                  <div className="absolute left-1/2 top-2.5 z-20 h-6 w-20 -translate-x-1/2 rounded-full bg-[#0F1117]" />
                  <div className="absolute left-1/2 top-0" style={{ width: 390, height: 844, transform: `translateX(-50%) scale(${286 / 390})`, transformOrigin: "top center" }}>
                    <iframe title="Menu preview" src={previewUrl} className="h-[844px] w-[390px] border-0 bg-white" />
                  </div>
                  <div className="absolute bottom-2 left-1/2 z-20 h-[5px] w-24 -translate-x-1/2 rounded-full bg-[#0F1117]/25" />
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </SettingsPageLayout>
  );
}
