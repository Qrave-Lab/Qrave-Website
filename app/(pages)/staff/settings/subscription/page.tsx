"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import SettingsPageLayout from "@/app/components/settings/SettingsPageLayout";
import { api } from "@/app/lib/api";
import ConfirmModal from "@/app/components/ui/ConfirmModal";

type RazorpayFailure = { error?: { description?: string } };
type RazorpayCheckout = {
  open: () => void;
  on: (event: "payment.failed", handler: (response: RazorpayFailure) => void) => void;
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

const BILLING_UPDATED_EVENT = "qrave:billing-updated";

type BillingStatus = {
  provider?: string; plan?: string; status?: string; trial_ends_at?: string | null;
  grace_ends_at?: string | null; current_period_start?: string | null; current_period_end?: string | null;
  last_payment_at?: string | null; is_access_allowed?: boolean; access_reason?: string; days_left?: number;
  pending_plan?: string; pending_plan_starts_at?: string | null;
};

type PlanCode = "monthly_499" | "yearly_5500";
type PlanChangeResponse = {
  plan?: string;
  pending_plan?: string;
  pending_plan_starts_at?: string | null;
  subscription_id?: string;
  short_url?: string;
  status?: string;
  key_id?: string;
};

const planLabel = (plan?: string) => plan === "yearly_5500" ? "Yearly ₹5,500" : "Monthly ₹499";
const formatDate = (iso?: string | null) => !iso ? "-" : new Date(iso).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
const errorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;
const statusFromError = (error: unknown) => typeof error === "object" && error !== null && "status" in error ? Number((error as { status?: unknown }).status) : undefined;

export default function SubscriptionSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [changingPlan, setChangingPlan] = useState(false);
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [role, setRole] = useState<string>("");
  const [selectedPlan, setSelectedPlan] = useState<PlanCode>("monthly_499");
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const refresh = async (): Promise<BillingStatus | null> => {
    try {
      const [data, me] = await Promise.all([api<BillingStatus>("/api/admin/billing/status", { method: "GET" }), api<{ role?: string }>("/api/admin/me", { method: "GET" })]);
      setBilling(data); setRole(String(me?.role || "")); setSelectedPlan(data?.plan === "yearly_5500" ? "yearly_5500" : "monthly_499");
      return data || null;
    } catch {
      setStatusMessage({ type: "error", text: "Failed to load subscription details." });
      return null;
    } finally { setLoading(false); }
  };

  useEffect(() => { (async () => { try { await api("/api/admin/billing/sync", { method: "POST", suppressErrorLog: true }); } catch { } await refresh(); })(); }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") !== "success") return;
    (async () => {
      for (let i = 0; i < 20; i++) {
        try {
          await api("/api/admin/billing/sync", { method: "POST", suppressErrorLog: true }).catch(() => {});
          const latest = await refresh();
          const raw = String(latest?.status || "").toLowerCase();
          const hasPaidCycle = Boolean(latest?.last_payment_at) || Boolean(latest?.current_period_end);
          if (raw === "active" || hasPaidCycle) {
            setStatusMessage({ type: "success", text: "Payment successful. Subscription updated." });
            window.dispatchEvent(new Event(BILLING_UPDATED_EVENT));
            params.delete("payment");
            window.history.replaceState({}, "", `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`);
            return;
          }
        } catch {
          // Keep retrying while payment/webhook finalization catches up.
        }
        await new Promise(r => setTimeout(r, 1500));
      }
      setStatusMessage({ type: "error", text: "Payment completed, but backend confirmation is still processing. Please wait 20-30 seconds and refresh." });
    })();
  }, []);

  const handleCancel = async () => {
    if (role !== "owner") { setStatusMessage({ type: "error", text: "Only owner can cancel subscription." }); return; }
    setShowCancelConfirm(true);
  };

  const confirmCancel = async () => {
    setCanceling(true); setStatusMessage(null);
    try {
      const attempts: Array<{ method: "DELETE" | "POST"; path: string }> = [
        { method: "DELETE", path: "/api/admin/billing/subscription" }, { method: "DELETE", path: "/api/admin/billing/subscription/cancel" },
        { method: "DELETE", path: "/api/admin/billing/cancel" }, { method: "POST", path: "/api/admin/billing/subscription/cancel" }, { method: "POST", path: "/api/admin/billing/cancel" },
      ];
      let canceled = false; let lastError: unknown = null;
      for (const a of attempts) { try { await api(a.path, { method: a.method, suppressErrorLog: true }); canceled = true; break; } catch (e: unknown) { lastError = e; if (statusFromError(e) !== 404) throw e; } }
      if (!canceled) {
        const s = statusFromError(lastError);
        if (s === 403) { setStatusMessage({ type: "error", text: "Only owner can cancel subscription." }); return; }
        if (s === 404) { setStatusMessage({ type: "error", text: "Cancel route is not available on current backend build." }); return; }
        if (s !== undefined && s >= 500) { setStatusMessage({ type: "error", text: "Backend failed to cancel subscription." }); return; }
        throw new Error("cancel endpoint not available");
      }
      setStatusMessage({ type: "success", text: "Subscription canceled." }); await refresh();
    } catch { setStatusMessage({ type: "error", text: "Could not cancel subscription right now. Please retry." }); }
    finally { setCanceling(false); setShowCancelConfirm(false); }
  };

  const statusText = useMemo(() => {
    const raw = String(billing?.status || "trialing").toLowerCase();
    const hasPaid = Boolean(billing?.last_payment_at) || Boolean(billing?.current_period_end);
    const status = (raw === "trialing" && hasPaid ? "active" : raw).toUpperCase();
    const planType = billing?.plan === "yearly_5500" ? "YEARLY" : "MONTHLY";
    const days = billing?.days_left ?? 0;
    if (status === "TRIALING") return `TRIAL (${days} day${days === 1 ? "" : "s"} left)`;
    if (status === "ACTIVE") return `ACTIVE • ${planType}`;
    if (status === "PAST_DUE") return `PAST DUE (${days} day${days === 1 ? "" : "s"} grace left)`;
    return status;
  }, [billing]);

  const isInactive = useMemo(() => {
    const raw = String(billing?.status || "").toLowerCase();
    const hasPaid = Boolean(billing?.last_payment_at) || Boolean(billing?.current_period_end);
    const status = raw === "trialing" && hasPaid ? "active" : raw;
    return status === "canceled" || status === "cancelled" || status === "expired";
  }, [billing]);

  const currentPlanLabel = useMemo(() => isInactive ? "No current plan" : planLabel(billing?.plan), [billing?.plan, isInactive]);
  const selectedPlanLabel = useMemo(() => planLabel(selectedPlan), [selectedPlan]);

  const isActive = useMemo(() => {
    const raw = String(billing?.status || "").toLowerCase();
    const hasPaid = Boolean(billing?.last_payment_at) || Boolean(billing?.current_period_end);
    const status = raw === "trialing" && hasPaid ? "active" : raw;
    return status === "active";
  }, [billing]);

  const loadRazorpay = () => new Promise<boolean>((resolve) => { if (window.Razorpay) return resolve(true); const s = document.createElement("script"); s.src = "https://checkout.razorpay.com/v1/checkout.js"; s.onload = () => resolve(true); s.onerror = () => resolve(false); document.body.appendChild(s); });

  const handleReactivate = async () => {
    setReactivating(true); setStatusMessage(null);
    try {
      const res = await api<{ short_url?: string; subscription_id?: string; key_id?: string }>("/api/admin/billing/mandate-link", { method: "POST", body: JSON.stringify({ plan: selectedPlan }) });
      const waitForBillingUpdate = async () => {
        for (let i = 0; i < 12; i++) {
          try { await api("/api/admin/billing/sync", { method: "POST", suppressErrorLog: true }); } catch {}
          const latest = await refresh();
          const raw = String(latest?.status || "").toLowerCase();
          const hasPaidCycle = Boolean(latest?.last_payment_at) || Boolean(latest?.current_period_end);
          if (raw === "active" || hasPaidCycle) return true;
          await new Promise(r => setTimeout(r, 1500));
        }
        return false;
      };
      if (res?.subscription_id) {
        const loaded = await loadRazorpay();
        if (!loaded) { if (res?.short_url) { window.location.assign(res.short_url); return; } setStatusMessage({ type: "error", text: "Payment gateway failed to load." }); return; }
        const Razorpay = window.Razorpay as RazorpayConstructor;
        const rzp = new Razorpay({
          key: res.key_id || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_SIQgCgfhNqKSFT",
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
          theme: { color: "#4f46e5" },
        });
        rzp.on("payment.failed", (r) => setStatusMessage({ type: "error", text: r?.error?.description || "Payment failed." }));
        try { rzp.open(); } catch { if (res?.short_url) { window.location.assign(res.short_url); return; } setStatusMessage({ type: "error", text: "Unable to open payment gateway." }); }
        return;
      }
      if (res?.short_url) { window.location.assign(res.short_url); return; }
      setStatusMessage({ type: "error", text: "Unable to start payment authorization." });
    } catch (e: unknown) { setStatusMessage({ type: "error", text: errorMessage(e, "Failed to start payment authorization.") }); } finally { setReactivating(false); }
  };

  const handlePlanChange = async () => {
    if (role !== "owner") { setStatusMessage({ type: "error", text: "Only owner can change subscription plans." }); return; }
    if (!isActive) { await handleReactivate(); return; }
    if (selectedPlan === billing?.plan) { setStatusMessage({ type: "error", text: "Select a different plan to schedule a change." }); return; }

    setChangingPlan(true); setStatusMessage(null);
    try {
      const res = await api<PlanChangeResponse>("/api/admin/billing/plan", { method: "PATCH", body: JSON.stringify({ plan: selectedPlan }) });
      const startsAt = res?.pending_plan_starts_at || billing?.current_period_end;
      const successText = `Plan change scheduled to ${selectedPlanLabel}${startsAt ? ` from ${formatDate(startsAt)}` : ""}. You will not be charged before the current plan ends.`;

      if (res?.subscription_id) {
        const loaded = await loadRazorpay();
        if (!loaded) {
          if (res?.short_url) { window.location.assign(res.short_url); return; }
          setStatusMessage({ type: "error", text: "Payment gateway failed to load." });
          return;
        }
        const Razorpay = window.Razorpay as RazorpayConstructor;
        const rzp = new Razorpay({
          key: res.key_id || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_SIQgCgfhNqKSFT",
          subscription_id: res.subscription_id,
          name: "Qrave",
          description: "Authorize plan change",
          handler: async function () {
            await refresh();
            window.dispatchEvent(new Event(BILLING_UPDATED_EVENT));
            setStatusMessage({ type: "success", text: successText });
          },
          modal: { ondismiss: () => setChangingPlan(false) },
          theme: { color: "#4f46e5" },
        });
        rzp.on("payment.failed", (r) => setStatusMessage({ type: "error", text: r?.error?.description || "Plan change authorization failed." }));
        try { rzp.open(); } catch {
          if (res?.short_url) { window.location.assign(res.short_url); return; }
          setStatusMessage({ type: "error", text: "Unable to open payment gateway." });
        }
        return;
      }

      await refresh();
      setStatusMessage({ type: "success", text: successText });
    } catch (e: unknown) {
      setStatusMessage({ type: "error", text: errorMessage(e, "Failed to schedule plan change.") });
    } finally { setChangingPlan(false); }
  };

  if (loading) return <div className="flex h-screen w-full items-center justify-center bg-white"><Loader2 className="w-8 h-8 animate-spin text-[#FFC529]" /></div>;

  return (
    <SettingsPageLayout title="Subscription" description="Manage your billing plan. Includes a 7-day free trial." maxWidth="max-w-3xl">
      <section className="bg-white rounded-2xl border border-[#FFC529] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-[#FFC529]" />
          <h2 className="font-bold text-gray-900">Manage Subscription</h2>
        </div>
        <div className="p-6 space-y-6">
          {statusMessage && <div className={`rounded-lg border px-3 py-2 text-xs font-semibold ${statusMessage.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>{statusMessage.text}</div>}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {[{ label: "Status", val: statusText }, { label: "Current Plan", val: currentPlanLabel }, { label: "Last Payment", val: formatDate(billing?.last_payment_at) }, { label: "Next Due Date", val: formatDate(billing?.current_period_end || billing?.trial_ends_at) }].map(({ label, val }) => (
              <div key={label} className="rounded-xl border border-slate-200 p-4"><p className="text-[10px] uppercase tracking-widest font-black text-slate-400">{label}</p><p className="mt-2 text-sm font-black text-slate-900">{val}</p></div>
            ))}
          </div>
          <div className="rounded-xl border border-slate-200/60 bg-slate-50 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">{isInactive ? "Subscription required" : "Manage billing"}</p>
              <p className="text-xs font-semibold text-slate-500 mt-1">{isInactive ? "Choose a plan and authorize autopay to unlock all features again." : "Change plans anytime. The new plan starts after your current paid period ends."}</p>
            </div>
            {role === "owner" && (
              <div className="flex w-full sm:w-auto items-center gap-2">
                {isInactive && (
                  <button
                    type="button"
                    onClick={handleReactivate}
                    disabled={reactivating}
                    className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-[#FFC529] hover:brightness-95 text-gray-900 px-4 py-2 text-xs font-bold disabled:opacity-60"
                  >
                    {reactivating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Pay & Reactivate
                  </button>
                )}
                {billing?.status !== "canceled" && billing?.status !== "expired" && (
                  <button type="button" onClick={handleCancel} disabled={canceling} className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 text-xs font-bold disabled:opacity-60">
                    {canceling ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Cancel Subscription
                  </button>
                )}
              </div>
            )}
          </div>
          {billing?.pending_plan && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-widest text-emerald-700">Plan change scheduled</p>
              <p className="mt-1 text-xs font-semibold text-emerald-700">
                {planLabel(billing.pending_plan)} starts on {formatDate(billing.pending_plan_starts_at || billing.current_period_end)}. No charge is taken before then.
              </p>
            </div>
          )}
          {(isInactive || isActive) && (
            <div className="rounded-xl border border-[#FFC529] bg-slate-50/50 p-4 space-y-3">
              <p className="text-[11px] font-black uppercase tracking-widest text-gray-900">{isInactive ? "Reactivate Subscription" : "Change Plan"}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(["monthly_499", "yearly_5500"] as const).map((p) => (
                  <button key={p} type="button" onClick={() => setSelectedPlan(p)} className={`rounded-xl border px-4 py-3 text-left ${selectedPlan === p ? "border-[#FFC529] bg-white" : "border-[#FFC529] bg-slate-50/40"}`}>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{p === "monthly_499" ? "Monthly" : "Yearly"}</p>
                    <p className="text-base font-black text-slate-900 mt-1">{p === "monthly_499" ? "₹499 / month" : "₹5,500 / year"}</p>
                    {billing?.plan === p && !isInactive ? <p className="mt-1 text-[11px] font-bold text-emerald-600">Current plan</p> : null}
                  </button>
                ))}
              </div>
              <button type="button" onClick={isInactive ? handleReactivate : handlePlanChange} disabled={reactivating || changingPlan || Boolean(billing?.pending_plan) || (!isInactive && selectedPlan === billing?.plan)} className="inline-flex items-center gap-2 rounded-lg bg-[#FFC529] hover:brightness-95 text-gray-900 px-4 py-2 text-xs font-bold disabled:opacity-60">
                {reactivating || changingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {billing?.pending_plan ? "Plan Change Scheduled" : isInactive ? "Reactivate Subscription" : `Change to ${selectedPlan === "monthly_499" ? "Monthly" : "Yearly"}`}
              </button>
            </div>
          )}
        </div>
      </section>
      <ConfirmModal open={showCancelConfirm} title="Cancel subscription?" message="This action cannot be undone and your access will be revoked immediately." confirmText={canceling ? "Canceling..." : "Yes, Cancel"} cancelText="Keep Subscription" destructive onClose={() => { if (!canceling) setShowCancelConfirm(false); }} onConfirm={() => { if (!canceling) void confirmCancel(); }} />
    </SettingsPageLayout>
  );
}
