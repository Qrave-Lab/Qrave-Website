"use client";

import SettingsPageLayout from "@/app/components/settings/SettingsPageLayout";
import { api } from "@/app/lib/api";
import { Loader2, Lock, RotateCcw } from "lucide-react";
import React from "react";
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
  { key: "kitchen", label: "Chef" },
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

const FEATURE_NOTES: Record<FeatureKey, string> = {
  floor: "The live floor, tables and orders",
  menu: "Dishes, prices and stock",
  takeaway: "Takeaway and delivery orders",
  reservations: "Bookings and the waitlist",
  analytics: "Sales figures and reports",
  insights: "Menu health and other insights",
  audit: "Who did what, and when",
  settings: "Open the settings hub",
  profile: "Name, hours and tax details",
  floor_plan: "Tables, floors and sections",
  team: "Add and edit staff",
  devices: "Printers and QR codes",
  theme: "How the guest menu looks",
  offers: "Discounts and coupon codes",
  delivery: "Delivery areas and charges",
  kitchen_capacity: "Order limits and wait time",
  feedback: "Report a problem to Qrave",
};

const FEATURE_GROUPS: { title: string; keys: FeatureKey[] }[] = [
  { title: "Daily work", keys: ["floor", "menu", "takeaway", "reservations"] },
  { title: "Reports", keys: ["analytics", "insights", "audit"] },
  { title: "Settings", keys: ["settings", "profile", "floor_plan", "team", "devices", "theme", "offers", "delivery", "kitchen_capacity", "feedback"] },
];

const FEATURE_LABELS: Record<FeatureKey, string> = {
  floor: "Floor and tables",
  menu: "Menu and inventory",
  takeaway: "Takeaway and delivery",
  reservations: "Reservations and waitlist",
  analytics: "Sales and reports",
  insights: "Insights",
  audit: "Audit log",
  settings: "Settings hub",
  profile: "Restaurant profile",
  floor_plan: "Floor plan",
  team: "Team members",
  devices: "Devices and QR codes",
  theme: "Theme studio",
  offers: "Offers and coupons",
  delivery: "Delivery zones",
  kitchen_capacity: "Kitchen capacity",
  feedback: "Feedback and issues",
};
const labelOf = (k: FeatureKey) => FEATURE_LABELS[k];

