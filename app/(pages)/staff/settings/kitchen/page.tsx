"use client";

import React, { useEffect, useState } from "react";
import { ChefHat, Save, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import SettingsPageLayout from "@/app/components/settings/SettingsPageLayout";
import { api } from "@/app/lib/api";

type KitchenCapacitySettings = {
  is_paused: boolean;
  max_active_orders: number;
  default_prep_minutes: number;
  category_limits: Record<string, number>;
};

const DEFAULT_LIMITS = { food: 25, beverages: 18, desserts: 12 };

export default function KitchenCapacitySettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<KitchenCapacitySettings>({
    is_paused: false,
    max_active_orders: 40,
    default_prep_minutes: 15,
    category_limits: { ...DEFAULT_LIMITS },
  });

  useEffect(() => {
    (async () => {
      try {
        const data = await api<KitchenCapacitySettings>("/api/admin/kitchen/capacity");
        setForm({
          is_paused: data?.is_paused ?? false,
          max_active_orders: data?.max_active_orders ?? 40,
          default_prep_minutes: data?.default_prep_minutes ?? 15,
          category_limits: { ...DEFAULT_LIMITS, ...(data?.category_limits || {}) },
        });
      } catch {
        toast.error("Failed to load kitchen settings");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    setIsSaving(true);
    try {
      await api("/api/admin/kitchen/capacity", { method: "PATCH", body: JSON.stringify(form) });
      toast.success("Kitchen settings updated");
    } catch (err: any) {
      toast.error(err?.message || "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SettingsPageLayout
      title="Kitchen Capacity"
      description="Control order intake load and ETA pressure logic."
      maxWidth="max-w-3xl"
      action={
        <button
          onClick={save}
          disabled={isSaving || isLoading}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isSaving ? "Saving..." : "Save"}
        </button>
      }
    >
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4 flex items-center gap-2">
          <ChefHat className="h-5 w-5 text-orange-500" />
          <h2 className="text-base font-bold text-slate-900">Kitchen Capacity &amp; Auto-Throttle</h2>
        </div>
        {isLoading ? (
          <div className="p-6 text-sm text-slate-500">Loading settings...</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Global Pause</p>
              <p className="mt-1 text-xs text-slate-500">Blocks new order finalization when kitchen is overloaded.</p>
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, is_paused: !p.is_paused }))}
                className={`mt-3 rounded-lg px-3 py-2 text-xs font-bold ${form.is_paused ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"}`}
              >
                {form.is_paused ? "Paused" : "Running"}
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Max Active Orders</label>
              <input
                type="number" min={1}
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.max_active_orders}
                onChange={(e) => setForm((p) => ({ ...p, max_active_orders: Math.max(1, Number(e.target.value) || 1) }))}
              />
            </div>

            <div className="rounded-xl border border-slate-200 p-4 md:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Base Prep ETA (minutes)</label>
              <input
                type="number" min={1}
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.default_prep_minutes}
                onChange={(e) => setForm((p) => ({ ...p, default_prep_minutes: Math.max(1, Number(e.target.value) || 1) }))}
              />
            </div>

            <div className="rounded-xl border border-slate-200 p-4 md:col-span-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Per-Category Active Limits</p>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                {Object.keys(DEFAULT_LIMITS).map((key) => (
                  <label key={key} className="block">
                    <span className="text-xs font-semibold text-slate-600 capitalize">{key}</span>
                    <input
                      type="number" min={1}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      value={form.category_limits[key] ?? DEFAULT_LIMITS[key as keyof typeof DEFAULT_LIMITS]}
                      onChange={(e) => setForm((p) => ({ ...p, category_limits: { ...p.category_limits, [key]: Math.max(1, Number(e.target.value) || 1) } }))}
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </SettingsPageLayout>
  );
}
