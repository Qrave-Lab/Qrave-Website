"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Loader2, Shield } from "lucide-react";
import toast from "react-hot-toast";
import SettingsPageLayout from "@/app/components/settings/SettingsPageLayout";
import { api } from "@/app/lib/api";

type RoleKey = "manager" | "kitchen" | "waiter" | "cashier";
type FeatureKey = "floor" | "menu" | "analytics" | "settings";
type RoleAccess = Record<RoleKey, Record<FeatureKey, boolean>>;

const ROLES: { key: RoleKey; label: string }[] = [
  { key: "manager", label: "Manager" }, { key: "kitchen", label: "Kitchen/Chef" },
  { key: "waiter", label: "Waiter" }, { key: "cashier", label: "Cashier" },
];
const FEATURES: { key: FeatureKey; label: string }[] = [
  { key: "floor", label: "Floor & Tables" }, { key: "menu", label: "Menu & Inventory" },
  { key: "analytics", label: "Sales & Reports" }, { key: "settings", label: "Settings" },
];

const defaultRoleAccess = (): RoleAccess => ({
  manager: { floor: true, menu: true, analytics: true, settings: true },
  kitchen: { floor: true, menu: false, analytics: false, settings: false },
  waiter: { floor: true, menu: false, analytics: false, settings: false },
  cashier: { floor: true, menu: false, analytics: true, settings: false },
});

function normalizeRoleAccess(raw: any): RoleAccess {
  const base = defaultRoleAccess();
  if (!raw || typeof raw !== "object") return base;
  for (const role of ROLES) {
    const roleObj = raw?.[role.key];
    if (!roleObj || typeof roleObj !== "object") continue;
    for (const feature of FEATURES) {
      if (typeof roleObj?.[feature.key] === "boolean") base[role.key][feature.key] = roleObj[feature.key];
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
        const me = await api<{ role?: string; theme_config?: Record<string, any> }>("/api/admin/me");
        setRole((me?.role || "").toLowerCase());
        const cfg = (me?.theme_config && typeof me.theme_config === "object") ? me.theme_config : {};
        setThemeConfig(cfg); setRoleAccess(normalizeRoleAccess(cfg?.role_access));
      } catch { toast.error("Failed to load access settings"); } finally { setIsLoading(false); }
    })();
  }, []);

  const hasChanges = useMemo(() => JSON.stringify(roleAccess) !== JSON.stringify(normalizeRoleAccess(themeConfig?.role_access)), [roleAccess, themeConfig]);

  const toggle = (r: RoleKey, f: FeatureKey) => setRoleAccess((prev) => ({ ...prev, [r]: { ...prev[r], [f]: !prev[r][f] } }));

  const save = async () => {
    setIsSaving(true);
    try {
      const nextThemeConfig = { ...themeConfig, role_access: roleAccess };
      await api("/api/admin/update-details", { method: "PATCH", body: JSON.stringify({ theme_config: nextThemeConfig }) });
      setThemeConfig(nextThemeConfig);
      if (typeof window !== "undefined") {
        try { const r = localStorage.getItem("staff_sidebar_me_cache_v1"); localStorage.setItem("staff_sidebar_me_cache_v1", JSON.stringify({ ...(r ? JSON.parse(r) : {}), role_access: roleAccess })); } catch { }
        window.dispatchEvent(new Event("qrave:profile-updated"));
      }
      toast.success("Access controls updated");
    } catch { toast.error("Failed to save access controls"); } finally { setIsSaving(false); }
  };

  if (isLoading) return <div className="flex h-screen w-full items-center justify-center bg-white"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;

  if (role !== "owner") {
    return (
      <SettingsPageLayout title="Access Control" description="Define which roles can access which pages.">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 max-w-md">
          <h2 className="text-lg font-bold text-slate-900">Restricted</h2>
          <p className="mt-2 text-sm text-slate-600">Only the restaurant owner can edit role access controls.</p>
        </div>
      </SettingsPageLayout>
    );
  }

  return (
    <SettingsPageLayout
      title="Access Control"
      description="Define which roles can access which pages."
      maxWidth="max-w-4xl"
      action={
        <button onClick={save} disabled={isSaving || !hasChanges} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
          {isSaving ? "Saving..." : "Save Access"}
        </button>
      }
    >
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="p-5">
          <div className="grid grid-cols-6 gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
            <div className="col-span-2">Role</div>
            {FEATURES.map((f) => <div key={f.key} className="col-span-1 text-center">{f.label}</div>)}
          </div>
          <div className="space-y-2">
            {ROLES.map((r) => (
              <div key={r.key} className="grid grid-cols-6 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <div className="col-span-2"><p className="text-sm font-semibold text-slate-800">{r.label}</p></div>
                {FEATURES.map((f) => (
                  <div key={f.key} className="col-span-1 flex justify-center">
                    <button onClick={() => toggle(r.key, f.key)} className={`h-6 w-12 rounded-full transition-all ${roleAccess[r.key][f.key] ? "bg-emerald-500" : "bg-slate-300"}`} aria-label={`${r.label} ${f.label}`}>
                      <span className={`block h-5 w-5 rounded-full bg-white transition-transform ${roleAccess[r.key][f.key] ? "translate-x-6" : "translate-x-0.5"}`} />
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>
    </SettingsPageLayout>
  );
}
