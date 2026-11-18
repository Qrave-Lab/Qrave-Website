"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import SettingsPageLayout from "@/app/components/settings/SettingsPageLayout";
import RestaurantProfile from "@/app/components/settings/RestaurantProfile";
import { api } from "@/app/lib/api";
import type { Restaurant } from "@/app/components/settings/types";

type AdminMeResponse = {
  role?: string; restaurant?: string; address?: string; phone?: string; website?: string; store_slug?: string;
  currency?: string; tax_percent?: number; service_charge?: number; ordering_enabled?: boolean;
  logo_url?: string; logo_version?: number; open_time?: string; close_time?: string;
  theme_config?: Restaurant["themeConfig"];
  gst_number?: string;
  tax_config?: Restaurant["taxConfig"];
  reservation_deposit_required?: boolean;
  reservation_deposit_amount?: number;
  google_review_url?: string | null;
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
    <div className="grid animate-pulse grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        {[2, 3, 2].map((rows, i) => (
          <div key={i} className="rounded-2xl border border-[#E8E8E3] bg-white">
            <div className="border-b border-[#F0F0EB] px-6 py-4">
              <div className="h-3.5 w-32 rounded bg-[#E8E8E3]" />
              <div className="mt-2 h-3 w-56 rounded bg-[#F3F3EF]" />
            </div>
            <div className="space-y-4 px-6 py-5">
              {Array.from({ length: rows }).map((_, r) => (
                <div key={r} className="h-10 rounded-xl bg-[#F3F3EF]" />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="h-72 rounded-2xl border border-[#E8E8E3] bg-white" />
    </div>
  );
}

export default function RestaurantProfilePage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemovingLogo, setIsRemovingLogo] = useState(false);
  const [restaurant, setRestaurant] = useState<Restaurant>({ name: "", address: "", currency: "INR", taxPercent: 5, serviceCharge: 10, phone: "", phoneCountryCode: "+91", website: "", logo_url: "", orderingEnabled: true, openTime: "", closeTime: "", themeConfig: {}, gstNumber: "", taxConfig: {}, reservationDepositRequired: false, reservationDepositAmount: 0 });
  const [initialRestaurant, setInitialRestaurant] = useState<Restaurant | null>(null);

  const fetchData = async () => {
    try {
      const adminData = await api<AdminMeResponse>("/api/admin/me", { method: "GET" });
      const nextRole = String((adminData as any)?.role || "").toLowerCase();
      const roleAccess = ((adminData as any)?.theme_config as any)?.role_access as Record<string, Record<string, boolean>> | undefined;
      if (nextRole && nextRole !== "owner") { const allowed = roleAccess?.[nextRole]?.settings; if (allowed === false) { toast.error("Settings access disabled for your role"); router.replace("/staff"); return; } }
      const logoVersionSuffix = adminData.logo_version ? `?v=${adminData.logo_version}` : "";
      const parsedPhone = splitE164Phone(adminData.phone);
      const restObj: Restaurant = { name: adminData.restaurant || "", address: adminData.address || "", phone: parsedPhone.phone, phoneCountryCode: parsedPhone.countryCode, website: adminData.website || "", storeSlug: adminData.store_slug || "", currency: adminData.currency || "INR", taxPercent: adminData.tax_percent || 0, serviceCharge: adminData.service_charge || 0, orderingEnabled: adminData.ordering_enabled !== false, logo_url: adminData.logo_url ? `${adminData.logo_url}${logoVersionSuffix}` : "", openTime: adminData.open_time || "", closeTime: adminData.close_time || "", themeConfig: adminData.theme_config || {}, gstNumber: adminData.gst_number || "", taxConfig: adminData.tax_config || {}, reservationDepositRequired: adminData.reservation_deposit_required || false, reservationDepositAmount: adminData.reservation_deposit_amount || 0, googleReviewUrl: adminData.google_review_url || "" };
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
      await api("/api/admin/update-details", { method: "PATCH", body: JSON.stringify({ name: restaurant.name, address: restaurant.address, phone: restaurant.phone, phone_country_code: restaurant.phoneCountryCode, website: restaurant.website || "", store_slug: restaurant.storeSlug || "", tax_percent: restaurant.taxPercent, service_charge: restaurant.serviceCharge, ordering_enabled: restaurant.orderingEnabled !== false, open_time: restaurant.openTime || "", close_time: restaurant.closeTime || "", gst_number: restaurant.gstNumber || "", tax_config: restaurant.taxConfig && Object.keys(restaurant.taxConfig).length > 0 ? restaurant.taxConfig : null, reservation_deposit_required: restaurant.reservationDepositRequired || false, reservation_deposit_amount: restaurant.reservationDepositAmount || 0, google_review_url: (restaurant.googleReviewUrl || "").trim() }) });
      await fetchData(); toast.success("Profile saved");
    } catch (err: any) { toast.error(err.message || "Failed to save changes"); } finally { setIsSaving(false); }
  };

  return (
    <SettingsPageLayout
      title="Restaurant profile"
      description="Name, contact details, hours, tax and deposits"
      maxWidth="max-w-6xl"
      action={
        <>
          {isDirty && !isSaving && (
            <span className="hidden items-center gap-1.5 text-[13px] text-[#6B7280] sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Unsaved changes
            </span>
          )}
          {isDirty && !isSaving && initialRestaurant && (
            <button
              type="button"
              onClick={() => setRestaurant(initialRestaurant)}
              className="inline-flex h-10 items-center rounded-xl border border-[#E8E8E3] bg-white px-3.5 text-[13px] font-semibold text-[#374151] transition-colors hover:border-[#D6D6CF] hover:text-[#0F1117]"
            >
              Discard
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={isLoading || isSaving || !isDirty}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#fe5c13] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#e44e0b] disabled:cursor-not-allowed disabled:bg-[#F3F3EF] disabled:text-[#9CA3AF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fe5c13]/40 focus-visible:ring-offset-2"
          >
            {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving</> : isDirty ? "Save changes" : "Saved"}
          </button>
        </>
      }
    >
      {isLoading ? <RestaurantProfileSkeleton /> : (
        <RestaurantProfile data={restaurant} onChange={setRestaurant} onLogoChange={handleLogoChange} onLogoRemove={handleLogoRemove} isUploading={isUploading} isRemovingLogo={isRemovingLogo} />
      )}
    </SettingsPageLayout>
  );
}
