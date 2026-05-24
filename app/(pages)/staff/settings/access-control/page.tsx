"use client";

import SettingsPageLayout from "@/app/components/settings/SettingsPageLayout";
import { api } from "@/app/lib/api";
import { Loader2, Shield } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

type RoleKey = "manager" | "kitchen" | "waiter" | "cashier";
type FeatureKey =
  | "floor"
  | "menu"
  | "takeaway"
  | "analytics"
  | "insights"
  | "settings"
  | "profile"
  | "floor_plan"
  | "team"
  | "devices"
  | "theme"
  | "reservations"
  | "offers"
  | "delivery"
  | "kitchen_capacity"
  | "audit"
  | "feedback";
type RoleAccess = Record<RoleKey, Record<FeatureKey, boolean>>;

const ROLES: { key: RoleKey; label: string }[] = [
  { key: "manager", label: "Manager" },
  { key: "kitchen", label: "Kitchen/Chef" },
  { key: "waiter", label: "Waiter" },
  { key: "cashier", label: "Cashier" },
];
const FEATURES: { key: FeatureKey; label: string }[] = [
  { key: "floor", label: "Floor & Tables" },
  { key: "menu", label: "Menu & Inventory" },
  { key: "takeaway", label: "Takeaway & Delivery" },
  { key: "analytics", label: "Sales & Reports" },
  { key: "insights", label: "Insights" },
  { key: "settings", label: "Settings" },
  { key: "profile", label: "Restaurant Profile" },
  { key: "floor_plan", label: "Floor Plan" },
  { key: "team", label: "Team Members" },
  { key: "devices", label: "Devices & QR" },
  { key: "theme", label: "Theme Studio" },
  { key: "reservations", label: "Reservations & Waitlist" },
  { key: "offers", label: "Offers & Coupons" },
  { key: "delivery", label: "Delivery Zones" },
  { key: "kitchen_capacity", label: "Kitchen Capacity" },
  { key: "audit", label: "Audit Logs" },
  { key: "feedback", label: "Feedback & Issues" },
];

const defaultRoleAccess = (): RoleAccess => ({
  manager: {
    floor: true,
    menu: true,
    takeaway: true,
    analytics: true,
    insights: true,
    settings: true,
    profile: true,
    floor_plan: true,
    team: true,
    devices: true,
    theme: true,
    reservations: true,
    offers: true,
    delivery: true,
    kitchen_capacity: true,
    audit: true,
    feedback: true,
  },
  kitchen: {
    floor: true,
    menu: false,
    takeaway: false,
    analytics: false,
    insights: false,
    settings: false,
    profile: false,
    floor_plan: false,
    team: false,
    devices: false,
    theme: false,
    reservations: false,
    offers: false,
    delivery: false,
    kitchen_capacity: false,
    audit: false,
    feedback: false,
  },
  waiter: {
    floor: true,
    menu: false,
    takeaway: false,
    analytics: false,
    insights: false,
    settings: false,
    profile: false,
    floor_plan: false,
    team: false,
    devices: false,
    theme: false,
    reservations: true,
    offers: false,
    delivery: false,
    kitchen_capacity: false,
    audit: false,
    feedback: false,
  },
  cashier: {
    floor: true,
    menu: false,
    takeaway: true,
    analytics: true,
    insights: true,
    settings: false,
    profile: false,
    floor_plan: false,
    team: false,
    devices: false,
    theme: false,
    reservations: false,
    offers: false,
    delivery: false,
    kitchen_capacity: false,
    audit: false,
    feedback: false,
  },
});

function normalizeRoleAccess(raw: any): RoleAccess {
  const base = defaultRoleAccess();
  if (!raw || typeof raw !== "object") return base;
  for (const role of ROLES) {
    const roleObj = raw?.[role.key];
    if (!roleObj || typeof roleObj !== "object") continue;
    for (const feature of FEATURES) {
      if (typeof roleObj?.[feature.key] === "boolean")
        base[role.key][feature.key] = roleObj[feature.key];
    }
  }
  return base;
}

