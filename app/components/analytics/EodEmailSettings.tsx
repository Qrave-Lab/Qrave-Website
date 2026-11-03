"use client";

import { api } from "@/app/lib/api";
import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

type Settings = { enabled: boolean; send_hour: number; recipients: string[] };

/** Owner-only: choose who gets the day-end report by email, and when. */
export default function EodEmailSettings({ canEdit }: { canEdit: boolean }) {
  const [s, setS] = useState<Settings | null>(null);
  const [recipients, setRecipients] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<Settings>("/api/admin/settings/eod-email", { noCache: true })
      .then((r) => {
        setS(r);
        setRecipients((r.recipients || []).join(", "));
      })
      .catch(() => setS(null));
  }, []);

  if (!s) return null;

  const save = async () => {
    setSaving(true);
    try {
      const saved = await api<Settings>("/api/admin/settings/eod-email", {
        method: "PUT",
        body: JSON.stringify({
          enabled: s.enabled,
          send_hour: s.send_hour,
          recipients: recipients.split(",").map((x) => x.trim()).filter(Boolean),
        }),
      });
      setS(saved);
      setRecipients(saved.recipients.join(", "));
      toast.success("Day-end email settings saved");
    } catch (e) {
      toast.error((e as Error)?.message || "Couldn't save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <label className="flex cursor-pointer items-center gap-2.5">
        <input
          type="checkbox"
          disabled={!canEdit}
          checked={s.enabled}
          onChange={(e) => setS({ ...s, enabled: e.target.checked })}
          className="h-4 w-4 accent-slate-900"
        />
        <span className="text-sm font-bold text-slate-800">Email the day-end report automatically</span>
      </label>
      <label className="text-xs">
        <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Send after</span>
        <select
          disabled={!canEdit}
          value={s.send_hour}
          onChange={(e) => setS({ ...s, send_hour: Number(e.target.value) })}
          className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
        >
          {Array.from({ length: 24 }, (_, h) => (
            <option key={h} value={h}>{String(h).padStart(2, "0")}:00 IST</option>
          ))}
        </select>
      </label>
      <label className="min-w-[260px] flex-1 text-xs">
        <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Recipients (up to 5, comma separated)</span>
        <input
          disabled={!canEdit}
          value={recipients}
          onChange={(e) => setRecipients(e.target.value)}
          placeholder="owner@example.com, accountant@example.com"
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
      </label>
      {canEdit ? (
        <button onClick={() => void save()} disabled={saving} className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-black text-white hover:bg-slate-800 disabled:opacity-50">
          {saving ? "Saving…" : "Save"}
        </button>
      ) : (
        <span className="text-[11px] font-medium text-slate-400">Only the owner can change this.</span>
      )}
    </div>
  );
}
