"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Globe, Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import SettingsPageLayout from "@/app/components/settings/SettingsPageLayout";
import RestaurantProfile from "@/app/components/settings/RestaurantProfile";
import { api } from "@/app/lib/api";
import type { Restaurant } from "@/app/components/settings/types";

type AdminMeResponse = {
  role?: string; restaurant?: string; address?: string; phone?: string; website?: string;
  currency?: string; tax_percent?: number; service_charge?: number; ordering_enabled?: boolean;
  logo_url?: string; logo_version?: number; open_time?: string; close_time?: string;
  theme_config?: Restaurant["themeConfig"];
  gst_number?: string;
  tax_config?: Restaurant["taxConfig"];
};

const PHONE_COUNTRY_CODES = ["+91", "+1", "+44", "+61", "+65", "+971"];
const PHONE_RULES: Record<string, { min: number; max: number; pattern: RegExp }> = {
  "+91": { min: 10, max: 10, pattern: /^[2-9][0-9]{9}$/ },
  "+1": { min: 10, max: 10, pattern: /^[2-9][0-9]{2}[2-9][0-9]{6}$/ },
  "+44": { min: 10, max: 10, pattern: /^7[0-9]{9}$/ },
  "+61": { min: 9, max: 9, pattern: /^4[0-9]{8}$/ },
  "+65": { min: 8, max: 8, pattern: /^[689][0-9]{7}$/ },
  "+971": { min: 9, max: 9, pattern: /^5[0-9]{8}$/ },
};

function splitE164Phone(value?: string): { countryCode: string; phone: string } {
  const raw = String(value || "").trim();
  if (!raw.startsWith("+")) return { countryCode: "+91", phone: raw };
  const digits = raw.slice(1).replace(/\D/g, "");
  if (!digits) return { countryCode: "+91", phone: "" };
  for (const code of PHONE_COUNTRY_CODES.sort((a, b) => b.length - a.length)) {
    const cc = code.slice(1);
    if (digits.startsWith(cc)) return { countryCode: code, phone: digits.slice(cc.length) };
  }
  return { countryCode: "+91", phone: digits };
}

function validateRestaurantName(name: string) { const v = name.trim(); return v.length >= 2 && v.length <= 120 && !/[\x00-\x1F\x7F]/.test(v); }
function validateAddress(address: string) { const v = address.trim(); return v.length <= 240 && !/[\x00-\x1F\x7F]/.test(v); }
function validatePhone(countryCode: string, phone: string) {
  const v = phone.trim(); if (!v) return true;
  if (!/^\+[1-9][0-9]{0,3}$/.test(countryCode)) return false;
  const digits = v.replace(/\D/g, "");
  const rule = PHONE_RULES[countryCode];
  if (rule) return digits.length >= rule.min && digits.length <= rule.max && rule.pattern.test(digits);
  if (digits.length < 6 || digits.length > 14) return false;
  const total = countryCode.replace("+", "").length + digits.length;
  return total >= 8 && total <= 15;
}

function RestaurantProfileSkeleton() {
  return (
    <div className="mx-auto max-w-[1100px] space-y-6 pb-10 animate-pulse">
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50"><div className="h-5 w-44 rounded bg-slate-200" /></div>
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-6"><div className="h-24 w-24 rounded-2xl bg-slate-100 border border-slate-200" /><div className="flex-1 space-y-2"><div className="h-3 w-28 rounded bg-slate-100" /><div className="h-10 w-full rounded-xl bg-slate-100" /></div></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5"><div className="md:col-span-2 h-10 rounded-xl bg-slate-100" /><div className="md:col-span-2 h-10 rounded-xl bg-slate-100" /><div className="h-10 rounded-xl bg-slate-100" /><div className="h-10 rounded-xl bg-slate-100" /></div>
        </div>
      </section>
    </div>
  );
}

