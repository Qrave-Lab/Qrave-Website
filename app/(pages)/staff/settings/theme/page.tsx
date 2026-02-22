"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import StaffSidebar from "@/app/components/StaffSidebar";
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
    const load = async () => {
      try {
        const me = await api<{ restaurant?: string; theme_config?: ThemeConfig }>("/api/admin/me", { method: "GET" });
        setRestaurantName(me.restaurant || "Your Restaurant");
        setThemeConfig(me.theme_config || {});
      } catch {
        toast.error("Failed to load theme settings");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const saveTheme = async () => {
    setSaving(true);
    try {
      await api("/api/admin/update-details", {
        method: "PATCH",
        body: JSON.stringify({ theme_config: themeConfig }),
      });
      toast.success("Theme saved");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save theme";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const uploadBackground = async (file: File): Promise<string> => {
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return "";
    }
    setUploadingBg(true);
    try {
      const ct = encodeURIComponent(file.type || "image/png");
      const { upload_url, public_url } = await api<{ upload_url: string; public_url: string }>(
        `/api/admin/theme/background/upload-url?content_type=${ct}`,
        { method: "POST" }
      );
      const putRes = await fetch(upload_url, {
        method: "PUT",
        headers: { "Content-Type": file.type || "image/png" },
        body: file,
      });
      if (!putRes.ok) throw new Error("Upload failed");
      toast.success("Background uploaded");
      return public_url;
    } catch {
      toast.error("Background upload failed");
      return "";
    } finally {
      setUploadingBg(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 overflow-hidden font-sans">
      <StaffSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-4">
            <Link href="/staff/settings" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Theme Studio</h1>
              <p className="text-[11px] text-slate-500 mt-1">Clean controls with live preview.</p>
            </div>
          </div>
          <button
            onClick={saveTheme}
            disabled={saving}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save Theme</>}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 max-w-[1700px] mx-auto pb-8">
            <div className="xl:col-span-7">
              <ThemeCustomizer
                value={themeConfig}
                onChange={setThemeConfig}
                onBackgroundUpload={uploadBackground}
                isBackgroundUploading={uploadingBg}
              />
            </div>
            <div className="xl:col-span-5">
              <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-6">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                  <h2 className="font-bold text-slate-900">Live Menu Preview</h2>
                  <p className="text-[11px] text-slate-500 mt-1">Real menu UI in phone frame. Updates instantly.</p>
                </div>
                <div className="p-4">
                  <div className="mx-auto w-[300px]">
                    <div className="relative bg-white rounded-[3rem] p-4 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.16)] border-[8px] border-slate-900 h-[600px] overflow-hidden">
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-2xl z-20" />
                      <div className="relative z-10 w-full h-full rounded-[2rem] overflow-hidden bg-white">
                        <div
                          className="absolute left-1/2 top-0"
                          style={{
                            width: 390,
                            height: 844,
                            transform: "translateX(-50%) scale(0.68)",
                            transformOrigin: "top center",
                          }}
                        >
                          <iframe
                            title="Menu preview"
                            src={`/preview/menu?name=${encodeURIComponent(restaurantName)}&theme=${encodeURIComponent(JSON.stringify(themeConfig || {}))}`}
                            className="w-[390px] h-[844px] border-0 bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
