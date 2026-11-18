"use client";

import { api } from "@/app/lib/api";
import { CheckCircle2, ClipboardCheck, ClipboardList, Search, X, XCircle } from "lucide-react";
import {
  BTN_PRIMARY, BTN_SECONDARY, CARD, DIALOG, ICON_BTN, INPUT, OVERLAY, THEAD_ROW, TBODY, TR,
  EmptyState, Pill, SectionHeader, type Tone,
} from "./ui";
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

const STATUS: Record<string, { tone: Tone; label: string }> = {
  pending: { tone: "amber", label: "Awaiting approval" },
  approved: { tone: "emerald", label: "Approved" },
  rejected: { tone: "rose", label: "Rejected" },
};
const statusOf = (s: string) =>
  STATUS[s] || { tone: "neutral" as Tone, label: s ? s.charAt(0).toUpperCase() + s.slice(1) : "Unknown" };

const when = (d: string) =>
  new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

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
    <div className="px-8 py-6">
      <SectionHeader
        title="Stock take"
        description="Count what's on the shelf. Stock only changes once a manager approves the count."
      >
        <div className="relative w-56">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search ingredient"
            aria-label="Search ingredient"
            className={`${INPUT} pl-9 text-[13px]`}
          />
        </div>
        <button onClick={submit} disabled={entered.length === 0 || saving} className={BTN_PRIMARY}>
          <ClipboardCheck className="h-4 w-4" />
          {saving ? "Submitting" : entered.length > 0 ? `Submit count (${entered.length})` : "Submit count"}
        </button>
      </SectionHeader>

      <section className={CARD}>
        {rows.length === 0 ? (
          query.trim() ? (
            <EmptyState icon={<Search className="h-6 w-6" />} title="No ingredients match your search" />
          ) : (
            <EmptyState icon={<ClipboardList className="h-6 w-6" />} title="No ingredients to count" body="Ingredients appear here once you've received stock." />
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className={THEAD_ROW}>
                  <th className="px-5 py-3 font-medium">Ingredient</th>
                  <th className="px-5 py-3 text-right font-medium">On system</th>
                  <th className="px-5 py-3 font-medium">Reorder level</th>
                  <th className="px-5 py-3 font-medium">Counted</th>
                  <th className="px-5 py-3 text-right font-medium">Difference</th>
                </tr>
              </thead>
              <tbody className={TBODY}>
                {rows.map((item) => {
                  const raw = counts[item.ingredient_id];
                  const diff = raw === undefined || raw === "" ? null : Number(raw) - item.stock;
                  return (
                    <tr key={item.ingredient_id} className={`${TR} text-[13px]`}>
                      <td className="px-5 py-3 text-[14px] font-semibold text-[#0F1117]">{item.ingredient}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-[#0F1117]">
                        {item.stock}
                        {item.unit && <span className="ml-1 text-[#9CA3AF]">{item.unit}</span>}
                      </td>
                      <td className="px-5 py-3">
                        <span className="tabular-nums text-[#4B5563]">{item.reorder_threshold}</span>
                        <button
                          onClick={() => onEditPar(item)}
                          className="ml-2 rounded-md px-1.5 py-0.5 text-[12px] font-medium text-[#6B7280] underline decoration-[#D6D6CF] underline-offset-2 transition-colors hover:text-[#0F1117] hover:decoration-[#0F1117]"
                        >
                          Change
                        </button>
                      </td>
                      <td className="px-5 py-2">
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          placeholder="Enter count"
                          aria-label={`Counted ${item.ingredient}`}
                          value={raw ?? ""}
                          onChange={(e) => setCounts({ ...counts, [item.ingredient_id]: e.target.value })}
                          className="h-9 w-32 rounded-lg border border-[#E8E8E3] bg-white px-3 text-[13px] tabular-nums text-[#0F1117] outline-none transition-colors placeholder:text-[#9CA3AF] hover:border-[#D6D6CF] focus:border-[#fe5c13]"
                        />
                      </td>
                      <td className="px-5 py-3 text-right font-semibold tabular-nums">
                        {diff === null ? (
                          <span className="text-[#C4C4BE]">—</span>
                        ) : diff === 0 ? (
                          <span className="text-emerald-700">Matches</span>
                        ) : (
                          <span className={diff < 0 ? "text-rose-600" : "text-amber-700"}>
                            {diff > 0 ? "+" : "−"}
                            {Math.abs(Math.round(diff * 1000) / 1000)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {entered.length > 0 && (
          <div className="border-t border-[#F0F0EB] bg-[#FAFAF7] px-5 py-3">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note for the reviewer, e.g. weekly count or after the festival rush"
              aria-label="Note for the reviewer"
              className={`${INPUT} max-w-xl text-[13px]`}
            />
          </div>
        )}
      </section>

      <section className="mt-8">
        <h3 className="mb-3 text-[15px] font-semibold text-[#0F1117]">Count history</h3>
        {history.length === 0 ? (
          <p className="text-[13px] text-[#9CA3AF]">No counts submitted yet.</p>
        ) : (
          <div className={`${CARD} divide-y divide-[#F0F0EB]`}>
            {history.map((c) => {
              const st = statusOf(c.status);
              return (
                <button
                  key={c.id}
                  onClick={() => void openCount(c)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-3.5 text-left transition-colors hover:bg-[#FAFAF7]"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[#0F1117]">
                      <span className="tabular-nums">{when(c.created_at)}</span>
                      <span className="font-normal text-[#6B7280]"> by {c.counted_by || "Staff"}</span>
                    </p>
                    <p className="mt-0.5 truncate text-[12px] text-[#6B7280]">
                      {c.line_count} {c.line_count === 1 ? "item" : "items"} counted{c.note ? `. ${c.note}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span
                      className={`text-[13px] font-semibold tabular-nums ${c.variance_value < 0 ? "text-rose-600" : c.variance_value > 0 ? "text-amber-700" : "text-[#9CA3AF]"}`}
                    >
                      {c.variance_value === 0
                        ? "No difference"
                        : `${c.variance_value < 0 ? "−" : "+"}${inr(c.variance_value)}`}
                    </span>
                    <Pill tone={st.tone}>{st.label}</Pill>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {open && (
        <div className={OVERLAY} role="dialog" aria-modal="true" aria-label="Review stock count">
          <div className={`${DIALOG} flex max-h-[90vh] max-w-2xl flex-col p-6`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-[17px] font-bold text-[#0F1117]">Stock count</h3>
                  <Pill tone={statusOf(open.status).tone}>{statusOf(open.status).label}</Pill>
                </div>
                <p className="mt-1 text-[13px] text-[#6B7280]">
                  Counted by {open.counted_by || "Staff"} on <span className="tabular-nums">{when(open.created_at)}</span>
                  {open.reviewed_by ? `. Reviewed by ${open.reviewed_by}` : ""}
                </p>
              </div>
              <button onClick={() => setOpen(null)} className={`${ICON_BTN} -mr-2 -mt-1`} aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-5 flex-1 overflow-y-auto rounded-xl border border-[#E8E8E3]">
              <table className="w-full text-left text-[13px]">
                <thead className="sticky top-0 bg-white">
                  <tr className={THEAD_ROW}>
                    <th className="px-4 py-2.5 font-medium">Ingredient</th>
                    <th className="px-4 py-2.5 text-right font-medium">On system</th>
                    <th className="px-4 py-2.5 text-right font-medium">Counted</th>
                    <th className="px-4 py-2.5 text-right font-medium">Difference</th>
                    <th className="px-4 py-2.5 text-right font-medium">Value</th>
                  </tr>
                </thead>
                <tbody className={TBODY}>
                  {(open.lines || []).map((l) => (
                    <tr key={l.ingredient_id}>
                      <td className="px-4 py-2.5 font-semibold text-[#0F1117]">{l.ingredient}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-[#4B5563]">{l.system_qty} {l.unit}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-[#0F1117]">{l.counted_qty} {l.unit}</td>
                      <td className={`px-4 py-2.5 text-right font-semibold tabular-nums ${l.difference < 0 ? "text-rose-600" : l.difference > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                        {l.difference === 0 ? "Matches" : `${l.difference > 0 ? "+" : "−"}${Math.abs(l.difference)}`}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-[#6B7280]">
                        {l.difference === 0 ? "—" : `${l.difference < 0 ? "−" : "+"}${inr(l.difference * l.cost_per_unit)}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {open.review_reason && (
              <p className="mt-3 rounded-lg bg-[#F3F3EF] px-3 py-2 text-[12px] text-[#4B5563]">Reviewer note: {open.review_reason}</p>
            )}
            {open.status === "pending" && canReview ? (
              <div className="mt-5 space-y-3">
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason (needed if you reject)"
                  aria-label="Review reason"
                  className={`${INPUT} text-[13px]`}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => void review(false)}
                    disabled={reviewing}
                    className={`${BTN_SECONDARY} flex-1 !text-rose-700 hover:!border-rose-200 hover:!bg-rose-50`}
                  >
                    <XCircle className="h-4 w-4" /> Reject
                  </button>
                  <button onClick={() => void review(true)} disabled={reviewing} className={`${BTN_PRIMARY} flex-1`}>
                    <CheckCircle2 className="h-4 w-4" /> Approve and update stock
                  </button>
                </div>
              </div>
            ) : open.status === "pending" ? (
              <p className="mt-5 text-[13px] text-[#6B7280]">Waiting for a manager to approve this count.</p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
