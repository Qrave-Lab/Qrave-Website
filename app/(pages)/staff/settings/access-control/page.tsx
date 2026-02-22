"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import StaffSidebar from "@/app/components/StaffSidebar";
import { api } from "@/app/lib/api";

type RoleKey = "manager" | "kitchen" | "waiter" | "cashier";
type FeatureKey = "floor" | "menu" | "analytics" | "settings";
type RoleAccess = Record<RoleKey, Record<FeatureKey, boolean>>;

const ROLES: { key: RoleKey; label: string }[] = [
  { key: "manager", label: "Manager" },
  { key: "kitchen", label: "Kitchen/Chef" },
  { key: "waiter", label: "Waiter" },
  { key: "cashier", label: "Cashier" },
];

const FEATURES: { key: FeatureKey; label: string; hint: string }[] = [
  { key: "floor", label: "Floor & Tables", hint: "Table/session control page" },
  { key: "menu", label: "Menu & Inventory", hint: "Menu engineering tools" },
  { key: "analytics", label: "Sales & Reports", hint: "Analytics page access" },
  { key: "settings", label: "Settings", hint: "Settings section access" },
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
      if (typeof roleObj?.[feature.key] === "boolean") {
        base[role.key][feature.key] = roleObj[feature.key];
      }
    }
  }
  return base;
}

export default function AccessControlPage() {
  const router = useRouter();
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
        setThemeConfig(cfg);
        setRoleAccess(normalizeRoleAccess(cfg?.role_access));
      } catch {
        toast.error("Failed to load access settings");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const hasChanges = useMemo(() => {
    const current = JSON.stringify(roleAccess);
    const original = JSON.stringify(normalizeRoleAccess(themeConfig?.role_access));
    return current !== original;
  }, [roleAccess, themeConfig]);

  const toggle = (r: RoleKey, f: FeatureKey) => {
    setRoleAccess((prev) => ({
      ...prev,
      [r]: {
        ...prev[r],
        [f]: !prev[r][f],
      },
    }));
  };

  const save = async () => {
    setIsSaving(true);
    try {
      const nextThemeConfig = {
        ...themeConfig,
        role_access: roleAccess,
      };
      await api("/api/admin/update-details", {
        method: "PATCH",
        body: JSON.stringify({ theme_config: nextThemeConfig }),
      });
      setThemeConfig(nextThemeConfig);
      if (typeof window !== "undefined") {
        try {
          const cachedRaw = localStorage.getItem("staff_sidebar_me_cache_v1");
          const cached = cachedRaw ? JSON.parse(cachedRaw) : {};
          localStorage.setItem(
            "staff_sidebar_me_cache_v1",
            JSON.stringify({
              ...cached,
              role_access: roleAccess,
            })
          );
        } catch {
          // ignore
        }
        window.dispatchEvent(new Event("qrave:profile-updated"));
      }
      toast.success("Access controls updated");
    } catch {
      toast.error("Failed to save access controls");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (role !== "owner") {
    return (
      <div className="flex h-screen w-full bg-slate-50 text-slate-900">
        <StaffSidebar />
        <main className="flex-1 p-6">
          <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-bold text-slate-900">Restricted</h2>
            <p className="mt-2 text-sm text-slate-600">Only superadmin/owner can edit role access controls.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900">
      <StaffSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-6xl space-y-4">
          <button
            onClick={() => router.push("/staff/settings")}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Settings
          </button>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-indigo-600" />
                <h1 className="text-sm font-bold text-slate-900">Role Access Control</h1>
              </div>
              <button
                onClick={save}
                disabled={isSaving || !hasChanges}
                className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Access"}
              </button>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-6 gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <div className="col-span-2">Role</div>
                {FEATURES.map((f) => (
                  <div key={f.key} className="col-span-1 text-center">
                    {f.label}
                  </div>
                ))}
              </div>
              <div className="mt-2 space-y-2">
                {ROLES.map((r) => (
                  <div key={r.key} className="grid grid-cols-6 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <div className="col-span-2">
                      <p className="text-sm font-semibold text-slate-800">{r.label}</p>
                    </div>
                    {FEATURES.map((f) => (
                      <div key={f.key} className="col-span-1 flex justify-center">
                        <button
                          onClick={() => toggle(r.key, f.key)}
                          className={`h-6 w-12 rounded-full transition-all ${roleAccess[r.key][f.key] ? "bg-emerald-500" : "bg-slate-300"
                            }`}
                          aria-label={`${r.label} ${f.label}`}
                        >
                          <span
                            className={`block h-5 w-5 rounded-full bg-white transition-transform ${roleAccess[r.key][f.key] ? "translate-x-6" : "translate-x-0.5"
                              }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