export default function AccessControlPage() {
  const [role, setRole] = useState<string>("");
  const [themeConfig, setThemeConfig] = useState<Record<string, any>>({});
  const [roleAccess, setRoleAccess] = useState<RoleAccess>(defaultRoleAccess());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const me = await api<{
          role?: string;
          theme_config?: Record<string, any>;
        }>("/api/admin/me");
        setRole((me?.role || "").toLowerCase());
        const cfg =
          me?.theme_config && typeof me.theme_config === "object"
            ? me.theme_config
            : {};
        setThemeConfig(cfg);
        setRoleAccess(normalizeRoleAccess(cfg?.role_access));
      } catch {
        toast.error("Failed to load access settings");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const hasChanges = useMemo(
    () =>
      JSON.stringify(roleAccess) !==
      JSON.stringify(normalizeRoleAccess(themeConfig?.role_access)),
    [roleAccess, themeConfig],
  );

  const toggle = (r: RoleKey, f: FeatureKey) =>
    setRoleAccess((prev) => ({
      ...prev,
      [r]: { ...prev[r], [f]: !prev[r][f] },
    }));

  const save = async () => {
    setIsSaving(true);
    try {
      const nextThemeConfig = { ...themeConfig, role_access: roleAccess };
      await api("/api/admin/update-details", {
        method: "PATCH",
        body: JSON.stringify({ theme_config: nextThemeConfig }),
      });
      setThemeConfig(nextThemeConfig);
      if (typeof window !== "undefined") {
        try {
          const r = localStorage.getItem("staff_sidebar_me_cache_v1");
          localStorage.setItem(
            "staff_sidebar_me_cache_v1",
            JSON.stringify({
              ...(r ? JSON.parse(r) : {}),
              role_access: roleAccess,
            }),
          );
        } catch {}
        window.dispatchEvent(new Event("qrave:profile-updated"));
      }
      toast.success("Access controls updated");
    } catch {
      toast.error("Failed to save access controls");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading)
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );

  if (role !== "owner") {
    return (
      <SettingsPageLayout
        title="Access Control"
        description="Define which roles can access which pages."
      >
        <div className="rounded-2xl border border-slate-200 bg-white p-6 max-w-md">
          <h2 className="text-lg font-bold text-slate-900">Restricted</h2>
          <p className="mt-2 text-sm text-slate-600">
            Only the restaurant owner can edit role access controls.
          </p>
        </div>
      </SettingsPageLayout>
    );
  }

  return (
    <SettingsPageLayout
      title="Access Control"
      description="Define which roles can access which pages."
      maxWidth="max-w-7xl"
      action={
        <button
          onClick={save}
          disabled={isSaving || !hasChanges}
          className="inline-flex items-center gap-2 rounded-xl bg-[#E8900A] hover:bg-[#D97706] px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-white shadow-md transition-all cursor-pointer disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
          {isSaving ? "Saving..." : "Save Access"}
        </button>
      }
    >
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">Role Permissions Directory</h2>
          <p className="mt-1 text-xs text-slate-500">Configure page access rules across the active role tiers. Changes take effect on the next session.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse text-left">
            <thead>
              <tr className="border-b bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <th className="px-6 py-4">Feature / Dashboard Module</th>
                {ROLES.map((r) => (
                  <th key={r.key} className="px-6 py-4 text-center w-36">
                    {r.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {FEATURES.map((f) => (
                <tr key={f.key} className="hover:bg-slate-50/40 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-800">{f.label}</span>
                      <span className="text-[11px] text-slate-400 mt-0.5">
                        Permission tier for the staff dashboard module.
                      </span>
                    </div>
                  </td>
                  {ROLES.map((r) => (
                    <td key={r.key} className="px-6 py-4 text-center">
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={() => toggle(r.key, f.key)}
                          className={`h-6 w-12 rounded-full transition-all relative cursor-pointer shadow-sm ${
                            roleAccess[r.key][f.key]
                              ? "bg-emerald-500 hover:bg-emerald-600"
                              : "bg-slate-300 hover:bg-slate-400"
                          }`}
                          aria-label={`${r.label} ${f.label}`}
                        >
                          <span
                            className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                              roleAccess[r.key][f.key] ? "translate-x-6" : "translate-x-0.5"
                            }`}
                          />
                        </button>
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SettingsPageLayout>
  );
}