function Switch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fe5c13]/40 focus-visible:ring-offset-2 ${checked ? "bg-[#fe5c13]" : "bg-[#D6D6CF]"}`}
    >
      <span className={`absolute left-0.5 h-4 w-4 rounded-full bg-white shadow-[0_1px_2px_rgba(15,17,23,0.2)] transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`} />
    </button>
  );
}

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
      toast.success("Role access saved. It applies the next time staff sign in.");
    } catch {
      toast.error("Couldn't save role access");
    } finally {
      setIsSaving(false);
    }
  };

  const BTN_SECONDARY =
    "inline-flex h-10 items-center gap-2 rounded-xl border border-[#E8E8E3] bg-white px-3.5 text-[13px] font-semibold text-[#374151] transition-colors hover:border-[#D6D6CF] hover:text-[#0F1117]";
  const isDefault = JSON.stringify(roleAccess) === JSON.stringify(defaultRoleAccess());
  const countFor = (r: RoleKey) => FEATURES.filter((f) => roleAccess[r][f.key]).length;
  const setGroup = (r: RoleKey, keys: FeatureKey[], on: boolean) =>
    setRoleAccess((prev) => ({ ...prev, [r]: { ...prev[r], ...Object.fromEntries(keys.map((k) => [k, on])) } }));

  if (isLoading || role !== "owner") {
    return (
      <SettingsPageLayout title="Role access" description="Choose which pages each staff role can open" maxWidth="max-w-6xl">
        {isLoading ? (
          <div className="h-[600px] animate-pulse rounded-2xl border border-[#E8E8E3] bg-white" />
        ) : (
          <div className="mx-auto max-w-md rounded-2xl border border-[#E8E8E3] bg-white px-8 py-10 text-center">
            <Lock className="mx-auto h-6 w-6 text-[#C4C4BE]" />
            <h2 className="mt-3 text-[17px] font-bold text-[#0F1117]">Only the owner can change this</h2>
            <p className="mt-1.5 text-[13px] text-[#6B7280]">Ask the restaurant owner if a role needs access to more pages.</p>
          </div>
        )}
      </SettingsPageLayout>
    );
  }

  return (
    <SettingsPageLayout
      title="Role access"
      description="Choose which pages each staff role can open"
      maxWidth="max-w-6xl"
      action={
        <>
          {hasChanges && !isSaving && (
            <span className="hidden items-center gap-1.5 text-[13px] text-[#6B7280] sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Unsaved changes
            </span>
          )}
          {hasChanges && !isSaving ? (
            <button type="button" onClick={() => setRoleAccess(normalizeRoleAccess(themeConfig?.role_access))} className={BTN_SECONDARY}>
              Discard
            </button>
          ) : (
            !isDefault && (
              <button
                type="button"
                onClick={() => setRoleAccess(defaultRoleAccess())}
                title="Go back to the recommended access for every role. Nothing is saved until you press Save."
                className={BTN_SECONDARY}
              >
                <RotateCcw className="h-4 w-4 text-[#6B7280]" /> Use recommended
              </button>
            )
          )}
          <button
            onClick={save}
            disabled={isSaving || !hasChanges}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#fe5c13] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#e44e0b] disabled:cursor-not-allowed disabled:bg-[#F3F3EF] disabled:text-[#9CA3AF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fe5c13]/40 focus-visible:ring-offset-2"
          >
            {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving</> : hasChanges ? "Save changes" : "Saved"}
          </button>
        </>
      }
    >
      <section className="overflow-hidden rounded-2xl border border-[#E8E8E3] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#E8E8E3]">
                <th className="px-6 py-4 align-bottom">
                  <span className="text-[13px] font-semibold text-[#0F1117]">Page</span>
                  <span className="mt-0.5 block text-[12px] font-normal text-[#9CA3AF]">Owners can always open everything.</span>
                </th>
                {ROLES.map((r) => {
                  const n = countFor(r.key);
                  return (
                    <th key={r.key} className="w-36 px-4 py-4 text-center align-bottom">
                      <span className="block text-[13px] font-semibold text-[#0F1117]">{r.label}</span>
                      <span className="mt-0.5 block text-[12px] font-normal tabular-nums text-[#9CA3AF]">
                        {n} of {FEATURES.length} pages
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {FEATURE_GROUPS.map((g) => (
                <React.Fragment key={g.title}>
                  <tr className="border-b border-[#F0F0EB] bg-[#FAFAF7]">
                    <td className="px-6 py-2.5 text-[12px] font-semibold text-[#4B5563]">{g.title}</td>
                    {ROLES.map((r) => {
                      const all = g.keys.every((k) => roleAccess[r.key][k]);
                      return (
                        <td key={r.key} className="px-4 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => setGroup(r.key, g.keys, !all)}
                            className="rounded-md px-1.5 py-0.5 text-[12px] font-medium text-[#6B7280] transition-colors hover:bg-[#F3F3EF] hover:text-[#0F1117]"
                            aria-label={`${all ? "Turn off" : "Turn on"} all ${g.title.toLowerCase()} for ${r.label}`}
                          >
                            {all ? "None" : "All"}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                  {g.keys.map((k) => (
                    <tr key={k} className="border-b border-[#F0F0EB] transition-colors last:border-b-0 hover:bg-[#FAFAF7]">
                      <td className="px-6 py-3">
                        <p className="text-[14px] font-medium text-[#0F1117]">{labelOf(k)}</p>
                        <p className="mt-0.5 text-[12px] text-[#9CA3AF]">{FEATURE_NOTES[k]}</p>
                      </td>
                      {ROLES.map((r) => (
                        <td key={r.key} className="px-4 py-3">
                          <div className="flex justify-center">
                            <Switch checked={roleAccess[r.key][k]} onChange={() => toggle(r.key, k)} label={`${r.label} can open ${labelOf(k)}`} />
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <p className="px-1 text-[12px] text-[#9CA3AF]">Changes apply the next time each staff member signs in.</p>
    </SettingsPageLayout>
  );
}
