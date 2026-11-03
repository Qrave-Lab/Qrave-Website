"use client";

import { api } from "@/app/lib/api";
import { CheckCircle2, ClipboardCheck, XCircle } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";

type Stock = {
  ingredient_id: string;
  ingredient: string;
  stock: number;
  reorder_threshold: number;
  unit?: string;
};

type CountLine = {
  ingredient_id: string;
  ingredient: string;
  unit: string;
  system_qty: number;
  counted_qty: number;
  difference: number;
  cost_per_unit: number;
};

type Count = {
  id: string;
  status: string;
  note: string;
  counted_by: string;
  reviewed_by: string;
  review_reason: string;
  created_at: string;
  line_count: number;
  variance_value: number;
  lines?: CountLine[];
};

const inr = (n: number) =>
  `₹${Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-100",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-100",
  rejected: "bg-rose-50 text-rose-700 border-rose-100",
};

export default function StockTakePanel({
  stocks,
  canReview,
  onEditPar,
  onChanged,
}: {
  stocks: Stock[];
  canReview: boolean;
  onEditPar: (s: Stock) => void;
  onChanged: () => void;
}) {
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<Count[]>([]);
  const [open, setOpen] = useState<Count | null>(null);
  const [reason, setReason] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [query, setQuery] = useState("");

  const loadHistory = useCallback(async () => {
    try {
      const res = await api<{ counts: Count[] }>(
        "/api/admin/inventory/advanced/counts",
        { noCache: true },
      );
      setHistory(res?.counts || []);
    } catch {
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const entered = useMemo(
    () => Object.entries(counts).filter(([, v]) => v !== "" && !isNaN(Number(v))),
    [counts],
  );

  const rows = stocks.filter((s) =>
    s.ingredient.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const submit = async () => {
    if (entered.some(([, v]) => Number(v) < 0)) {
      toast.error("Counts can't be negative");
      return;
    }
    setSaving(true);
    try {
      await api("/api/admin/inventory/advanced/counts", {
        method: "POST",
        body: JSON.stringify({
          note: note.trim(),
          lines: entered.map(([id, v]) => ({
            ingredient_id: id,
            counted_qty: Number(v),
          })),
        }),
      });
      toast.success(
        canReview
          ? "Count submitted — review it below to apply"
          : "Count submitted for manager approval",
      );
      setCounts({});
      setNote("");
      await loadHistory();
    } catch (e) {
      toast.error((e as Error)?.message || "Failed to submit count");
    } finally {
      setSaving(false);
    }
  };

  const openCount = async (c: Count) => {
    setReason("");
    try {
      setOpen(
        await api<Count>(`/api/admin/inventory/advanced/counts/${c.id}`, {
          noCache: true,
        }),
      );
    } catch {
      toast.error("Couldn't load that count");
    }
  };

  const review = async (approve: boolean) => {
    if (!open) return;
    if (!approve && !reason.trim()) {
      toast.error("Add a reason for rejecting");
      return;
    }
    setReviewing(true);
    try {
      await api(`/api/admin/inventory/advanced/counts/${open.id}/review`, {
        method: "POST",
        body: JSON.stringify({ approve, reason: reason.trim() }),
      });
      toast.success(approve ? "Count approved — stock updated" : "Count rejected");
      setOpen(null);
      await loadHistory();
      onChanged();
    } catch (e) {
      toast.error((e as Error)?.message || "Review failed");
    } finally {
      setReviewing(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col animate-in fade-in duration-200">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-100 bg-white px-8 py-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Physical stock count
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Count what&apos;s on the shelf. Stock only changes after a manager
            approves the count.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search ingredient"
            className="w-48 rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
          <button
            onClick={submit}
            disabled={entered.length === 0 || saving}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 disabled:opacity-50"
          >
            <ClipboardCheck className="h-4 w-4" />
            {saving ? "Submitting…" : `Submit count (${entered.length})`}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm text-slate-600">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-xs font-bold uppercase tracking-wider text-slate-500">
              <th className="px-8 py-3.5">Ingredient</th>
              <th className="px-8 py-3.5">System stock</th>
              <th className="px-8 py-3.5">Reorder level</th>
              <th className="px-8 py-3.5">Physical count</th>
              <th className="px-8 py-3.5">Difference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((item) => {
              const raw = counts[item.ingredient_id];
              const diff =
                raw === undefined || raw === "" ? null : Number(raw) - item.stock;
              return (
                <tr key={item.ingredient_id} className="transition-colors hover:bg-slate-50/50">
                  <td className="px-8 py-3.5 font-semibold text-slate-950">{item.ingredient}</td>
                  <td className="px-8 py-3.5 font-mono">{item.stock}</td>
                  <td className="px-8 py-3.5">
                    <span className="font-mono">{item.reorder_threshold}</span>{" "}
                    <button
                      onClick={() => onEditPar(item)}
                      className="ml-2 text-xs font-medium text-blue-600 hover:text-blue-700"
                    >
                      Edit
                    </button>
                  </td>
                  <td className="px-8 py-3.5">
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      placeholder="Count…"
                      value={raw ?? ""}
                      onChange={(e) =>
                        setCounts({ ...counts, [item.ingredient_id]: e.target.value })
                      }
                      className="w-36 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
                    />
                  </td>
                  <td className="px-8 py-3.5 font-mono font-bold">
                    {diff === null ? (
                      <span className="text-slate-300">--</span>
                    ) : diff === 0 ? (
                      <span className="text-emerald-600">OK</span>
                    ) : (
                      <span className={diff < 0 ? "text-rose-600" : "text-amber-600"}>
                        {diff > 0 ? "+" : ""}
                        {Math.round(diff * 1000) / 1000}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {entered.length > 0 && (
        <div className="border-t border-slate-100 bg-slate-50/60 px-8 py-4">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note for the reviewer (e.g. weekly count, after festival rush)"
            className="w-full max-w-xl rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      )}

      <div className="border-t border-slate-200 px-8 py-6">
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">
          Count history
        </h3>
        {history.length === 0 ? (
          <p className="mt-3 text-xs text-slate-400">No counts submitted yet.</p>
        ) : (
          <div className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
            {history.map((c) => (
              <button
                key={c.id}
                onClick={() => void openCount(c)}
                className="flex w-full items-center justify-between gap-4 bg-white px-5 py-3.5 text-left text-xs transition-colors hover:bg-slate-50"
              >
                <div>
                  <p className="font-bold text-slate-900">
                    {new Date(c.created_at).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · {c.counted_by || "Staff"}
                  </p>
                  <p className="mt-0.5 text-slate-500">
                    {c.line_count} items{c.note ? ` · ${c.note}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`font-mono font-bold ${c.variance_value < 0 ? "text-rose-600" : c.variance_value > 0 ? "text-amber-600" : "text-slate-400"}`}
                  >
                    {c.variance_value === 0
                      ? "No variance"
                      : `${c.variance_value < 0 ? "−" : "+"}${inr(c.variance_value)}`}
                  </span>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${STATUS_STYLE[c.status] || "bg-slate-50 text-slate-600 border-slate-200"}`}
                  >
                    {c.status}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl bg-white p-7 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Stock count review</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {open.counted_by} · {new Date(open.created_at).toLocaleString("en-IN")}
                  {open.reviewed_by ? ` · reviewed by ${open.reviewed_by}` : ""}
                </p>
              </div>
              <button onClick={() => setOpen(null)} className="text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>
            <div className="mt-4 flex-1 overflow-y-auto rounded-2xl border border-slate-100">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <th className="px-4 py-2.5">Ingredient</th>
                    <th className="px-4 py-2.5 text-right">System</th>
                    <th className="px-4 py-2.5 text-right">Counted</th>
                    <th className="px-4 py-2.5 text-right">Diff</th>
                    <th className="px-4 py-2.5 text-right">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(open.lines || []).map((l) => (
                    <tr key={l.ingredient_id}>
                      <td className="px-4 py-2.5 font-semibold text-slate-800">{l.ingredient}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{l.system_qty} {l.unit}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{l.counted_qty} {l.unit}</td>
                      <td className={`px-4 py-2.5 text-right font-mono font-bold ${l.difference < 0 ? "text-rose-600" : l.difference > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                        {l.difference > 0 ? "+" : ""}{l.difference}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-500">
                        {l.difference === 0 ? "--" : `${l.difference < 0 ? "−" : "+"}${inr(l.difference * l.cost_per_unit)}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {open.review_reason && (
              <p className="mt-3 text-xs text-slate-500">Reviewer note: {open.review_reason}</p>
            )}
            {open.status === "pending" && canReview ? (
              <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason (required to reject)"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => void review(false)}
                    disabled={reviewing}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" /> Reject
                  </button>
                  <button
                    onClick={() => void review(true)}
                    disabled={reviewing}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Approve &amp; update stock
                  </button>
                </div>
              </div>
            ) : open.status === "pending" ? (
              <p className="mt-4 border-t border-slate-100 pt-4 text-xs font-medium text-slate-500">
                Waiting for a manager to approve this count.
              </p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
