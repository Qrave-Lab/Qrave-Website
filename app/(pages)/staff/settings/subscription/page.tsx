"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  Loader2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Zap,
  ShoppingCart,
  QrCode,
  BarChart3,
  Clock,
  Users,
  Truck,
  Boxes,
} from "lucide-react";
import SettingsPageLayout from "@/app/components/settings/SettingsPageLayout";
import { api } from "@/app/lib/api";
import ConfirmModal from "@/app/components/ui/ConfirmModal";
import {
  PLAN_OPTIONS,
  type PlanCode,
  normalizePlanCode,
  planLabel,
} from "@/app/lib/plans";

type RazorpayFailure = { error?: { description?: string } };
type RazorpayCheckout = {
  open: () => void;
  on: (
    event: "payment.failed",
    handler: (response: RazorpayFailure) => void
  ) => void;
};
type RazorpayConstructor = new (options: {
  key: string;
  subscription_id: string;
  name: string;
  description: string;
  handler: () => void | Promise<void>;
  modal?: { ondismiss?: () => void };
  theme?: { color?: string };
}) => RazorpayCheckout;

declare global {
  interface Window {
    Razorpay?: any;
  }
}

const BILLING_UPDATED_EVENT = "qrave:billing-updated";

type BillingStatus = {
  provider?: string;
  plan?: string;
  status?: string;
  trial_ends_at?: string | null;
  grace_ends_at?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  last_payment_at?: string | null;
  is_access_allowed?: boolean;
  access_reason?: string;
  days_left?: number;
  pending_plan?: string;
  pending_plan_starts_at?: string | null;
};

type PlanChangeResponse = {
  plan?: string;
  pending_plan?: string;
  pending_plan_starts_at?: string | null;
  subscription_id?: string;
  short_url?: string;
  status?: string;
  key_id?: string;
};

const formatDate = (iso?: string | null) =>
  !iso
    ? "—"
    : new Date(iso).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const statusFromError = (error: unknown) =>
  typeof error === "object" && error !== null && "status" in error
    ? Number((error as { status?: unknown }).status)
    : undefined;

// ── Plan benefit definitions ──────────────────────────────────────────────────
const PLAN_BENEFITS: Record<
  string,
  { icon: React.ReactNode; text: string }[]
> = {
  monthly_799: [
    { icon: <QrCode className="w-3.5 h-3.5" />, text: "QR code menu generation" },
    { icon: <Zap className="w-3.5 h-3.5" />, text: "Augmented reality (AR) menu viewer" },
    { icon: <Boxes className="w-3.5 h-3.5" />, text: "Full menu & category management" },
    { icon: <BarChart3 className="w-3.5 h-3.5" />, text: "Basic analytics dashboard" },
  ],
  yearly_8999: [
    { icon: <QrCode className="w-3.5 h-3.5" />, text: "QR code menu generation" },
    { icon: <Zap className="w-3.5 h-3.5" />, text: "Augmented reality (AR) menu viewer" },
    { icon: <Boxes className="w-3.5 h-3.5" />, text: "Full menu & category management" },
    { icon: <BarChart3 className="w-3.5 h-3.5" />, text: "Basic analytics dashboard" },
    { icon: <CheckCircle2 className="w-3.5 h-3.5" />, text: "Save ₹ 1,589 vs monthly billing" },
  ],
  monthly_1299: [
    { icon: <QrCode className="w-3.5 h-3.5" />, text: "Everything in AR Menu plan" },
    { icon: <ShoppingCart className="w-3.5 h-3.5" />, text: "Full table ordering (POS)" },
    { icon: <Truck className="w-3.5 h-3.5" />, text: "Takeaway & delivery management" },
    { icon: <Clock className="w-3.5 h-3.5" />, text: "Staff shift & time tracking" },
    { icon: <Users className="w-3.5 h-3.5" />, text: "Multi-staff roles & permissions" },
    { icon: <BarChart3 className="w-3.5 h-3.5" />, text: "Advanced reporting & cash drawer" },
  ],
  yearly_15199: [
    { icon: <QrCode className="w-3.5 h-3.5" />, text: "Everything in AR Menu plan" },
    { icon: <ShoppingCart className="w-3.5 h-3.5" />, text: "Full table ordering (POS)" },
    { icon: <Truck className="w-3.5 h-3.5" />, text: "Takeaway & delivery management" },
    { icon: <Clock className="w-3.5 h-3.5" />, text: "Staff shift & time tracking" },
    { icon: <Users className="w-3.5 h-3.5" />, text: "Multi-staff roles & permissions" },
    { icon: <BarChart3 className="w-3.5 h-3.5" />, text: "Advanced reporting & cash drawer" },
    { icon: <CheckCircle2 className="w-3.5 h-3.5" />, text: "Save ₹ 2,389 vs monthly billing" },
  ],
};

