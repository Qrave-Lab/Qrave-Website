"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import toast from "react-hot-toast";
import SettingsPageLayout from "@/app/components/settings/SettingsPageLayout";
import { api } from "@/app/lib/api";

type ComplianceSettings = { fssai_number?: string; [key: string]: unknown };

export default function ComplianceSettingsPage() {
  const [settings, setSettings] = useState<ComplianceSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<{ settings: ComplianceSettings }>("/api/admin/settings/compliance")
      .then((res) => setSettings(res.settings || {}))
      .catch((e) => toast.error(e?.message || "Couldn't load settings"));
  }, []);

  if (!settings) {
    return (
      <SettingsPageLayout title="FSSAI & Compliance">
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
      </SettingsPageLayout>
    );
  }

  const fssai = settings.fssai_number || "";
  const valid = !fssai || /^\d{14}$/.test(fssai);

  const save = async () => {
    if (!valid) {
      toast.error("FSSAI licence number must be exactly 14 digits");
      return;
    }
    setSaving(true);
    try {
      // The endpoint replaces the whole settings object, so send back what we loaded.
      await api("/api/admin/settings/compliance", { method: "PUT", body: JSON.stringify(settings) });
      toast.success("Saved");
    } catch (e: any) {
      toast.error(e?.message || "Couldn't save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsPageLayout title="FSSAI & Compliance" description="Licence details printed on your bills.">
      <div className="space-y-6 pb-24">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-black text-slate-900">FSSAI licence</h2>
          <div className="mt-4 max-w-sm">
            <label htmlFor="fssai" className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
              FSSAI licence number
            </label>
            <input
              id="fssai"
              value={fssai}
              inputMode="numeric"
              maxLength={14}
              placeholder="14-digit licence number"
              aria-invalid={!valid}
              aria-describedby="fssai-help"
              onChange={(e) => setSettings({ ...settings, fssai_number: e.target.value.replace(/\D/g, "").slice(0, 14) })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#fe5c13]"
            />
            <p id="fssai-help" className={`mt-1 text-xs ${valid ? "text-slate-400" : "text-rose-600"}`}>
              {valid ? "Printed on every bill" : "Must be exactly 14 digits"}
            </p>
          </div>
        </section>
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#fe5c13] px-5 text-sm font-bold text-white disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </button>
      </div>
    </SettingsPageLayout>
  );
}
