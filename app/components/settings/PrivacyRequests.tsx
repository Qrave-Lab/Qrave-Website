"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import ConfirmModal from "@/app/components/ui/ConfirmModal";
import { api } from "@/app/lib/api";

type PrivacyRequest = {
  id: string;
  phone: string;
  request_type: "erase" | "export" | "correction";
  note?: string;
  status: string;
  created_at: string;
  resolved_at?: string | null;
  resolution_note?: string | null;
};

const TYPE_LABEL: Record<string, string> = { erase: "Erase data", export: "Copy of data", correction: "Correction" };

/** Guest-submitted data requests (DPDP). Owner/manager only; the API enforces it. */
export default function PrivacyRequests() {
  const [pending, setPending] = useState<PrivacyRequest[] | null>(null);
  const [resolved, setResolved] = useState<PrivacyRequest[]>([]);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [target, setTarget] = useState<{ req: PrivacyRequest; action: "complete" | "reject" } | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, c, r] = await Promise.all([
        api<{ requests: PrivacyRequest[] }>("/api/admin/privacy/requests?status=pending"),
        api<{ requests: PrivacyRequest[] }>("/api/admin/privacy/requests?status=completed").catch(() => ({ requests: [] })),
        api<{ requests: PrivacyRequest[] }>("/api/admin/privacy/requests?status=rejected").catch(() => ({ requests: [] })),
      ]);
      setPending(p?.requests || []);
      setResolved([...(c?.requests || []), ...(r?.requests || [])].sort((a, b) => (b.resolved_at || "").localeCompare(a.resolved_at || "")));
      setError("");
    } catch (e) {
      setPending([]);
      setError(e instanceof Error ? e.message : "Couldn't load privacy requests");
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  const resolve = async () => {
    if (!target) return;
    const { req, action } = target;
    try {
      await api(`/api/admin/privacy/requests/${req.id}/resolve`, {
        method: "POST",
        body: JSON.stringify({ action, note: (notes[req.id] || "").trim() }),
      });
      toast.success(action === "complete" ? "Request completed" : "Request rejected");
      setTarget(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't update the request");
      setTarget(null);
    }
  };

  const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("en-IN") : "");
  const isErase = target?.req.request_type === "erase" && target.action === "complete";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="privacy-requests-title">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-[#fe5c13]" aria-hidden />
        <h2 id="privacy-requests-title" className="text-sm font-black text-slate-900">Privacy requests</h2>
      </div>
      <p className="mt-1 text-xs font-medium text-slate-500">Requests guests submitted from the &quot;Your data&quot; page.</p>

      {pending === null ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
      ) : error ? (
        <p className="mt-4 text-sm text-rose-600">{error}</p>
      ) : pending.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No pending requests.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {pending.map((r) => (
            <li key={r.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-slate-900">{TYPE_LABEL[r.request_type] || r.request_type} · {r.phone}</p>
                <span className="text-xs text-slate-400">{when(r.created_at)}</span>
              </div>
              {r.note && <p className="mt-1 text-sm text-slate-600">&ldquo;{r.note}&rdquo;</p>}
              <label htmlFor={`pr-note-${r.id}`} className="mt-3 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Resolution note (optional)</label>
              <input
                id={`pr-note-${r.id}`}
                value={notes[r.id] || ""}
                onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
                className="mt-1 min-h-[40px] w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#fe5c13]"
              />
              <div className="mt-3 flex gap-2">
                <button onClick={() => setTarget({ req: r, action: "complete" })} className="min-h-[40px] rounded-lg bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">Complete</button>
                <button onClick={() => setTarget({ req: r, action: "reject" })} className="min-h-[40px] rounded-lg border border-slate-200 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-700">Reject</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {resolved.length > 0 && (
        <details className="mt-5">
          <summary className="cursor-pointer text-xs font-bold text-slate-500">Resolved ({resolved.length})</summary>
          <ul className="mt-2 space-y-2">
            {resolved.map((r) => (
              <li key={r.id} className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                <span className="font-bold">{TYPE_LABEL[r.request_type] || r.request_type}</span> · {r.phone} · {r.status} {when(r.resolved_at)}
                {r.resolution_note && <span className="block text-slate-500">{r.resolution_note}</span>}
              </li>
            ))}
          </ul>
        </details>
      )}

      <ConfirmModal
        open={Boolean(target)}
        title={target?.action === "complete" ? "Complete this request?" : "Reject this request?"}
        message={
          isErase
            ? "This will erase the diner's personal data for this phone number. This cannot be undone."
            : target?.action === "complete"
              ? "Mark this request as completed. Make sure you have handled it."
              : "Mark this request as rejected."
        }
        confirmText={target?.action === "complete" ? "Complete" : "Reject"}
        destructive={isErase || target?.action === "reject"}
        onConfirm={resolve}
        onClose={() => setTarget(null)}
      />
    </section>
  );
}
