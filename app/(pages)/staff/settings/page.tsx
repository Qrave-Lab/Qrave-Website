"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CreditCard,
  Globe,
  Loader2,
  Palette,
  PlusCircle,
  Printer,
  Receipt,
  Save,
  Users,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import StaffSidebar from "../../../components/StaffSidebar";
import RestaurantProfile from "@/app/components/settings/RestaurantProfile";
import { api } from "@/app/lib/api";
import type { Restaurant } from "@/app/components/settings/types";

type AdminMeResponse = {
  role?: string;
  restaurant?: string;
  address?: string;
  phone?: string;
  currency?: string;
  tax_percent?: number;
  service_charge?: number;
  ordering_enabled?: boolean;
  logo_url?: string;
  logo_version?: number;
  open_time?: string;
  close_time?: string;
  theme_config?: Restaurant["themeConfig"];
};

type LocationOption = {
  restaurant_id: string;
  restaurant: string;
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
    if (digits.startsWith(cc)) {
      return { countryCode: code, phone: digits.slice(cc.length) };
    }
  }
  return { countryCode: "+91", phone: digits };
}

function validateRestaurantName(name: string) {
  const v = name.trim();
  return v.length >= 2 && v.length <= 120 && !/[\x00-\x1F\x7F]/.test(v);
}

function validateAddress(address: string) {
  const v = address.trim();
  return v.length <= 240 && !/[\x00-\x1F\x7F]/.test(v);
}

function validatePhone(countryCode: string, phone: string) {
  const v = phone.trim();
  if (!v) return true;
  if (!/^\+[1-9][0-9]{0,3}$/.test(countryCode)) return false;
  const digits = v.replace(/\D/g, "");
  const rule = PHONE_RULES[countryCode];
  if (rule) {
    return digits.length >= rule.min && digits.length <= rule.max && rule.pattern.test(digits);
  }
  if (digits.length < 6 || digits.length > 14) return false;
  const total = countryCode.replace("+", "").length + digits.length;
  return total >= 8 && total <= 15;
}

type NavCard = {
  title: string;
  subtitle: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  show?: boolean;
};

function SettingsNavCard({ title, subtitle, href, icon: Icon }: NavCard) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-xl bg-slate-100 p-2 text-slate-700">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">{title}</p>
            <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-700" />
      </div>
    </Link>
  );
}

