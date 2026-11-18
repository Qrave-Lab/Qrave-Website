"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Check, Copy, Loader2, Lock } from "lucide-react";
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

/* ---------- Pieces (Qrave palette) ---------- */

const INPUT =
  "h-10 w-full rounded-xl border border-[#E8E8E3] bg-white px-3.5 text-[14px] text-[#0F1117] outline-none transition-colors placeholder:text-[#9CA3AF] hover:border-[#D6D6CF] focus:border-[#fe5c13]";
const WRAP =
  "flex h-10 overflow-hidden rounded-xl border border-[#E8E8E3] bg-white transition-colors hover:border-[#D6D6CF] focus-within:border-[#fe5c13]";
const BARE = "w-full min-w-0 bg-transparent px-3.5 text-[14px] tabular-nums text-[#0F1117] outline-none placeholder:text-[#9CA3AF]";
const ADDON = "flex shrink-0 items-center border-[#E8E8E3] bg-[#F3F3EF] px-3 text-[13px] font-medium text-[#6B7280]";

function Section({ title, description, aside, children }: { title: string; description?: React.ReactNode; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#E8E8E3] bg-white">
      <div className="flex items-start justify-between gap-4 border-b border-[#F0F0EB] px-6 py-4">
        <div>
          <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-[#0F1117]">{title}</h2>
          {description && <p className="mt-0.5 max-w-2xl text-[13px] leading-relaxed text-[#6B7280]">{description}</p>}
        </div>
        {aside}
      </div>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

function Label({ htmlFor, children, hint }: { htmlFor?: string; children: React.ReactNode; hint?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium text-[#4B5563]">
      {children}
      {hint && <span className="ml-1.5 font-normal text-[#9CA3AF]">{hint}</span>}
    </label>
  );
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fe5c13]/40 focus-visible:ring-offset-2 ${checked ? "bg-[#fe5c13]" : "bg-[#D6D6CF]"}`}
    >
      <span className={`absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-[0_1px_2px_rgba(15,17,23,0.2)] transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

/* ---------- Page ---------- */

export default function BillingControlsPage() {
  const [me, setMe] = useState<{ role?: string; restaurant_id?: string } | null>(null);
  const isOwner = me?.role === "owner";
  const [c, setC] = useState<Controls | null>(null);
  const [saved, setSaved] = useState<Controls | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api<{ role?: string; restaurant_id?: string }>("/api/admin/me").then(setMe).catch(() => setMe(null));
    api<Controls>("/api/admin/settings/billing", { noCache: true })
      .then((d: Controls) => { setC(d); setSaved(d); })
      .catch((e) => toast.error(e?.message || "Couldn't load billing controls"));
  }, []);

  const isDirty = useMemo(() => !!c && !!saved && JSON.stringify(c) !== JSON.stringify(saved), [c, saved]);

  const save = async () => {
    if (!c) return;
    setSaving(true);
    try {
      const body = {
        ...c,
        discount_limits: Object.fromEntries(Object.entries(c.discount_limits).map(([k, v]) => [k, Number(v) || 0])),
        cash_variance_limit: Number(c.cash_variance_limit) || 0,
      };
      await api("/api/admin/settings/billing", { method: "PUT", body: JSON.stringify(body) });
      toast.success("Billing controls saved");
      const fresh = await api<Controls>("/api/admin/settings/billing", { noCache: true });
      setC(fresh);
      setSaved(fresh);
    } catch (e) {
      toast.error((e as Error)?.message || "Couldn't save");
    } finally {
      setSaving(false);
    }
  };

  const action = (
    <>
      {isDirty && !saving && (
        <span className="hidden items-center gap-1.5 text-[13px] text-[#6B7280] sm:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Unsaved changes
        </span>
      )}
      {isDirty && !saving && saved && (
        <button
          type="button"
          onClick={() => setC(saved)}
          className="inline-flex h-10 items-center rounded-xl border border-[#E8E8E3] bg-white px-3.5 text-[13px] font-semibold text-[#374151] transition-colors hover:border-[#D6D6CF] hover:text-[#0F1117]"
        >
          Discard
        </button>
      )}
      <button
        onClick={save}
        disabled={!c || saving || !isDirty}
        className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#fe5c13] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#e44e0b] disabled:cursor-not-allowed disabled:bg-[#F3F3EF] disabled:text-[#9CA3AF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fe5c13]/40 focus-visible:ring-offset-2"
      >
        {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving</> : isDirty ? "Save changes" : "Saved"}
      </button>
    </>
  );

  if (!c) {
    return (
      <SettingsPageLayout title="Payments and billing controls" description="UPI payments, discount limits, bill lock and shift cash checks" maxWidth="max-w-4xl" action={action}>
        <div className="animate-pulse space-y-6">
          <div className="h-64 rounded-2xl border border-[#E8E8E3] bg-white" />
          <div className="h-40 rounded-2xl border border-[#E8E8E3] bg-white" />
          <div className="h-28 rounded-2xl border border-[#E8E8E3] bg-white" />
        </div>
      </SettingsPageLayout>
    );
  }

  const set = <K extends keyof Controls>(k: K, v: Controls[K]) => setC({ ...c, [k]: v });

  let webhookUrl = "";
  try {
    webhookUrl = `${getBackendBase()}/webhooks/razorpay/upi/${me?.restaurant_id || "<restaurant id>"}`;
  } catch {
    webhookUrl = `/webhooks/razorpay/upi/${me?.restaurant_id || ""}`;
  }
  const copyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy. Select the address and copy it instead.");
    }
  };

  return (
    <SettingsPageLayout title="Payments and billing controls" description="UPI payments, discount limits, bill lock and shift cash checks" maxWidth="max-w-4xl" action={action}>
      <Section
        title="Accept UPI payments"
        description={
          <>
            Add your UPI ID and the POS shows a QR for the exact bill amount. Money goes straight to your account. The cashier checks it arrived in their UPI app and taps &ldquo;Payment received&rdquo;.
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="b-vpa">UPI ID</Label>
            <input id="b-vpa" value={c.upi_vpa} onChange={(e) => set("upi_vpa", e.target.value.trim())} placeholder="spicehub@okicici" spellCheck={false} className={INPUT} />
          </div>
          <div>
            <Label htmlFor="b-payee">Name shown to customers</Label>
            <input id="b-payee" value={c.upi_payee_name} onChange={(e) => set("upi_payee_name", e.target.value)} placeholder="Spice Hub" className={INPUT} />
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-[#E8E8E3]">
          <div className="flex items-start justify-between gap-4 px-4 py-3.5">
            <div>
              <p className="text-[14px] font-semibold text-[#0F1117]">
                Razorpay <span className="font-normal text-[#9CA3AF]">Optional</span>
              </p>
              <p className="mt-0.5 text-[12px] text-[#6B7280]">Confirms UPI payments automatically, so the cashier doesn&apos;t have to check.</p>
            </div>
            <span
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[12px] font-medium ${
                c.razorpay_connected ? "border-emerald-200/70 bg-emerald-50 text-emerald-700" : "border-[#E8E8E3] bg-[#F3F3EF] text-[#4B5563]"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${c.razorpay_connected ? "bg-emerald-500" : "bg-[#9CA3AF]"}`} />
              {c.razorpay_connected ? "Connected" : "Not connected"}
            </span>
          </div>

          {!isOwner ? (
            <p className="flex items-center gap-2 border-t border-[#F0F0EB] px-4 py-3 text-[13px] text-[#6B7280]">
              <Lock className="h-3.5 w-3.5 text-[#9CA3AF]" /> Only the owner can connect payment keys.
            </p>
          ) : (
            <div className="space-y-4 border-t border-[#F0F0EB] px-4 py-4">
              <ol className="space-y-3">
                <li className="flex gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F3F3EF] text-[11px] font-semibold text-[#6B7280]">1</span>
                  <p className="text-[13px] leading-relaxed text-[#4B5563]">In the Razorpay Dashboard, go to Account &amp; Settings, then API Keys. Create a key and paste it below.</p>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F3F3EF] text-[11px] font-semibold text-[#6B7280]">2</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] leading-relaxed text-[#4B5563]">
                      In Webhooks, add this address with the event <span className="font-semibold text-[#0F1117]">qr_code.credited</span> and a secret of your choice.
                    </p>
                    <div className="mt-2 flex items-center gap-2 rounded-lg border border-[#E8E8E3] bg-[#FAFAF7] py-1.5 pl-3 pr-1.5">
                      <code className="min-w-0 flex-1 break-all text-[12px] text-[#374151]">{webhookUrl}</code>
                      <button
                        type="button"
                        onClick={copyWebhook}
                        className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-[#E8E8E3] bg-white px-2 text-[12px] font-semibold text-[#374151] transition-colors hover:border-[#D6D6CF] hover:text-[#0F1117]"
                      >
                        {copied ? <><Check className="h-3.5 w-3.5 text-emerald-600" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
                      </button>
                    </div>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F3F3EF] text-[11px] font-semibold text-[#6B7280]">3</span>
                  <p className="text-[13px] leading-relaxed text-[#4B5563]">Paste the same webhook secret below and save.</p>
                </li>
              </ol>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label htmlFor="b-kid">Key ID</Label>
                  <input id="b-kid" value={c.razorpay_key_id} onChange={(e) => set("razorpay_key_id", e.target.value.trim())} placeholder="rzp_live_..." spellCheck={false} className={INPUT} />
                </div>
                <div>
                  <Label htmlFor="b-ks">Key secret</Label>
                  <input id="b-ks" type="password" value={c.razorpay_key_secret || ""} onChange={(e) => set("razorpay_key_secret", e.target.value)} placeholder={c.razorpay_connected ? "Saved. Leave blank to keep" : ""} className={INPUT} />
                </div>
                <div>
                  <Label htmlFor="b-ws">Webhook secret</Label>
                  <input id="b-ws" type="password" value={c.razorpay_webhook_secret || ""} onChange={(e) => set("razorpay_webhook_secret", e.target.value)} placeholder={c.razorpay_connected ? "Saved. Leave blank to keep" : ""} className={INPUT} />
                </div>
              </div>
              <p className="text-[12px] text-[#9CA3AF]">Keys are encrypted before they&apos;re stored. To disconnect, clear the Key ID and save.</p>
            </div>
          )}
        </div>
      </Section>

      <Section
        title="Discount limits"
        description="The most each role can discount on their own, as a share of the bill. Above this, a manager PIN is needed. Owners have no limit."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ROLES.map((r) => (
            <div key={r.key}>
              <Label htmlFor={`b-d-${r.key}`}>{r.label}</Label>
              <div className={WRAP}>
                <input
                  id={`b-d-${r.key}`}
                  type="number"
                  min={0}
                  max={100}
                  inputMode="decimal"
                  value={c.discount_limits[r.key] ?? 0}
                  onChange={(e) => set("discount_limits", { ...c.discount_limits, [r.key]: e.target.value })}
                  className={BARE}
                />
                <span className={`${ADDON} border-l`}>%</span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[12px] text-[#9CA3AF]">Every discount, waiver, void and refund is recorded in the audit log.</p>
      </Section>

      <Section
        title="Lock bill after printing"
        description="Once a table's bill is printed, adding, removing or discounting items needs a manager PIN. Every print and reprint is logged."
        aside={
          <div className="flex items-center gap-2.5 pt-0.5">
            <span className={`text-[12px] font-medium ${c.lock_bill_after_print ? "text-[#0F1117]" : "text-[#9CA3AF]"}`}>
              {c.lock_bill_after_print ? "On" : "Off"}
            </span>
            <Switch checked={c.lock_bill_after_print} onChange={() => set("lock_bill_after_print", !c.lock_bill_after_print)} label="Lock bill after printing" />
          </div>
        }
      >
        <p className="text-[13px] text-[#4B5563]">
          {c.lock_bill_after_print
            ? "Printed bills are locked. Staff need a manager PIN to change them."
            : "Staff can change a bill after it's printed without a manager PIN."}
        </p>
      </Section>

      <Section
        title="Shift close"
        description="Cashiers count the drawer to close a shift. Any difference needs a note. A difference above this amount also needs a manager PIN."
      >
        <div className="max-w-[220px]">
          <Label htmlFor="b-var">Allowed cash difference</Label>
          <div className={WRAP}>
            <span className={`${ADDON} border-r`}>₹</span>
            <input
              id="b-var"
              type="number"
              min={0}
              inputMode="decimal"
              value={c.cash_variance_limit}
              onChange={(e) => set("cash_variance_limit", e.target.value)}
              className={`${BARE} px-3`}
            />
          </div>
        </div>
      </Section>
    </SettingsPageLayout>
  );
}
