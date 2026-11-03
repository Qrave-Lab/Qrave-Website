"use client";

import { api, requestManagerPin } from "@/app/lib/api";
import React, { useState } from "react";
import { toast } from "react-hot-toast";

export type VoidableItem = {
  orderId: string;
  menuItemId: string;
  variantId?: string | null;
  name: string;
  quantity: number;
};

const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

/**
 * Void items that were already served. Needs a reason and (unless the signed-in
 * user is an owner/manager) a manager PIN. Stock is either written off as
 * waste or returned to inventory.
 */
export default function VoidItemsDialog({
  items,
  onClose,
  onDone,
}: {
  items: VoidableItem[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [qty, setQty] = useState<Record<number, number>>({});
  const [reason, setReason] = useState("");
  const [action, setAction] = useState<"write_off" | "return">("write_off");
  const [busy, setBusy] = useState(false);

  const chosen = items
    .map((it, i) => ({ it, q: qty[i] || 0 }))
    .filter((x) => x.q > 0);
  const valid = chosen.length > 0 && reason.trim().length > 0;

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    // one request per order
    const byOrder = new Map<string, typeof chosen>();
    chosen.forEach((c) => byOrder.set(c.it.orderId, [...(byOrder.get(c.it.orderId) || []), c]));

    const send = async (pin?: string) => {
      for (const [orderId, lines] of byOrder) {
        await api(`/api/admin/orders/${orderId}/void-items`, {
          method: "POST",
          headers: pin ? { "X-Manager-Pin": pin } : {},
          body: JSON.stringify({
            reason: reason.trim(),
            inventory_action: action,
            items: lines.map((l) => ({
              menu_item_id: l.it.menuItemId,
              variant_id: l.it.variantId || ZERO_UUID,
              quantity: l.q,
            })),
          }),
        });
        byOrder.delete(orderId); // don't resend on a PIN retry
      }
    };
    try {
      try {
        await send();
      } catch (err) {
        if (!((err as Error)?.message || "").includes("MANAGER_PIN_REQUIRED")) throw err;
        const pin = await requestManagerPin();
        if (!pin) {
          toast.error("Manager PIN is required to void items");
          return;
        }
        await send(pin);
      }
      toast.success("Items voided");
      onDone();
    } catch (err) {
      toast.error((err as Error)?.message || "Void failed");
    } finally {
      setBusy(false);
    }
  };

  const label = "text-[10px] font-black uppercase tracking-widest text-slate-400";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col gap-4 rounded-3xl bg-white p-6 shadow-2xl">
        <h3 className="text-base font-black uppercase tracking-wider text-slate-900">Void served items</h3>
        <div className="flex-1 space-y-2 overflow-y-auto">
          {items.length === 0 ? (
            <p className="text-xs text-slate-500">No served items on this bill. Cancel unserved items from Order Management instead.</p>
          ) : (
            items.map((it, i) => (
              <div key={i} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2">
                <span className="text-sm font-semibold text-slate-800">
                  {it.name} <span className="text-xs font-medium text-slate-400">×{it.quantity}</span>
                </span>
                <select
                  value={qty[i] || 0}
                  onChange={(e) => setQty({ ...qty, [i]: Number(e.target.value) })}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                >
                  {Array.from({ length: it.quantity + 1 }, (_, n) => (
                    <option key={n} value={n}>{n === 0 ? "Keep" : `Void ${n}`}</option>
                  ))}
                </select>
              </div>
            ))
          )}
        </div>
        <div>
          <label className={label}>Reason (required)</label>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Customer complaint, wrong dish, kitchen error…"
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-[#fe5c13] focus:outline-none focus:ring-4 focus:ring-[#fe5c13]/10" />
        </div>
        <div>
          <label className={label}>Stock</label>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {([["write_off", "Wasted (write off)"], ["return", "Return to stock"]] as const).map(([id, name]) => (
              <button key={id} type="button" onClick={() => setAction(id)}
                className={`rounded-xl border py-2 text-xs font-bold ${action === id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                {name}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-3 border-t border-slate-100 pt-4">
          <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={() => void submit()} disabled={!valid || busy}
            className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-40">
            {busy ? "Voiding…" : "Void items"}
          </button>
        </div>
      </div>
    </div>
  );
}
