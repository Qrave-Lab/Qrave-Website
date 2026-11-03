"use client";

import { useState } from "react";
import { Gift, Loader2 } from "lucide-react";
import { api } from "@/app/lib/api";
import { rewardLabel } from "@/app/components/billing/LoyaltyPanel";

export type TakeawayReward = {
  id: string;
  name: string;
  unit: "points" | "stamps";
  cost: number;
  reward_kind: "fixed" | "percent" | "free_item";
  reward_value: string | number;
  can_redeem: boolean;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * The order's money after a reward, worked out the same way as the server
 * (repository.TakeawayReward): the reward comes off the subtotal and GST
 * shrinks in step with what's left to tax.
 */
export function takeawayRewardTotals(subtotal: number, tax: number, deliveryFee: number, reward: TakeawayReward | null) {
  const taxRounded = round2(tax);
  if (!reward || subtotal <= 0) {
    return { discount: 0, tax: taxRounded, total: round2(subtotal + taxRounded + deliveryFee) };
  }
  const v = Number(reward.reward_value);
  const raw = reward.reward_kind === "percent" ? (subtotal * v) / 100 : v;
  const discount = round2(Math.min(raw, subtotal));
  const newTax = round2((taxRounded * (subtotal - discount)) / subtotal);
  return { discount, tax: newTax, total: round2(subtotal - discount + newTax + deliveryFee) };
}

/** Takes the chosen reward off a just-created takeaway order. Returns the new total. */
export async function redeemOnTakeaway(orderId: string, phone: string, rewardId: string): Promise<number | undefined> {
  const res = await api<{ new_total?: string | number }>(`/api/admin/crm/loyalty/takeaway/${orderId}/redeem`, {
    method: "POST",
    body: JSON.stringify({ reward_id: rewardId, phone }),
  });
  return res.new_total !== undefined ? Number(res.new_total) : undefined;
}

type Lookup = {
  program: { is_active: boolean; mode: "points" | "stamps" };
  found: boolean;
  card?: { full_name: string };
  balance: number;
  rewards: TakeawayReward[];
};

/**
 * "Use a reward" for the takeaway order form. Key it by the phone number so it
 * resets when the number changes.
 */
export default function TakeawayRewardPicker({
  phone,
  value,
  onChange,
}: {
  phone: string;
  value: TakeawayReward | null;
  onChange: (reward: TakeawayReward | null) => void;
}) {
  const [data, setData] = useState<Lookup | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (phone.replace(/\D/g, "").length < 8) return null;

  const check = async () => {
    setBusy(true);
    setError("");
    try {
      setData(await api<Lookup>(`/api/admin/crm/loyalty/lookup?phone=${encodeURIComponent(phone)}`, { noCache: true }));
    } catch (e) {
      setError((e as Error).message || "Couldn't check the loyalty card.");
    } finally {
      setBusy(false);
    }
  };

  if (!data) {
    return (
      <div className="mt-1.5">
        <button
          type="button"
          onClick={check}
          disabled={busy}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Gift className="w-3 h-3" />}
          Check loyalty rewards
        </button>
        {error && <p className="text-[11px] text-rose-600">{error}</p>}
      </div>
    );
  }

  if (!data.program?.is_active) return null;
  if (!data.found) return <p className="mt-1.5 text-[11px] text-slate-500">Not a loyalty member yet.</p>;

  const unit = data.program.mode === "stamps" ? "stamps" : "points";
  const usable = data.rewards.filter((r) => r.can_redeem);
  return (
    <div className="mt-1.5 space-y-1">
      <p className="text-[11px] text-slate-600">
        {data.card?.full_name || "Member"} has <span className="font-bold">{data.balance}</span> {unit}.
      </p>
      {usable.length > 0 ? (
        <select
          value={value?.id || ""}
          onChange={(e) => onChange(usable.find((r) => r.id === e.target.value) || null)}
          aria-label="Use a reward"
          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
        >
          <option value="">No reward</option>
          {usable.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}: {rewardLabel(r)} ({r.cost} {unit})
            </option>
          ))}
        </select>
      ) : (
        <p className="text-[11px] text-slate-400">No rewards ready yet.</p>
      )}
    </div>
  );
}
