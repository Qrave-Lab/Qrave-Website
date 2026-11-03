"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import toast from "react-hot-toast";
import SettingsPageLayout from "@/app/components/settings/SettingsPageLayout";
import { api, getBackendBase } from "@/app/lib/api";

type Controls = {
  discount_limits: Record<string, number | string>;
  lock_bill_after_print: boolean;
  cash_variance_limit: number | string;
  upi_vpa: string;
  upi_payee_name: string;
  razorpay_key_id: string;
  razorpay_key_secret?: string;
  razorpay_webhook_secret?: string;
  razorpay_connected: boolean;
};

const ROLES: Array<{ key: string; label: string }> = [
  { key: "manager", label: "Manager" },
  { key: "cashier", label: "Cashier" },
  { key: "captain", label: "Captain" },
  { key: "waiter", label: "Waiter" },
];

export default function BillingControlsPage() {
  const [me, setMe] = useState<{ role?: string; restaurant_id?: string } | null>(null);
  const isOwner = me?.role === "owner";
  const [c, setC] = useState<Controls | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<{ role?: string; restaurant_id?: string }>("/api/admin/me").then(setMe).catch(() => setMe(null));
    api<Controls>("/api/admin/settings/billing", { noCache: true })
      .then(setC)
      .catch((e) => toast.error(e?.message || "Couldn't load billing controls"));
  }, []);

  if (!c) {
    return (
      <SettingsPageLayout title="Payments & billing controls">
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
      </SettingsPageLayout>
    );
  }

  const set = <K extends keyof Controls>(k: K, v: Controls[K]) => setC({ ...c, [k]: v });

  const save = async () => {
    setSaving(true);
    try {
      const body = {
        ...c,
        discount_limits: Object.fromEntries(Object.entries(c.discount_limits).map(([k, v]) => [k, Number(v) || 0])),
        cash_variance_limit: Number(c.cash_variance_limit) || 0,
      };
      await api("/api/admin/settings/billing", { method: "PUT", body: JSON.stringify(body) });
      toast.success("Saved");
      const fresh = await api<Controls>("/api/admin/settings/billing", { noCache: true });
      setC(fresh);
    } catch (e) {
      toast.error((e as Error)?.message || "Couldn't save");
    } finally {
      setSaving(false);
    }
  };

  let webhookUrl = "";
  try {
    webhookUrl = `${getBackendBase()}/webhooks/razorpay/upi/${me?.restaurant_id || "<restaurant id>"}`;
  } catch {
    webhookUrl = `/webhooks/razorpay/upi/${me?.restaurant_id || ""}`;
  }

  const field = "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#fe5c13]";
  const label = (t: string, hint?: string) => (
    <div className="mb-1"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">{t}</span>{hint && <span className="ml-2 text-xs text-slate-400">{hint}</span>}</div>
  );

  return (
    <SettingsPageLayout title="Payments & billing controls" description="UPI payments, discount limits, printed-bill lock and shift cash checks.">
      <div className="space-y-6 pb-24">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-black text-slate-900">Accept UPI payments</h2>
          <p className="mt-1 mb-4 text-sm text-slate-500">
            Enter your UPI ID and the POS shows a QR for the exact bill amount; the customer&apos;s money goes straight to your
            account. That&apos;s all you need: the cashier checks the payment arrived in their UPI app and taps &ldquo;Payment
            received&rdquo;. Razorpay below is optional and only adds automatic confirmation.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>{label("UPI ID", "e.g. spicehub@okicici")}<input value={c.upi_vpa} onChange={(e) => set("upi_vpa", e.target.value.trim())} className={field} /></div>
            <div>{label("Name shown to customers")}<input value={c.upi_payee_name} onChange={(e) => set("upi_payee_name", e.target.value)} className={field} /></div>
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Razorpay (optional: automatic confirmation)</h3>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${c.razorpay_connected ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                {c.razorpay_connected ? "Connected" : "Not connected"}
              </span>
            </div>
            {!isOwner ? (
              <p className="mt-2 text-xs text-slate-500">Only the owner can connect payment keys.</p>
            ) : (
              <>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-slate-600">
                  <li>In Razorpay Dashboard → Account &amp; Settings → API Keys, create a key and paste it below.</li>
                  <li>In Webhooks, add this URL with the event <b>qr_code.credited</b> and a secret of your choice:
                    <div className="mt-1 break-all rounded bg-white px-2 py-1 font-mono text-[11px] text-slate-700">{webhookUrl}</div>
                  </li>
                  <li>Paste the same webhook secret below and save.</li>
                </ol>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div>{label("Key ID")}<input value={c.razorpay_key_id} onChange={(e) => set("razorpay_key_id", e.target.value.trim())} className={field} placeholder="rzp_live_..." /></div>
                  <div>{label("Key secret", c.razorpay_connected ? "saved; leave blank to keep" : "")}<input type="password" value={c.razorpay_key_secret || ""} onChange={(e) => set("razorpay_key_secret", e.target.value)} className={field} /></div>
                  <div>{label("Webhook secret", c.razorpay_connected ? "saved; leave blank to keep" : "")}<input type="password" value={c.razorpay_webhook_secret || ""} onChange={(e) => set("razorpay_webhook_secret", e.target.value)} className={field} /></div>
                </div>
                <p className="mt-2 text-xs text-slate-500">Keys are encrypted before they&apos;re stored. Clear the Key ID and save to disconnect.</p>
              </>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-black text-slate-900">Discount limits</h2>
          <p className="mt-1 mb-4 text-sm text-slate-500">The most each role can discount (as % of the bill) on their own. Above this, a manager PIN is needed. Owners have no limit. Every discount, waiver, void and refund is recorded in Audit Logs.</p>
          <div className="grid gap-4 sm:grid-cols-4">
            {ROLES.map((r) => (
              <div key={r.key}>
                {label(r.label, "%")}
                <input
                  type="number" min={0} max={100}
                  value={c.discount_limits[r.key] ?? 0}
                  onChange={(e) => set("discount_limits", { ...c.discount_limits, [r.key]: e.target.value })}
                  className={field}
                />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-black text-slate-900">Lock bill after printing</h2>
              <p className="mt-1 text-sm text-slate-500">Once a table&apos;s bill is printed, adding, removing or discounting items needs a manager PIN. Every print and reprint is logged.</p>
            </div>
            <input type="checkbox" checked={c.lock_bill_after_print} onChange={(e) => set("lock_bill_after_print", e.target.checked)} className="mt-1 h-5 w-5 accent-[#fe5c13]" />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-black text-slate-900">Shift close</h2>
          <p className="mt-1 mb-4 text-sm text-slate-500">Cashiers count the drawer to close a shift. Any difference needs a note; a difference above this amount also needs a manager PIN.</p>
          <div className="max-w-xs">{label("Allowed cash difference", "₹")}<input type="number" min={0} value={c.cash_variance_limit} onChange={(e) => set("cash_variance_limit", e.target.value)} className={field} /></div>
        </section>

        <div className="fixed bottom-6 right-6 z-[96]">
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#fe5c13] px-6 py-3 text-sm font-bold text-white shadow-lg hover:bg-[#e54f0c] disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
          </button>
        </div>
      </div>
    </SettingsPageLayout>
  );
}