export default function RestaurantProfilePage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemovingLogo, setIsRemovingLogo] = useState(false);
  const [restaurant, setRestaurant] = useState<Restaurant>({ name: "", address: "", currency: "INR", taxPercent: 5, serviceCharge: 10, phone: "", phoneCountryCode: "+91", website: "", logo_url: "", orderingEnabled: true, openTime: "", closeTime: "", themeConfig: {}, gstNumber: "", taxConfig: {} });
  const [initialRestaurant, setInitialRestaurant] = useState<Restaurant | null>(null);

  const fetchData = async () => {
    try {
      const adminData = await api<AdminMeResponse>("/api/admin/me", { method: "GET" });
      const nextRole = String((adminData as any)?.role || "").toLowerCase();
      const roleAccess = ((adminData as any)?.theme_config as any)?.role_access as Record<string, Record<string, boolean>> | undefined;
      if (nextRole && nextRole !== "owner") { const allowed = roleAccess?.[nextRole]?.settings; if (allowed === false) { toast.error("Settings access disabled for your role"); router.replace("/staff"); return; } }
      const logoVersionSuffix = adminData.logo_version ? `?v=${adminData.logo_version}` : "";
      const parsedPhone = splitE164Phone(adminData.phone);
      const restObj: Restaurant = { name: adminData.restaurant || "", address: adminData.address || "", phone: parsedPhone.phone, phoneCountryCode: parsedPhone.countryCode, website: adminData.website || "", currency: adminData.currency || "INR", taxPercent: adminData.tax_percent || 0, serviceCharge: adminData.service_charge || 0, orderingEnabled: adminData.ordering_enabled !== false, logo_url: adminData.logo_url ? `${adminData.logo_url}${logoVersionSuffix}` : "", openTime: adminData.open_time || "", closeTime: adminData.close_time || "", themeConfig: adminData.theme_config || {}, gstNumber: adminData.gst_number || "", taxConfig: adminData.tax_config || {} };
      setRestaurant(restObj); setInitialRestaurant(restObj);
    } catch { toast.error("Failed to load restaurant profile"); } finally { setIsLoading(false); }
  };
  useEffect(() => { fetchData(); }, [router]);

  const isDirty = useMemo(() => { if (!initialRestaurant) return false; return JSON.stringify(restaurant) !== JSON.stringify(initialRestaurant); }, [restaurant, initialRestaurant]);

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setIsUploading(true);
    try {
      const contentType = file.type || "image/png"; const ct = encodeURIComponent(contentType);
      const { upload_url, public_url } = await api<{ upload_url: string; public_url: string }>(`/api/admin/logo-pic/upload-url?content_type=${ct}`, { method: "POST" });
      const uploadRes = await fetch(upload_url, { method: "PUT", body: file, headers: { "Content-Type": contentType } });
      if (!uploadRes.ok) throw new Error();
      await api("/api/admin/logo-pic/commit", { method: "POST", body: JSON.stringify({ logo_url: public_url }) });
      const nextLogo = `${public_url}?v=${Date.now()}`;
      setRestaurant((prev) => ({ ...prev, logo_url: nextLogo }));
      if (typeof window !== "undefined") { try { const cr = localStorage.getItem("staff_sidebar_me_cache_v1"); localStorage.setItem("staff_sidebar_me_cache_v1", JSON.stringify({ ...(cr ? JSON.parse(cr) : {}), restaurant: restaurant.name, logo_url: nextLogo })); } catch { } window.dispatchEvent(new Event("qrave:profile-updated")); }
      toast.success("Logo uploaded");
    } catch { toast.error("Logo upload failed"); } finally { setIsUploading(false); if (e.currentTarget) e.currentTarget.value = ""; }
  };

  const handleLogoRemove = async () => {
    setIsRemovingLogo(true);
    try { await api("/api/admin/logo-pic", { method: "DELETE" }); setRestaurant((prev) => ({ ...prev, logo_url: "" })); if (typeof window !== "undefined") { try { const cr = localStorage.getItem("staff_sidebar_me_cache_v1"); localStorage.setItem("staff_sidebar_me_cache_v1", JSON.stringify({ ...(cr ? JSON.parse(cr) : {}), logo_url: "" })); } catch { } window.dispatchEvent(new Event("qrave:profile-updated")); } toast.success("Logo removed"); }
    catch { toast.error("Failed to remove logo"); } finally { setIsRemovingLogo(false); }
  };

  const handleSave = async () => {
    if (!validateRestaurantName(restaurant.name)) { toast.error("Enter a valid restaurant name"); return; }
    if (!validateAddress(restaurant.address)) { toast.error("Address is invalid"); return; }
    if (!validatePhone(restaurant.phoneCountryCode, restaurant.phone)) { toast.error("Phone number is invalid"); return; }
    setIsSaving(true);
    try {
      await api("/api/admin/update-details", { method: "PATCH", body: JSON.stringify({ name: restaurant.name, address: restaurant.address, phone: restaurant.phone, phone_country_code: restaurant.phoneCountryCode, website: restaurant.website || "", tax_percent: restaurant.taxPercent, service_charge: restaurant.serviceCharge, ordering_enabled: restaurant.orderingEnabled !== false, open_time: restaurant.openTime || "", close_time: restaurant.closeTime || "", gst_number: restaurant.gstNumber || "", tax_config: restaurant.taxConfig && Object.keys(restaurant.taxConfig).length > 0 ? restaurant.taxConfig : null }) });
      await fetchData(); toast.success("Profile updated successfully");
    } catch { toast.error("Failed to save changes"); } finally { setIsSaving(false); }
  };

  return (
    <SettingsPageLayout
      title="Restaurant Profile"
      description={<span className="flex items-center gap-1.5"><Globe className="w-3 h-3" /> Brand Profile{!isLoading ? ` • ${restaurant.currency}` : ""}</span>}
      maxWidth="max-w-[1100px]"
      action={
        <button onClick={handleSave} disabled={isLoading || isSaving || !isDirty} className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 text-white disabled:text-slate-400 px-8 py-2.5 rounded-lg text-sm font-bold transition-all shadow-sm">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save Changes</>}
        </button>
      }
    >
      {isLoading ? <RestaurantProfileSkeleton /> : (
        <RestaurantProfile data={restaurant} onChange={setRestaurant} onLogoChange={handleLogoChange} onLogoRemove={handleLogoRemove} isUploading={isUploading} isRemovingLogo={isRemovingLogo} />
      )}
    </SettingsPageLayout>
  );
}