// ── Plan card component ───────────────────────────────────────────────────────
function PlanCard({
  plan,
  selected,
  isCurrent,
  onSelect,
}: {
  plan: (typeof PLAN_OPTIONS)[number];
  selected: boolean;
  isCurrent: boolean;
  onSelect: () => void;
}) {
  const [showBenefits, setShowBenefits] = useState(false);
  const benefits = PLAN_BENEFITS[plan.code] ?? [];
  const isYearly = plan.cadence === "Yearly";

  return (
    <div
      onClick={onSelect}
      className={`relative rounded-2xl border-2 cursor-pointer transition-all duration-200 overflow-hidden group
        ${selected
          ? "border-[#fe5c13] shadow-md bg-white scale-[1.01]"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
        }`}
    >
      {/* Yearly savings badge */}
      {isYearly && (
        <div className="absolute top-3 right-3 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
          Best Value
        </div>
      )}

      {/* Current plan badge */}
      {isCurrent && (
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
          <CheckCircle2 className="w-2.5 h-2.5" /> Current
        </div>
      )}

      <div className="p-5">
        {/* Plan label */}
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          {plan.name} · {plan.cadence}
        </p>

        {/* Price */}
        <p
          className={`text-2xl font-black mt-1.5 tracking-tight transition-colors duration-200 ${
            selected ? "text-[#fe5c13]" : "text-slate-900"
          }`}
        >
          {plan.price}
        </p>

        {/* Summary */}
        <p className="text-xs text-slate-500 mt-1 font-medium leading-snug">
          {plan.summary}
        </p>

        {/* Selected indicator ring */}
        {selected && (
          <div className="mt-3 flex items-center gap-1.5 animate-fadeIn">
            <div className="w-2 h-2 rounded-full bg-[#fe5c13] animate-pulse" />
            <span className="text-[10px] font-black text-[#fe5c13] uppercase tracking-wider">
              Selected
            </span>
          </div>
        )}

        {/* Benefits toggle */}
        {benefits.length > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowBenefits((v) => !v);
            }}
            className="mt-3 flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
          >
            {showBenefits ? (
              <>
                <ChevronUp className="w-3 h-3 text-slate-500" /> Hide benefits
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3 text-slate-500" /> See what's included
              </>
            )}
          </button>
        )}
      </div>

      {/* Expandable benefits */}
      {showBenefits && benefits.length > 0 && (
        <div
          className={`border-t px-5 py-4 space-y-2 transition-all duration-200 animate-slideDown ${
            selected ? "border-orange-100 bg-orange-50/40" : "border-slate-100 bg-slate-50"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {benefits.map((b, i) => (
            <div key={i} className="flex items-start gap-2">
              <span
                className={`mt-0.5 ${
                  selected ? "text-[#fe5c13]" : "text-slate-400"
                }`}
              >
                {b.icon}
              </span>
              <span className="text-[11px] font-semibold text-slate-600">
                {b.text}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SubscriptionSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [changingPlan, setChangingPlan] = useState(false);
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [role, setRole] = useState<string>("");
  const [selectedPlan, setSelectedPlan] = useState<PlanCode>("monthly_1299");
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const refresh = async (): Promise<BillingStatus | null> => {
    try {
      const [data, me] = await Promise.all([
        api<BillingStatus>("/api/admin/billing/status", { method: "GET" }),
        api<{ role?: string }>("/api/admin/me", { method: "GET" }),
      ]);
      setBilling(data);
      setRole(String(me?.role || ""));
      setSelectedPlan(normalizePlanCode(data?.plan));
      return data || null;
    } catch {
      setStatusMessage({
        type: "error",
        text: "Failed to load subscription details.",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        await api("/api/admin/billing/sync", {
          method: "POST",
          suppressErrorLog: true,
        });
      } catch {}
      await refresh();
    })();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") !== "success") return;
    (async () => {
      for (let i = 0; i < 20; i++) {
        try {
          await api("/api/admin/billing/sync", {
            method: "POST",
            suppressErrorLog: true,
          }).catch(() => {});
          const latest = await refresh();
          const raw = String(latest?.status || "").toLowerCase();
          const hasPaidCycle =
            Boolean(latest?.last_payment_at) ||
            Boolean(latest?.current_period_end);
          if (raw === "active" || hasPaidCycle) {
            setStatusMessage({
              type: "success",
              text: "Payment successful. Subscription updated.",
            });
            window.dispatchEvent(new Event(BILLING_UPDATED_EVENT));
            params.delete("payment");
            window.history.replaceState(
              {},
              "",
              `${window.location.pathname}${
                params.toString() ? `?${params.toString()}` : ""
              }`
            );
            return;
          }
        } catch {}
        await new Promise((r) => setTimeout(r, 1500));
      }
      setStatusMessage({
        type: "error",
        text: "Payment completed, but backend confirmation is still processing. Please wait 20-30 seconds and refresh.",
      });
    })();
  }, []);

  const handleCancel = async () => {
    if (role !== "owner") {
      setStatusMessage({
        type: "error",
        text: "Only owner can cancel subscription.",
      });
      return;
    }
    setShowCancelConfirm(true);
  };

  const confirmCancel = async () => {
    setCanceling(true);
    setStatusMessage(null);
    try {
      const attempts: Array<{ method: "DELETE" | "POST"; path: string }> = [
        { method: "DELETE", path: "/api/admin/billing/subscription" },
        { method: "DELETE", path: "/api/admin/billing/subscription/cancel" },
        { method: "DELETE", path: "/api/admin/billing/cancel" },
        { method: "POST", path: "/api/admin/billing/subscription/cancel" },
        { method: "POST", path: "/api/admin/billing/cancel" },
      ];
      let canceled = false;
      let lastError: unknown = null;
      for (const a of attempts) {
        try {
          await api(a.path, { method: a.method, suppressErrorLog: true });
          canceled = true;
          break;
        } catch (e: unknown) {
          lastError = e;
          if (statusFromError(e) !== 404) throw e;
        }
      }
      if (!canceled) {
        const s = statusFromError(lastError);
        if (s === 403) {
          setStatusMessage({
            type: "error",
            text: "Only owner can cancel subscription.",
          });
          return;
        }
        if (s === 404) {
          setStatusMessage({
            type: "error",
            text: "Cancel route is not available on current backend build.",
          });
          return;
        }
        if (typeof s === "number" && s >= 500) {
          setStatusMessage({
            type: "error",
            text: "Backend failed to cancel subscription.",
          });
          return;
        }
        throw new Error("cancel endpoint not available");
      }
      setStatusMessage({ type: "success", text: "Subscription canceled." });
      await refresh();
    } catch {
      setStatusMessage({
        type: "error",
        text: "Could not cancel subscription right now. Please retry.",
      });
    } finally {
      setCanceling(false);
      setShowCancelConfirm(false);
    }
  };

  const statusText = useMemo(() => {
    const raw = String(billing?.status || "trialing").toLowerCase();
    const hasPaid =
      Boolean(billing?.last_payment_at) ||
      Boolean(billing?.current_period_end);
    const status = (
      raw === "trialing" && hasPaid ? "active" : raw
    ).toUpperCase();
    const planType = normalizePlanCode(billing?.plan).startsWith("yearly")
      ? "YEARLY"
      : "MONTHLY";
    const days = billing?.days_left ?? 0;
    if (status === "TRIALING")
      return `TRIAL (${days} day${days === 1 ? "" : "s"} left)`;
    if (status === "ACTIVE") return `ACTIVE · ${planType}`;
    if (status === "PAST_DUE")
      return `PAST DUE (${days} day${days === 1 ? "" : "s"} grace left)`;
    return status;
  }, [billing]);

  const isInactive = useMemo(() => {
    const raw = String(billing?.status || "").toLowerCase();
    const hasPaid =
      Boolean(billing?.last_payment_at) ||
      Boolean(billing?.current_period_end);
    const status = raw === "trialing" && hasPaid ? "active" : raw;
    return (
      status === "canceled" || status === "cancelled" || status === "expired"
    );
  }, [billing]);

  const isActive = useMemo(() => {
    const raw = String(billing?.status || "").toLowerCase();
    const hasPaid =
      Boolean(billing?.last_payment_at) ||
      Boolean(billing?.current_period_end);
    const status = raw === "trialing" && hasPaid ? "active" : raw;
    return status === "active";
  }, [billing]);

  const currentPlanLabel = useMemo(
    () => (isInactive ? "No current plan" : planLabel(billing?.plan)),
    [billing?.plan, isInactive]
  );

  const selectedPlanLabel = useMemo(
    () => planLabel(selectedPlan),
    [selectedPlan]
  );

  const loadRazorpay = () =>
    new Promise<boolean>((resolve) => {
      if (window.Razorpay) return resolve(true);
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });

  const handleReactivate = async () => {
    setReactivating(true);
    setStatusMessage(null);
    try {
      const res = await api<{
        short_url?: string;
        subscription_id?: string;
        key_id?: string;
      }>("/api/admin/billing/mandate-link", {
        method: "POST",
        body: JSON.stringify({ plan: selectedPlan }),
      });
      const waitForBillingUpdate = async () => {
        for (let i = 0; i < 12; i++) {
          try {
            await api("/api/admin/billing/sync", {
              method: "POST",
              suppressErrorLog: true,
            });
          } catch {}
          const latest = await refresh();
          const raw = String(latest?.status || "").toLowerCase();
          const hasPaidCycle =
            Boolean(latest?.last_payment_at) ||
            Boolean(latest?.current_period_end);
          if (raw === "active" || hasPaidCycle) return true;
          await new Promise((r) => setTimeout(r, 1500));
        }
        return false;
      };
      if (res?.subscription_id) {
        const loaded = await loadRazorpay();
        if (!loaded) {
          if (res?.short_url) {
            window.location.assign(res.short_url);
            return;
          }
          setStatusMessage({
            type: "error",
            text: "Payment gateway failed to load.",
          });
          return;
        }
        const rzp = new window.Razorpay({
          key:
            res.key_id ||
            process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
            "rzp_test_SIQgCgfhNqKSFT",
          subscription_id: res.subscription_id,
          name: "Qrave",
          description: "Reactivate subscription",
          handler: async function () {
            const updated = await waitForBillingUpdate();
            window.dispatchEvent(new Event(BILLING_UPDATED_EVENT));
            setStatusMessage({
              type: updated ? "success" : "error",
              text: updated
                ? "Subscription reactivated successfully."
                : "Payment completed, but backend confirmation is still processing. Please wait 20-30 seconds and refresh.",
            });
          },
          modal: { ondismiss: () => setReactivating(false) },
          theme: { color: "#fe5c13" },
        });
        rzp.on("payment.failed", (r: RazorpayFailure) =>
          setStatusMessage({
            type: "error",
            text: r?.error?.description || "Payment failed.",
          })
        );
        try {
          rzp.open();
        } catch {
          if (res?.short_url) {
            window.location.assign(res.short_url);
            return;
          }
          setStatusMessage({
            type: "error",
            text: "Unable to open payment gateway.",
          });
        }
        return;
      }
      if (res?.short_url) {
        window.location.assign(res.short_url);
        return;
      }
      setStatusMessage({
        type: "error",
        text: "Unable to start payment authorization.",
      });
    } catch (e: unknown) {
      setStatusMessage({
        type: "error",
        text: errorMessage(e, "Failed to start payment authorization."),
      });
    } finally {
      setReactivating(false);
    }
  };

  const handlePlanChange = async () => {
    if (role !== "owner") {
      setStatusMessage({
        type: "error",
        text: "Only owner can change subscription plans.",
      });
      return;
    }
    if (!isActive) {
      await handleReactivate();
      return;
    }
    if (selectedPlan === normalizePlanCode(billing?.plan)) {
      setStatusMessage({
        type: "error",
        text: "Select a different plan to schedule a change.",
      });
      return;
    }

    setChangingPlan(true);
    setStatusMessage(null);
    try {
      const res = await api<PlanChangeResponse>(
        "/api/admin/billing/plan",
        { method: "PATCH", body: JSON.stringify({ plan: selectedPlan }) }
      );
      const startsAt =
        res?.pending_plan_starts_at || billing?.current_period_end;
      const successText = `Plan change scheduled to ${selectedPlanLabel}${
        startsAt ? ` from ${formatDate(startsAt)}` : ""
      }. You will not be charged before the current plan ends.`;

      if (res?.subscription_id) {
        const loaded = await loadRazorpay();
        if (!loaded) {
          if (res?.short_url) {
            window.location.assign(res.short_url);
            return;
          }
          setStatusMessage({
            type: "error",
            text: "Payment gateway failed to load.",
          });
          return;
        }
        const rzp = new window.Razorpay({
          key:
            res.key_id ||
            process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
            "rzp_test_SIQgCgfhNqKSFT",
          subscription_id: res.subscription_id,
          name: "Qrave",
          description: "Authorize plan change",
          handler: async function () {
            await refresh();
            window.dispatchEvent(new Event(BILLING_UPDATED_EVENT));
            setStatusMessage({ type: "success", text: successText });
          },
          modal: { ondismiss: () => setChangingPlan(false) },
          theme: { color: "#fe5c13" },
        });
        rzp.on("payment.failed", (r: RazorpayFailure) =>
          setStatusMessage({
            type: "error",
            text: r?.error?.description || "Plan change authorization failed.",
          })
        );
        try {
          rzp.open();
        } catch {
          if (res?.short_url) {
            window.location.assign(res.short_url);
            return;
          }
          setStatusMessage({
            type: "error",
            text: "Unable to open payment gateway.",
          });
        }
        return;
      }

      await refresh();
      setStatusMessage({ type: "success", text: successText });
    } catch (e: unknown) {
      setStatusMessage({
        type: "error",
        text: errorMessage(e, "Failed to schedule plan change."),
      });
    } finally {
      setChangingPlan(false);
    }
  };

  // ── Status chip color ────────────────────────────────────────────────────
  const statusChipClass = useMemo(() => {
    const raw = String(billing?.status || "trialing").toLowerCase();
    if (raw === "active") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (raw === "trialing") return "bg-sky-50 text-sky-700 border-sky-200";
    if (raw === "past_due") return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-slate-100 text-slate-600 border-slate-200";
  }, [billing]);

  return (
    <SettingsPageLayout
      title="Subscription"
      description="Manage your billing plan. Includes a 7-day free trial."
      fullBleed
    >
      <div className="flex flex-col flex-1 min-h-0 bg-[#f8fafc]">
        {/* Sticky top sub-header */}
        <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10 shrink-0">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Plan &amp; Billing</p>
            <h2 className="text-sm font-black text-slate-900 mt-0.5">Plan &amp; Subscriptions</h2>
          </div>
          {!loading && role === "owner" && (isInactive || isActive) && (
            <button
              type="button"
              onClick={isInactive ? handleReactivate : handlePlanChange}
              disabled={
                reactivating ||
                changingPlan ||
                Boolean(billing?.pending_plan) ||
                (!isInactive && selectedPlan === normalizePlanCode(billing?.plan))
              }
              className="inline-flex items-center gap-2 rounded-xl bg-[#fe5c13] hover:brightness-95 active:scale-[0.98] text-white px-5 py-2.5 text-xs font-black shadow-md shadow-orange-100 transition-all disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed select-none"
            >
              {reactivating || changingPlan ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CreditCard className="w-4 h-4" />
              )}
              {billing?.pending_plan
                ? "Change Scheduled"
                : isInactive
                ? "Reactivate Subscription"
                : `Switch to ${planLabel(selectedPlan)}`}
            </button>
          )}
        </div>

        {/* Content area */}
        {loading ? (
          <div className="flex-1 bg-white px-8 pt-10 space-y-6 animate-pulse">
            <div className="h-24 rounded-2xl bg-slate-200/70 w-full" />
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 rounded-2xl bg-slate-200/70" />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-48 rounded-2xl bg-slate-200/70" />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 bg-white px-8 py-8 overflow-y-auto space-y-6">
            {/* Status alerts */}
            {statusMessage && (
              <div
                className={`rounded-xl border px-4 py-3 text-xs font-semibold flex items-center gap-2 ${
                  statusMessage.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-rose-200 bg-rose-50 text-rose-700"
                }`}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {statusMessage.text}
              </div>
            )}

            {/* Unified Billing overview strip */}
            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label: "Status", val: statusText, chip: true },
                { label: "Current Plan", val: currentPlanLabel, chip: false },
                {
                  label: "Last Payment",
                  val: formatDate(billing?.last_payment_at),
                  chip: false,
                },
                {
                  label: "Next Due",
                  val: formatDate(
                    billing?.current_period_end || billing?.trial_ends_at
                  ),
                  chip: false,
                },
              ].map(({ label, val, chip }, idx) => (
                <div
                  key={label}
                  className={`flex flex-col justify-center ${
                    idx > 0 ? "md:border-l md:border-slate-200/60 md:pl-6" : ""
                  }`}
                >
                  <p className="text-[10px] uppercase tracking-widest font-black text-slate-400">
                    {label}
                  </p>
                  {chip ? (
                    <div className="mt-1.5">
                      <span
                        className={`inline-flex items-center border rounded-full px-2.5 py-0.5 text-[10px] font-black ${statusChipClass}`}
                      >
                        {val}
                      </span>
                    </div>
                  ) : (
                    <p className="mt-1.5 text-xs font-black text-slate-900 leading-tight">
                      {val}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Pending plan change notice */}
            {billing?.pending_plan && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                    Plan change scheduled
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-emerald-700">
                    {planLabel(billing.pending_plan)} starts on{" "}
                    {formatDate(
                      billing.pending_plan_starts_at ||
                        billing.current_period_end
                    )}
                    . No charge is taken before then.
                  </p>
                </div>
              </div>
            )}

            {/* Interactive plan options list */}
            {(isInactive || isActive) && (
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {isInactive ? "Choose a plan" : "Select Plan"}
                  </p>
                  <h3 className="text-sm font-black text-slate-900 mt-0.5">
                    {isInactive
                      ? "Reactivate your subscription"
                      : "Select a new billing plan"}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {PLAN_OPTIONS.map((plan) => (
                    <PlanCard
                      key={plan.code}
                      plan={plan}
                      selected={selectedPlan === plan.code}
                      isCurrent={
                        normalizePlanCode(billing?.plan) === plan.code &&
                        !isInactive
                      }
                      onSelect={() => setSelectedPlan(plan.code as PlanCode)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Manage/Cancel billing section */}
            {role === "owner" &&
              billing?.status !== "canceled" &&
              billing?.status !== "expired" && (
                <div className="bg-white rounded-2xl border border-slate-200/60 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Danger Zone
                    </p>
                    <p className="text-xs font-semibold text-slate-500 mt-1">
                      Cancel subscription plan anytime. Access remains active until the end of the current billing cycle.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={canceling}
                    className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-500 hover:text-red-600 px-4 py-2 text-xs font-bold transition-all disabled:opacity-60"
                  >
                    {canceling ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : null}
                    Cancel Subscription
                  </button>
                </div>
              )}
          </div>
        )}
      </div>

      <ConfirmModal
        open={showCancelConfirm}
        title="Cancel subscription?"
        message="This action cannot be undone and your access will be revoked immediately."
        confirmText={canceling ? "Canceling..." : "Yes, Cancel"}
        cancelText="Keep Subscription"
        destructive
        onClose={() => {
          if (!canceling) setShowCancelConfirm(false);
        }}
        onConfirm={() => {
          if (!canceling) void confirmCancel();
        }}
      />
    </SettingsPageLayout>
  );
}