export default function SettingsPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [role, setRole] = useState<string>("");
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [activeRestaurantId, setActiveRestaurantId] = useState<string>("");
  const [isSwitchingLocation, setIsSwitchingLocation] = useState(false);
  const [restaurant, setRestaurant] = useState<Restaurant>({
    name: "",
    address: "",
    currency: "INR",
    taxPercent: 5,
    serviceCharge: 10,
    phone: "",
    phoneCountryCode: "+91",
    logo_url: "",
    orderingEnabled: true,
    openTime: "",
    closeTime: "",
    themeConfig: {},
  });
  const [initialRestaurant, setInitialRestaurant] = useState<Restaurant | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await api<{ active_restaurant_id?: string; locations?: LocationOption[] }>("/api/admin/locations", { method: "GET" });
        setLocations(res?.locations || []);
        setActiveRestaurantId(res?.active_restaurant_id || "");
      } catch {
        // ignore
      }
    })();
  }, []);

  const fetchData = async () => {
    try {
      const adminData = await api<AdminMeResponse>("/api/admin/me", { method: "GET" });
      const nextRole = String(adminData.role || "").toLowerCase();
      const roleAccess = (adminData.theme_config as any)?.role_access as Record<string, Record<string, boolean>> | undefined;
      if (nextRole && nextRole !== "owner") {
        const allowed = roleAccess?.[nextRole]?.settings;
        if (allowed === false && typeof window !== "undefined") {
          toast.error("Settings access disabled for your role");
          window.location.href = "/staff";
          return;
        }
      }
      const logoVersionSuffix = adminData.logo_version ? `?v=${adminData.logo_version}` : "";
      const parsedPhone = splitE164Phone(adminData.phone);
      const restObj: Restaurant = {
        name: adminData.restaurant || "",
        address: adminData.address || "",
        phone: parsedPhone.phone,
        phoneCountryCode: parsedPhone.countryCode,
        currency: adminData.currency || "INR",
        taxPercent: adminData.tax_percent || 0,
        serviceCharge: adminData.service_charge || 0,
        orderingEnabled: adminData.ordering_enabled !== false,
        logo_url: adminData.logo_url ? `${adminData.logo_url}${logoVersionSuffix}` : "",
        openTime: adminData.open_time || "",
        closeTime: adminData.close_time || "",
        themeConfig: adminData.theme_config || {},
      };
      setRestaurant(restObj);
      setRole(adminData.role || "");
      setInitialRestaurant(restObj);
    } catch {
      toast.error("Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  };

  const isDirty = useMemo(() => {
    if (!initialRestaurant) return false;
    return JSON.stringify(restaurant) !== JSON.stringify(initialRestaurant);
  }, [restaurant, initialRestaurant]);

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const contentType = file.type || "image/png";
      const ct = encodeURIComponent(contentType);
      const { upload_url, public_url } = await api<{ upload_url: string; public_url: string }>(`/api/admin/logo-pic/upload-url?content_type=${ct}`, {
        method: "POST",
      });
      const uploadRes = await fetch(upload_url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": contentType },
      });
      if (!uploadRes.ok) throw new Error();
      await api("/api/admin/logo-pic/commit", {
        method: "POST",
        body: JSON.stringify({ logo_url: public_url }),
      });
      const nextLogo = `${public_url}?v=${Date.now()}`;
      setRestaurant((prev) => ({ ...prev, logo_url: nextLogo }));
      if (typeof window !== "undefined") {
        try {
          const cachedRaw = localStorage.getItem("staff_sidebar_me_cache_v1");
          const cached = cachedRaw ? JSON.parse(cachedRaw) : {};
          localStorage.setItem(
            "staff_sidebar_me_cache_v1",
            JSON.stringify({
              ...cached,
              restaurant: restaurant.name,
              logo_url: nextLogo,
            })
          );
        } catch {
          // ignore cache write error
        }
        window.dispatchEvent(new Event("qrave:profile-updated"));
      }
      toast.success("Logo uploaded");
    } catch {
      toast.error("Logo upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!validateRestaurantName(restaurant.name)) {
      toast.error("Enter a valid restaurant name");
      return;
    }
    if (!validateAddress(restaurant.address)) {
      toast.error("Address is invalid");
      return;
    }
    if (!validatePhone(restaurant.phoneCountryCode, restaurant.phone)) {
      toast.error("Phone number is invalid");
      return;
    }
    setIsSaving(true);
    try {
      await api("/api/admin/update-details", {
        method: "PATCH",
        body: JSON.stringify({
          name: restaurant.name,
          address: restaurant.address,
          phone: restaurant.phone,
          phone_country_code: restaurant.phoneCountryCode,
          tax_percent: restaurant.taxPercent,
          service_charge: restaurant.serviceCharge,
          ordering_enabled: restaurant.orderingEnabled !== false,
          open_time: restaurant.openTime || "",
          close_time: restaurant.closeTime || "",
        }),
      });
      await fetchData();
      toast.success("Settings updated successfully");
    } catch {
      toast.error("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const switchLocationFromSettings = async (nextRestaurantId: string) => {
    if (!nextRestaurantId || nextRestaurantId === activeRestaurantId || isSwitchingLocation) return;
    setIsSwitchingLocation(true);
    try {
      await api("/api/admin/locations/switch", {
        method: "POST",
        body: JSON.stringify({ restaurant_id: nextRestaurantId }),
      });
      if (typeof window !== "undefined") {
        window.location.href = "/staff";
      }
    } catch {
      toast.error("Failed to switch branch");
      setIsSwitchingLocation(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const cards: NavCard[] = [
    { title: "Floor Plan", subtitle: "Manage tables, floors, and counters", href: "/staff/settings/floor-plan", icon: Receipt },
    { title: "Team Members", subtitle: "Add, edit, and remove staff access", href: "/staff/settings/team", icon: Users },
    { title: "Devices & QR", subtitle: "POS printers and table QR tools", href: "/staff/settings/devices", icon: Printer },
    { title: "Theme Studio", subtitle: "Customize customer menu visuals", href: "/staff/settings/theme", icon: Palette },
    { title: "Add New Branch", subtitle: "Create another branch/location", href: "/staff/settings/branches/add", icon: PlusCircle, show: role === "owner" },
    { title: "Role Access Control", subtitle: "Set feature access per staff role", href: "/staff/settings/access-control", icon: Users, show: role === "owner" },
    { title: "Subscription", subtitle: "Manage plan and billing status", href: "/staff/settings/subscription", icon: CreditCard, show: role === "owner" },
    { title: "Delete Account", subtitle: "Permanent account deletion", href: "/staff/settings/delete-account", icon: AlertTriangle, show: role === "owner" },
  ];

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] text-slate-900 overflow-hidden font-sans">
      <StaffSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0 z-10">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Settings</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Globe className="w-3 h-3 text-slate-400" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Global Configuration • {restaurant.currency}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {locations.length > 1 && (
              <select
                value={activeRestaurantId}
                disabled={isSwitchingLocation}
                onChange={(e) => switchLocationFromSettings(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-60"
              >
                {locations.map((loc) => (
                  <option key={loc.restaurant_id} value={loc.restaurant_id}>
                    {loc.restaurant}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving || !isDirty}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 text-white disabled:text-slate-400 px-8 py-2.5 rounded-lg text-sm font-bold transition-all active:scale-95 shadow-sm"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save Changes</>}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 scroll-smooth">
          <div className="mx-auto max-w-[1400px] space-y-6 pb-10">
            <RestaurantProfile
              data={restaurant}
              onChange={setRestaurant}
              onLogoChange={handleLogoChange}
              isUploading={isUploading}
            />

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3">
                <h2 className="text-sm font-bold text-slate-900">More Settings</h2>
                <p className="text-xs text-slate-500">Open a section to manage it in its own page.</p>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {cards
                  .filter((card) => card.show !== false)
                  .map((card) => (
                    <SettingsNavCard key={card.title} {...card} />
                  ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
