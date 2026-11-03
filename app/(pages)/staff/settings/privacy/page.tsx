"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, Download, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import SettingsPageLayout from "@/app/components/settings/SettingsPageLayout";
import { api } from "@/app/lib/api";

type Rule = { key: string; description: string; action: "delete" | "anonymize"; period: string };
type Schedule = {
  enabled: boolean;
  dry_run: boolean;
  rules: Rule[];
  statutory: { description: string; period: string; action: string }[];
};
type Retained = { kind: string; count: number; reason: string };
type EraseResult = {
  deleted: Record<string, number>;
  anonymized: Record<string, number>;
  retained_records?: Retained[] | null;
};

const LABELS: Record<string, string> = {
  profile: "Customer profile",
  crm_profile: "Loyalty / CRM profile",
  takeaway_orders: "Takeaway & delivery orders",
  reservations: "Reservations",
  waitlist_entries: "Waitlist entries",
  advance_payments: "Advance payments",
};

const errMsg = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

export default function PrivacyDataPage() {
  const [phone, setPhone] = useState("");
  const [confirm, setConfirm] = useState("");
  const [exporting, setExporting] = useState(false);
  const [erasing, setErasing] = useState(false);
  const [result, setResult] = useState<EraseResult | null>(null);
  const [schedule, setSchedule] = useState<Schedule | null>(null);

  useEffect(() => {
    api<Schedule>("/api/admin/privacy/retention", { method: "GET" })
      .then(setSchedule)
      .catch(() => {});
  }, []);

  const phoneDigits = phone.replace(/\D/g, "");
  const phoneOk = phoneDigits.length >= 8 && phoneDigits.length <= 15;

  const exportData = async () => {
    if (!phoneOk) return toast.error("Enter the customer's full phone number");
    setExporting(true);
    try {
      const data = await api<{ phone_last4: string; sections: Record<string, unknown[]> }>("/api/admin/privacy/customer-export", {
        method: "POST",
        body: JSON.stringify({ phone }),
      });
      const found = Object.values(data.sections || {}).reduce((n, rows) => n + (Array.isArray(rows) ? rows.length : 0), 0);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `customer-data-${data.phone_last4}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(found ? `Exported ${found} record${found === 1 ? "" : "s"}` : "No records found for this number");
    } catch (e) {
      toast.error(errMsg(e, "Export failed"));
    } finally {
      setExporting(false);
    }
  };

  const erase = async () => {
    if (!phoneOk) return toast.error("Enter the customer's full phone number");
    if (confirm.trim().toUpperCase() !== "ERASE") return toast.error("Type ERASE to confirm");
    setErasing(true);
    try {
      const res = await api<EraseResult>("/api/admin/privacy/customer-erase", {
        method: "POST",
        body: JSON.stringify({ phone, confirm: confirm.trim() }),
      });
      setResult(res);
      setConfirm("");
      toast.success("Customer data erased");
    } catch (e) {
      toast.error(errMsg(e, "Erase failed"));
    } finally {
      setErasing(false);
    }
  };

  const summary = result
    ? [...Object.entries(result.deleted), ...Object.entries(result.anonymized)].filter(([, n]) => n > 0)
    : [];

  return (
    <SettingsPageLayout
      title="Privacy & Data"
      description="Handle customer data requests and review how long data is kept."
      fullBleed
    >
      <div className="flex-1 min-h-0 overflow-y-auto bg-[#f8fafc] p-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#fe5c13]" />
              <h2 className="text-sm font-black text-slate-900">Customer data request</h2>
            </div>
            <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
              When a guest asks for a copy of their data, or asks to be forgotten, enter the phone number they used. Matching covers profile,
              loyalty, takeaway orders, reservations, waitlist and advances. Every request is recorded in the audit log (last 4 digits only).
            </p>

            <label className="mt-5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Customer phone number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/30 px-4 py-2.5 text-sm text-slate-900 outline-none transition-all focus:border-[#fe5c13] focus:ring-2 focus:ring-yellow-500/20"
            />

            <button
              onClick={exportData}
              disabled={exporting || !phoneOk}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-bold text-white disabled:bg-slate-100 disabled:text-slate-400"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Download data (JSON)
            </button>
          </section>

          <section className="rounded-2xl border border-rose-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-500" />
              <h2 className="text-sm font-black text-slate-900">Erase customer data</h2>
            </div>
            <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
              Deletes the profile, saved addresses and loyalty history, and removes names, phone numbers and addresses from past orders,
              reservations and advances. Order amounts stay for your accounts. GST tax invoices must be kept as issued and are not changed.
              This cannot be undone. Download the data first if the guest wants a copy.
            </p>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Type ERASE to confirm</label>
                <input
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="ERASE"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-rose-400"
                />
              </div>
              <button
                onClick={erase}
                disabled={erasing || !phoneOk || confirm.trim().toUpperCase() !== "ERASE"}
                className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-bold text-white disabled:bg-slate-100 disabled:text-slate-400"
              >
                {erasing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Erase data
              </button>
            </div>

            {result && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
                {summary.length === 0 ? (
                  <p className="font-semibold">No records found for this number.</p>
                ) : (
                  <ul className="space-y-1">
                    {summary.map(([k, n]) => (
                      <li key={k}>
                        <b>{LABELS[k] || k}</b>: {n} {k in result.deleted ? "deleted" : "anonymized"}
                      </li>
                    ))}
                  </ul>
                )}
                {result.retained_records?.map((r) => (
                  <p key={r.kind} className="mt-2 text-slate-500">
                    <b>{r.count} {r.kind.replace("_", " ")} kept:</b> {r.reason}
                  </p>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-black text-slate-900">How long data is kept</h2>
            <p className="mt-1 text-xs font-medium text-slate-500">
              Qrave applies this schedule automatically every day{schedule && !schedule.enabled ? " (currently switched off on this server)" : ""}.
              It matches section 12 of our Privacy Policy.
            </p>
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-2">Data</th>
                    <th className="px-4 py-2">After</th>
                    <th className="px-4 py-2">Then</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {(schedule?.rules || []).map((r) => (
                    <tr key={r.key}>
                      <td className="px-4 py-2 font-semibold">{r.description}</td>
                      <td className="px-4 py-2">{r.period}</td>
                      <td className="px-4 py-2 capitalize">{r.action === "delete" ? "Deleted" : "Anonymized"}</td>
                    </tr>
                  ))}
                  {(schedule?.statutory || []).map((r) => (
                    <tr key={r.description} className="bg-slate-50/60">
                      <td className="px-4 py-2 font-semibold">{r.description}</td>
                      <td className="px-4 py-2">{r.period}</td>
                      <td className="px-4 py-2 capitalize">Kept (legal requirement)</td>
                    </tr>
                  ))}
                  {!schedule && (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-slate-400">Loading…</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </SettingsPageLayout>
  );
}
