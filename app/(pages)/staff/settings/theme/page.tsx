"use client";

import React, { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import SettingsPageLayout from "@/app/components/settings/SettingsPageLayout";
import ThemeCustomizer from "@/app/components/settings/ThemeCustomizer";
import type { ThemeConfig } from "@/app/components/settings/types";
import { api } from "@/app/lib/api";
import toast from "react-hot-toast";

export default function ThemeSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [restaurantName, setRestaurantName] = useState("Your Restaurant");
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>({});

  useEffect(() => {
    (async () => {
      try {
        const me = await api<{ restaurant?: string; theme_config?: ThemeConfig }>("/api/admin/me", { method: "GET" });
        setRestaurantName(me.restaurant || "Your Restaurant");
        setThemeConfig(me.theme_config || {});
      } catch { toast.error("Failed to load theme settings"); } finally { setLoading(false); }
    })();
  }, []);

  const saveTheme = async () => {
    setSaving(true);
    try { await api("/api/admin/update-details", { method: "PATCH", body: JSON.stringify({ theme_config: themeConfig }) }); toast.success("Theme saved"); }
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

  if (loading) return <div className="flex h-screen w-full items-center justify-center bg-white"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;

  return (
    <SettingsPageLayout
      title="Theme Studio"
      description="Customise your menu's look and feel. Updates preview instantly."
      maxWidth="max-w-[1700px]"
      action={
        <button onClick={saveTheme} disabled={saving} className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save Theme</>}
        </button>
      }
    >
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-7">
          <ThemeCustomizer value={themeConfig} onChange={setThemeConfig} onBackgroundUpload={uploadBackground} isBackgroundUploading={uploadingBg} />
        </div>
        <div className="xl:col-span-5">
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-6">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h2 className="font-bold text-slate-900">Live Menu Preview</h2>
              <p className="text-[11px] text-slate-500 mt-1">Real menu UI in phone frame. Updates instantly.</p>
            </div>
            <div className="flex justify-center py-6">
              <div className="relative mx-auto w-[300px]">
                <div className="absolute -left-[6px] top-[88px] h-8 w-[5px] rounded-l-md bg-slate-700" />
                <div className="absolute -left-[6px] top-[132px] h-10 w-[5px] rounded-l-md bg-slate-700" />
                <div className="absolute -left-[6px] top-[180px] h-10 w-[5px] rounded-l-md bg-slate-700" />
                <div className="absolute -right-[6px] top-[120px] h-14 w-[5px] rounded-r-md bg-slate-700" />
                <div className="relative rounded-[2.8rem] border-[6px] border-slate-800 bg-slate-800 shadow-[0_40px_80px_-16px_rgba(0,0,0,0.45)]" style={{ height: 636 }}>
                  <div className="relative h-full w-full overflow-hidden rounded-[2.2rem] bg-white">
                    <div className="absolute top-3 left-1/2 z-20 h-7 w-24 -translate-x-1/2 rounded-full bg-slate-900" />
                    <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 pt-2 pb-1">
                      <span className="text-[10px] font-semibold text-slate-900" style={{ paddingTop: 2 }}>9:41</span>
                    </div>
                    <div className="absolute left-1/2 top-0" style={{ width: 390, height: 844, transform: `translateX(-50%) scale(${288 / 390})`, transformOrigin: "top center" }}>
                      <iframe title="Menu preview" src={`/preview/menu?name=${encodeURIComponent(restaurantName)}&theme=${encodeURIComponent(JSON.stringify(themeConfig || {}))}`} className="w-[390px] h-[844px] border-0 bg-white" />
                    </div>
                    <div className="absolute bottom-2 left-1/2 z-20 h-[5px] w-28 -translate-x-1/2 rounded-full bg-slate-900/30" />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </SettingsPageLayout>
  );
}
