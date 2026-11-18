"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, Minus, Pause, Play, Plus } from "lucide-react";
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
const CATEGORY_LABELS: Record<string, string> = { food: "Food", beverages: "Drinks", desserts: "Desserts" };

const DEFAULT_FORM: KitchenCapacitySettings = {
  is_paused: false,
  max_active_orders: 40,
  default_prep_minutes: 15,
  category_limits: { ...DEFAULT_LIMITS },
};

/* ---------- Pieces (Qrave palette) ---------- */

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#E8E8E3] bg-white">
      <div className="border-b border-[#F0F0EB] px-6 py-4">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-[#0F1117]">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] text-[#6B7280]">{description}</p>}
      </div>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

function Stepper({
  value,
  onChange,
  min = 1,
  max = 999,
  suffix,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
  label: string;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(n)));
  return (
    <div className="inline-flex h-10 items-center overflow-hidden rounded-xl border border-[#E8E8E3] bg-white transition-colors focus-within:border-[#fe5c13]">
      <button
        type="button"
        onClick={() => onChange(clamp(value - 1))}
        disabled={value <= min}
        aria-label={`Decrease ${label}`}
        className="flex h-full w-10 items-center justify-center text-[#4B5563] transition-colors hover:bg-[#F3F3EF] hover:text-[#0F1117] disabled:opacity-40"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="flex h-full items-center border-x border-[#E8E8E3]">
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          aria-label={label}
          value={value}
          onChange={(e) => onChange(clamp(Number(e.target.value) || min))}
          className="h-full w-14 bg-transparent text-center text-[15px] font-semibold tabular-nums text-[#0F1117] outline-none"
        />
        {suffix && <span className="pr-3 text-[13px] text-[#6B7280]">{suffix}</span>}
      </span>
      <button
        type="button"
        onClick={() => onChange(clamp(value + 1))}
        disabled={value >= max}
        aria-label={`Increase ${label}`}
        className="flex h-full w-10 items-center justify-center text-[#4B5563] transition-colors hover:bg-[#F3F3EF] hover:text-[#0F1117] disabled:opacity-40"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function Row({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-[14px] font-semibold text-[#0F1117]">{title}</p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-[#6B7280]">{hint}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/* ---------- Page ---------- */

export default function KitchenCapacitySettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<KitchenCapacitySettings>(DEFAULT_FORM);
  const [saved, setSaved] = useState<KitchenCapacitySettings>(DEFAULT_FORM);

  useEffect(() => {
    (async () => {
      try {
        const data = await api<KitchenCapacitySettings>("/api/admin/kitchen/capacity");
        const next = {
          is_paused: data?.is_paused ?? false,
          max_active_orders: data?.max_active_orders ?? 40,
          default_prep_minutes: data?.default_prep_minutes ?? 15,
          category_limits: { ...DEFAULT_LIMITS, ...(data?.category_limits || {}) },
        };
        setForm(next);
        setSaved(next);
      } catch {
        toast.error("Failed to load kitchen settings");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(saved), [form, saved]);

  const save = async () => {
    setIsSaving(true);
    try {
      await api("/api/admin/kitchen/capacity", { method: "PATCH", body: JSON.stringify(form) });
      setSaved(form);
      toast.success("Kitchen settings saved");
    } catch (err: any) {
      toast.error(err?.message || "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const overLimit = Object.keys(DEFAULT_LIMITS).filter(
    (k) => (form.category_limits[k] ?? 0) > form.max_active_orders
  );
  const setLimit = (key: string, v: number) =>
    setForm((p) => ({ ...p, category_limits: { ...p.category_limits, [key]: v } }));

  return (
    <SettingsPageLayout
      title="Kitchen capacity"
      description="How many orders the kitchen takes on, and the wait time guests see"
      maxWidth="max-w-3xl"
      action={
        <>
          {isDirty && !isSaving && (
            <span className="hidden items-center gap-1.5 text-[13px] text-[#6B7280] sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Unsaved changes
            </span>
          )}
          {isDirty && !isSaving && (
            <button
              type="button"
              onClick={() => setForm(saved)}
              className="inline-flex h-10 items-center rounded-xl border border-[#E8E8E3] bg-white px-3.5 text-[13px] font-semibold text-[#374151] transition-colors hover:border-[#D6D6CF] hover:text-[#0F1117]"
            >
              Discard
            </button>
          )}
          <button
            onClick={save}
            disabled={isSaving || isLoading || !isDirty}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#fe5c13] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#e44e0b] disabled:cursor-not-allowed disabled:bg-[#F3F3EF] disabled:text-[#9CA3AF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fe5c13]/40 focus-visible:ring-offset-2"
          >
            {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving</> : isDirty ? "Save changes" : "Saved"}
          </button>
        </>
      }
    >
      {isLoading ? (
        <div className="animate-pulse space-y-6">
          <div className="h-[92px] rounded-2xl border border-[#E8E8E3] bg-white" />
          <div className="h-72 rounded-2xl border border-[#E8E8E3] bg-white" />
          <div className="h-36 rounded-2xl border border-[#E8E8E3] bg-white" />
        </div>
      ) : (
        <>
          {/* Status */}
          <section
            className={`flex flex-col gap-4 rounded-2xl border px-6 py-5 sm:flex-row sm:items-center sm:justify-between ${
              form.is_paused ? "border-rose-200 bg-rose-50/60" : "border-[#E8E8E3] bg-white"
            }`}
          >
            <div className="flex items-start gap-3.5">
              <span
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  form.is_paused ? "bg-rose-100 text-rose-700" : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {form.is_paused ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </span>
              <div>
                <p className="text-[15px] font-semibold text-[#0F1117]">
                  {form.is_paused ? "New orders are paused" : "Kitchen is taking orders"}
                </p>
                <p className="mt-0.5 text-[13px] text-[#6B7280]">
                  {form.is_paused
                    ? "Guests and staff can't place new orders until you resume. Orders already in the kitchen carry on."
                    : "Pause new orders if the kitchen is overloaded. Orders already in the kitchen carry on."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setForm((p) => ({ ...p, is_paused: !p.is_paused }))}
              className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-[13px] font-semibold transition-colors ${
                form.is_paused
                  ? "bg-[#0F1117] text-white hover:bg-[#1F2937]"
                  : "border border-[#E8E8E3] bg-white text-rose-700 hover:border-rose-200 hover:bg-rose-50"
              }`}
            >
              {form.is_paused ? <><Play className="h-4 w-4" /> Resume orders</> : <><Pause className="h-4 w-4" /> Pause new orders</>}
            </button>
          </section>
          {isDirty && form.is_paused !== saved.is_paused && (
            <p className="-mt-3 px-1 text-[12px] text-amber-700">
              Save to {form.is_paused ? "pause" : "resume"} orders. Nothing changes until you do.
            </p>
          )}

          {/* Limits */}
          <Section title="Order limits" description="Keep the kitchen from taking on more than it can cook.">
            <div className="divide-y divide-[#F0F0EB]">
              <Row title="Active orders at once" hint="The most orders the kitchen will work on at the same time.">
                <Stepper
                  label="Active orders at once"
                  value={form.max_active_orders}
                  onChange={(v) => setForm((p) => ({ ...p, max_active_orders: v }))}
                />
              </Row>
              <div className="pt-4">
                <p className="text-[14px] font-semibold text-[#0F1117]">By category</p>
                <p className="mt-0.5 text-[12px] text-[#6B7280]">The most active orders for each type of item.</p>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {Object.keys(DEFAULT_LIMITS).map((key) => {
                    const v = form.category_limits[key] ?? DEFAULT_LIMITS[key as keyof typeof DEFAULT_LIMITS];
                    const over = v > form.max_active_orders;
                    return (
                      <div
                        key={key}
                        className={`rounded-xl border px-4 py-3 ${over ? "border-amber-200 bg-amber-50/60" : "border-[#E8E8E3] bg-[#FAFAF7]"}`}
                      >
                        <p className="mb-2 text-[13px] font-medium text-[#4B5563]">{CATEGORY_LABELS[key] || key}</p>
                        <Stepper label={`${CATEGORY_LABELS[key] || key} limit`} value={v} onChange={(n) => setLimit(key, n)} />
                      </div>
                    );
                  })}
                </div>
                {overLimit.length > 0 && (
                  <p className="mt-3 flex items-start gap-2 text-[12px] leading-relaxed text-amber-800">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {overLimit.map((k) => CATEGORY_LABELS[k] || k).join(" and ")}{" "}
                    {overLimit.length === 1 ? "is" : "are"} set higher than the overall limit of {form.max_active_orders}, so the overall limit will be reached first.
                  </p>
                )}
              </div>
            </div>
          </Section>

          {/* Timing */}
          <Section title="Wait time" description="The starting estimate before the kitchen gets busy.">
            <Row title="Base prep time" hint="Used as the wait time for a new order when the kitchen isn't busy.">
              <Stepper
                label="Base prep time in minutes"
                suffix="min"
                max={240}
                value={form.default_prep_minutes}
                onChange={(v) => setForm((p) => ({ ...p, default_prep_minutes: v }))}
              />
            </Row>
          </Section>
        </>
      )}
    </SettingsPageLayout>
  );
}
