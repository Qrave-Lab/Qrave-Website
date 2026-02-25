"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import SettingsPageLayout from "@/app/components/settings/SettingsPageLayout";
import { api } from "@/app/lib/api";
import ConfirmModal from "@/app/components/ui/ConfirmModal";

declare global { interface Window { Razorpay?: any } }

type BillingStatus = {
  provider?: string; plan?: string; status?: string; trial_ends_at?: string | null;
  grace_ends_at?: string | null; current_period_start?: string | null; current_period_end?: string | null;
  last_payment_at?: string | null; is_access_allowed?: boolean; access_reason?: string; days_left?: number;
};

const planLabel = (plan?: string) => plan === "yearly_5500" ? "Yearly ₹5,500" : "Monthly ₹499";
const formatDate = (iso?: string | null) => !iso ? "-" : new Date(iso).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });

export default function SubscriptionSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [role, setRole] = useState<string>("");
  const [selectedPlan, setSelectedPlan] = useState<"monthly_499" | "yearly_5500">("monthly_499");
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const refresh = async () => {
    try {
      const [data, me] = await Promise.all([api<BillingStatus>("/api/admin/billing/status", { method: "GET" }), api<{ role?: string }>("/api/admin/me", { method: "GET" })]);
      setBilling(data); setRole(String(me?.role || "")); setSelectedPlan(data?.plan === "yearly_5500" ? "yearly_5500" : "monthly_499");
    } catch { setStatusMessage({ type: "error", text: "Failed to load subscription details." }); } finally { setLoading(false); }
  };

  useEffect(() => { (async () => { try { await api("/api/admin/billing/sync", { method: "POST", suppressErrorLog: true }); } catch { } await refresh(); })(); }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") !== "success") return;
    (async () => {
      for (let i = 0; i < 5; i++) {
        try {
          await api("/api/admin/billing/sync", { method: "POST", suppressErrorLog: true }); await refresh();
          setStatusMessage({ type: "success", text: "Payment successful. Subscription updated." });
          params.delete("payment");
          window.history.replaceState({}, "", `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`);
          return;
        } catch { await new Promise(r => setTimeout(r, 1000)); }
      }
      setStatusMessage({ type: "error", text: "Payment completed, but status sync is delayed. Refresh in a few seconds." });
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
      let canceled = false; let lastError: any = null;
      for (const a of attempts) { try { await api(a.path, { method: a.method, suppressErrorLog: true }); canceled = true; break; } catch (e: any) { lastError = e; if (e?.status !== 404) throw e; } }
      if (!canceled) {
        const s = lastError?.status;
        if (s === 403) { setStatusMessage({ type: "error", text: "Only owner can cancel subscription." }); return; }
        if (s === 404) { setStatusMessage({ type: "error", text: "Cancel route is not available on current backend build." }); return; }
        if (s >= 500) { setStatusMessage({ type: "error", text: "Backend failed to cancel subscription." }); return; }
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

  const handleReactivate = async () => {
    setReactivating(true); setStatusMessage(null);
    try {
      const res = await api<{ short_url?: string; subscription_id?: string; key_id?: string }>("/api/admin/billing/mandate-link", { method: "POST", body: JSON.stringify({ plan: selectedPlan }) });
      const syncBilling = async () => { for (let i = 0; i < 4; i++) { try { await api("/api/admin/billing/sync", { method: "POST", suppressErrorLog: true }); return true; } catch { await new Promise(r => setTimeout(r, 1200)); } } return false; };
      const loadRazorpay = () => new Promise<boolean>((resolve) => { if (window.Razorpay) return resolve(true); const s = document.createElement("script"); s.src = "https://checkout.razorpay.com/v1/checkout.js"; s.onload = () => resolve(true); s.onerror = () => resolve(false); document.body.appendChild(s); });
      if (res?.subscription_id) {
        const loaded = await loadRazorpay();
        if (!loaded) { if (res?.short_url) { window.location.assign(res.short_url); return; } setStatusMessage({ type: "error", text: "Payment gateway failed to load." }); return; }
        const rzp = new window.Razorpay({ key: res.key_id || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_SIQgCgfhNqKSFT", subscription_id: res.subscription_id, name: "Qrave", description: "Reactivate subscription", redirect: true, callback_url: `${window.location.origin}/staff/settings/subscription?payment=success`, handler: async function () { await syncBilling(); await refresh(); setStatusMessage({ type: "success", text: "Subscription reactivated successfully." }); }, theme: { color: "#4f46e5" } });
        rzp.on("payment.failed", (r: any) => setStatusMessage({ type: "error", text: r?.error?.description || "Payment failed." }));
        try { rzp.open(); } catch { if (res?.short_url) { window.location.assign(res.short_url); return; } setStatusMessage({ type: "error", text: "Unable to open payment gateway." }); }
        return;
      }
      if (res?.short_url) { window.location.assign(res.short_url); return; }
      setStatusMessage({ type: "error", text: "Unable to start payment authorization." });
    } catch (e: any) { setStatusMessage({ type: "error", text: e?.message || "Failed to start payment authorization." }); } finally { setReactivating(false); }
  };

  if (loading) return <div className="flex h-screen w-full items-center justify-center bg-white"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;

  return (
    <SettingsPageLayout title="Subscription" description="Manage your billing plan. Includes a 7-day free trial." maxWidth="max-w-3xl">
      <section className="bg-white rounded-2xl border border-indigo-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-indigo-100 bg-indigo-50/50 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-indigo-600" />
          <h2 className="font-bold text-indigo-700">Manage Subscription</h2>
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
              <p className="text-xs font-semibold text-slate-500 mt-1">{isInactive ? "Choose a plan and authorize autopay to unlock all features again." : "Cancel anytime. If payment fails without cancellation, a 3-day grace period is applied."}</p>
            </div>
            {role === "owner" && billing?.status !== "canceled" && billing?.status !== "expired" && (
              <button type="button" onClick={handleCancel} disabled={canceling} className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 text-xs font-bold disabled:opacity-60">
                {canceling ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Cancel Subscription
              </button>
            )}
          </div>
          {isInactive && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-3">
              <p className="text-[11px] font-black uppercase tracking-widest text-indigo-700">Reactivate Subscription</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(["monthly_499", "yearly_5500"] as const).map((p) => (
                  <button key={p} type="button" onClick={() => setSelectedPlan(p)} className={`rounded-xl border px-4 py-3 text-left ${selectedPlan === p ? "border-indigo-500 bg-white" : "border-indigo-200 bg-indigo-50/40"}`}>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{p === "monthly_499" ? "Monthly" : "Yearly"}</p>
                    <p className="text-base font-black text-slate-900 mt-1">{p === "monthly_499" ? "₹499 / month" : "₹5,500 / year"}</p>
                  </button>
                ))}
              </div>
              <button type="button" onClick={handleReactivate} disabled={reactivating} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-xs font-bold disabled:opacity-60">
                {reactivating ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Reactivate Subscription
              </button>
            </div>
          )}
        </div>
      </section>
      <ConfirmModal open={showCancelConfirm} title="Cancel subscription?" message="This action cannot be undone and your access will be revoked immediately." confirmText={canceling ? "Canceling..." : "Yes, Cancel"} cancelText="Keep Subscription" destructive onClose={() => { if (!canceling) setShowCancelConfirm(false); }} onConfirm={() => { if (!canceling) void confirmCancel(); }} />
    </SettingsPageLayout>
  );
}
