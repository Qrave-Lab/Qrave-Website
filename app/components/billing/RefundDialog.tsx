"use client";

import { api, requestManagerPin } from "@/app/lib/api";
import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

type RefundableOrder = {
  order_id: string;
  order_number: number;
  created_at: string;
  refundable: number;
};

const inr = (n: number) =>
  `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Refund against a settled dine-in order. Refunds are logged as a negative
 * payment, so shift cash and sales reports net them out. Staff who aren't
 * owners/managers need a manager PIN.
 */
export default function RefundDialog({
  sessionId,
  kind = "dine_in",
  onClose,
  onDone,
}: {
  sessionId: string;
  kind?: "dine_in" | "takeaway";
  onClose: () => void;
  onDone: () => void;
}) {
  const [orders, setOrders] = useState<RefundableOrder[] | null>(null);
  const [orderId, setOrderId] = useState("");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"cash" | "upi" | "card">("cash");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const load =
      kind === "takeaway"
        ? api<{ order_id: string; refundable: number }>(
            `/api/admin/history/takeaway/${sessionId}/refundable`,
            { noCache: true },
          ).then((r) => ({
            orders: [{ order_id: r.order_id, order_number: 0, created_at: "", refundable: r.refundable }],
          }))
        : api<{ orders: RefundableOrder[] }>(
            `/api/admin/history/sessions/${sessionId}/refundable`,
            { noCache: true },
          );
    load
      .then((r) => {
        const list = (r?.orders || []).filter((o) => o.refundable > 0);
        setOrders(list);
        if (list.length === 1) {
          setOrderId(list[0].order_id);
          setAmount(String(list[0].refundable));
        }
      })
      .catch(() => setOrders([]));
  }, [sessionId, kind]);

  const selected = orders?.find((o) => o.order_id === orderId);
  const amt = parseFloat(amount);
  const valid =
    !!selected && !isNaN(amt) && amt > 0 && amt <= selected.refundable && reason.trim().length > 0;

  const submit = async () => {
    if (!selected || !valid) return;
    setBusy(true);
    const send = (pin?: string) =>
      api(`/api/admin/orders/${selected.order_id}/refund`, {
        method: "POST",
        headers: pin ? { "X-Manager-Pin": pin } : {},
        body: JSON.stringify({ amount: amt, reason: reason.trim(), payment_mode: mode }),
      });
    try {
      try {
        await send();
      } catch (err) {
        if (!((err as Error)?.message || "").includes("MANAGER_PIN_REQUIRED")) throw err;
        const pin = await requestManagerPin();
        if (!pin) {
          toast.error("Manager PIN is required for refunds");
          return;
        }
        await send(pin);
      }
      toast.success(`Refunded ${inr(amt)}`);
      onDone();
    } catch (err) {
      toast.error((err as Error)?.message || "Refund failed");
    } finally {
      setBusy(false);
    }
  };

  const field =
    "mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-[#fe5c13] focus:outline-none focus:ring-4 focus:ring-[#fe5c13]/10";
  const label = "text-[10px] font-black uppercase tracking-widest text-slate-400";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm space-y-4 rounded-3xl bg-white p-6 shadow-2xl">
        <h3 className="text-base font-black uppercase tracking-wider text-slate-900">Refund payment</h3>
        {orders === null ? (
          <p className="text-xs text-slate-400">Loading orders…</p>
        ) : orders.length === 0 ? (
          <p className="text-xs font-medium text-slate-500">Nothing left to refund on this bill.</p>
        ) : (
          <>
            <div>
              <label className={label}>Order</label>
              <select
                value={orderId}
                onChange={(e) => {
                  setOrderId(e.target.value);
                  const o = orders.find((x) => x.order_id === e.target.value);
                  setAmount(o ? String(o.refundable) : "");
                }}
                className={field}
              >
                <option value="">Select order…</option>
                {orders.map((o) => (
                  <option key={o.order_id} value={o.order_id}>
                    {kind === "takeaway" ? "Takeaway order" : `#${o.order_number || o.order_id.slice(0, 6)}`} · refundable {inr(o.refundable)}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Amount (₹)</label>
                <input type="number" step="0.01" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} className={field} />
              </div>
              <div>
                <label className={label}>Refund via</label>
                <select value={mode} onChange={(e) => setMode(e.target.value as "cash" | "upi" | "card")} className={field}>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                </select>
              </div>
            </div>
            {selected && !isNaN(amt) && amt > selected.refundable && (
              <p className="text-xs font-bold text-rose-600">Can&apos;t refund more than {inr(selected.refundable)}.</p>
            )}
            <div>
              <label className={label}>Reason (required)</label>
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Wrong item, cold food, overcharge…" className={field} />
            </div>
          </>
        )}
        <div className="flex gap-3 border-t border-slate-100 pt-4">
          <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50">
            Close
          </button>
          <button
            onClick={() => void submit()}
            disabled={!valid || busy}
            className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-40"
          >
            {busy ? "Refunding…" : "Refund"}
          </button>
        </div>
      </div>
    </div>
  );
}
