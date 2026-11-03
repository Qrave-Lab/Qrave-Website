"use client";

import { useEffect, useState } from "react";
import { Gift, Loader2, Search, UserPlus, Check } from "lucide-react";
import { api, requestManagerPin } from "@/app/lib/api";

export type LoyaltyProgram = {
  is_active: boolean;
  mode: "points" | "stamps";
  points_per_100: string | number;
  min_bill_amount: string | number;
  stamps_per_card: number;
  card_title: string;
  card_color: string;
  welcome_bonus?: number;
  birthday_bonus?: number;
  visit_bonus_every?: number;
  visit_bonus?: number;
  tiers_enabled?: boolean;
  tier_silver_spend?: string | number;
  tier_gold_spend?: string | number;
  tier_platinum_spend?: string | number;
  tier_silver_multiplier?: string | number;
  tier_gold_multiplier?: string | number;
  tier_platinum_multiplier?: string | number;
  referral_enabled?: boolean;
  referral_bonus_referrer?: number;
  referral_bonus_friend?: number;
  winback_days?: number;
  winback_bonus?: number;
  review_prompt?: boolean;
  auto_messages?: boolean;
};

type RewardOption = {
  id: string;
  name: string;
  description: string;
  unit: "points" | "stamps";
  cost: number;
  reward_kind: "fixed" | "percent" | "free_item";
  reward_value: string | number;
  can_redeem: boolean;
  needs: number;
};

type Lookup = {
  program: LoyaltyProgram;
  found: boolean;
  card?: { customer_profile_id: string; full_name: string; phone: string; visit_count: number };
  balance: number;
  rewards: RewardOption[];
  applied?: { id: string; reward_name: string; discount_amount: string | number }[];
  tier?: string;
};

const tierStyle: Record<string, string> = {
  bronze: "bg-amber-100 text-amber-900",
  silver: "bg-slate-200 text-slate-800",
  gold: "bg-yellow-100 text-yellow-900",
  platinum: "bg-indigo-100 text-indigo-900",
};

export function rewardLabel(r: { reward_kind: string; reward_value: string | number }) {
  const v = Number(r.reward_value);
  if (r.reward_kind === "percent") return `${v}% off the bill`;
  if (r.reward_kind === "free_item") return `Free item (up to ₹${v})`;
  return `₹${v} off`;
}

function unitWord(unit: string, n: number) {
  if (unit === "stamps") return n === 1 ? "stamp" : "stamps";
  return n === 1 ? "point" : "points";
}

/**
 * Loyalty panel for the payment dialog. Staff find a customer by phone, add
 * them to the bill (points or a stamp land automatically when it's paid) and
 * take a reward off a table bill.
 */
export default function LoyaltyPanel({
  sessionId,
  takeawayOrderId,
  onBillChanged,
}: {
  sessionId?: string;
  takeawayOrderId?: string;
  /** Called after a reward changes the bill. newTotal is set for takeaway orders. */
  onBillChanged?: (info: { newTotal?: number }) => void | Promise<void>;
}) {
  const billId = sessionId || takeawayOrderId || "";
  const [data, setData] = useState<Lookup | null>(null);
  const [linked, setLinked] = useState(false);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [searched, setSearched] = useState(false);

  const billParam = sessionId ? `session_id=${sessionId}` : takeawayOrderId ? `bill_id=${takeawayOrderId}` : "";

  // On open, show the member already on this bill (if any).
  useEffect(() => {
    if (!billId) return;
    let alive = true;
    api<Lookup>(`/api/admin/crm/loyalty/lookup?${billParam}`, { noCache: true, suppressErrorLog: true })
      .then((res) => {
        if (!alive) return;
        setData(res);
        if (res.found) {
          setLinked(true);
          setPhone(res.card?.phone || "");
        }
      })
      .catch(() => alive && setData(null));
    return () => {
      alive = false;
    };
  }, [billId, billParam]);

  if (!data || !data.program?.is_active) return null;
  const unit = data.program.mode === "stamps" ? "stamps" : "points";

  const find = async () => {
    setError("");
    setNotice("");
    if (phone.replace(/\D/g, "").length < 8) {
      setError("Enter the customer's phone number.");
      return;
    }
    setBusy("find");
    try {
      const res = await api<Lookup>(
        `/api/admin/crm/loyalty/lookup?phone=${encodeURIComponent(phone)}${billParam ? `&${billParam}` : ""}`,
        { noCache: true }
      );
      setData(res);
      setSearched(true);
      setLinked(false);
    } catch (e) {
      setError((e as Error).message || "Couldn't look up the customer.");
    } finally {
      setBusy(null);
    }
  };

  const attach = async () => {
    setError("");
    setBusy("attach");
    try {
      const body: Record<string, string> = { phone, name };
      if (sessionId) body.session_id = sessionId;
      else if (takeawayOrderId) body.takeaway_order_id = takeawayOrderId;
      const res = await api<{ member: Lookup; earned: { earned: number; bonus?: number; unit: string; tier_up?: string; welcome?: number } }>(`/api/admin/crm/loyalty/attach`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setData({ ...res.member, applied: data.applied });
      setLinked(true);
      const e = res.earned || ({} as typeof res.earned);
      const parts = [
        e.welcome ? `Welcome bonus: ${e.welcome} ${unitWord(unit, e.welcome)}.` : "",
        e.earned
          ? `Added ${e.earned} ${unitWord(e.unit, e.earned)} for this bill${e.bonus ? ` plus a ${e.bonus} bonus` : ""}.`
          : `Added to this bill. ${unit === "stamps" ? "The stamp" : "Points"} will be added when it's paid.`,
        e.tier_up ? `Now ${e.tier_up[0].toUpperCase()}${e.tier_up.slice(1)}!` : "",
      ];
      setNotice(parts.filter(Boolean).join(" "));
    } catch (e) {
      setError((e as Error).message || "Couldn't add the customer.");
    } finally {
      setBusy(null);
    }
  };

  const redeem = async (reward: RewardOption) => {
    if (!billId) return;
    setError("");
    setNotice("");
    setBusy(reward.id);
    const url = sessionId
      ? `/api/admin/crm/loyalty/sessions/${sessionId}/redeem`
      : `/api/admin/crm/loyalty/takeaway/${takeawayOrderId}/redeem`;
    const send = (pin?: string) =>
      api<{ discount: string | number; balance: number; reward_name: string; new_total?: string | number }>(url, {
        method: "POST",
        headers: pin ? { "X-Manager-Pin": pin } : undefined,
        body: JSON.stringify({ reward_id: reward.id, phone }),
      });
    try {
      let res;
      try {
        res = await send();
      } catch (e) {
        // A printed bill needs a manager PIN to change.
        if (!((e as Error)?.message || "").includes("MANAGER_PIN_REQUIRED")) throw e;
        const pin = await requestManagerPin();
        if (!pin) return;
        res = await send(pin);
      }
      setNotice(`${res.reward_name}: ₹${Number(res.discount).toFixed(2)} taken off the bill.`);
      await onBillChanged?.({ newTotal: res.new_total !== undefined ? Number(res.new_total) : undefined });
      const fresh = await api<Lookup>(
        `/api/admin/crm/loyalty/lookup?phone=${encodeURIComponent(phone)}&${billParam}`,
        { noCache: true }
      );
      setData(fresh);
      setLinked(true);
    } catch (e) {
      setError((e as Error).message || "Couldn't redeem the reward.");
    } finally {
      setBusy(null);
    }
  };

  const card = data.found ? data.card : undefined;
  const perCard = data.program.stamps_per_card || 10;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2.5" data-testid="loyalty-panel">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white" style={{ background: data.program.card_color || "#0f766e" }}>
          <Gift className="w-3.5 h-3.5" />
        </div>
        <span className="text-xs font-bold text-slate-900">Loyalty</span>
        {linked && card && (
          <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
            <Check className="w-3 h-3" /> On this bill
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && find()}
          inputMode="tel"
          placeholder="Customer phone"
          aria-label="Customer phone"
          className="flex-1 min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
        />
        <button
          onClick={find}
          disabled={busy !== null}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {busy === "find" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          Find
        </button>
      </div>

      {searched && !data.found && (
        <div className="space-y-2">
          <p className="text-[11px] text-slate-500">Not a member yet. Add them to start collecting {unit}.</p>
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name (optional)"
              aria-label="Customer name"
              className="flex-1 min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
            <button
              onClick={attach}
              disabled={busy !== null}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {busy === "attach" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
              Add
            </button>
          </div>
        </div>
      )}

      {card && (
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">
                {card.full_name || card.phone}
                {data.tier && (
                  <span className={`ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-bold capitalize ${tierStyle[data.tier] || "bg-slate-100 text-slate-700"}`}>{data.tier}</span>
                )}
              </p>
              <p className="text-[11px] text-slate-500">
                {card.visit_count} {card.visit_count === 1 ? "visit" : "visits"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-slate-900">{data.balance}</p>
              <p className="text-[11px] text-slate-500">{unitWord(unit, data.balance)}</p>
            </div>
          </div>

          {unit === "stamps" && (
            <div className="flex flex-wrap gap-1" aria-label={`${data.balance % perCard} of ${perCard} stamps`}>
              {Array.from({ length: perCard }).map((_, i) => (
                <span
                  key={i}
                  className="w-4 h-4 rounded-full border"
                  style={
                    i < (data.balance >= perCard ? perCard : data.balance % perCard)
                      ? { background: data.program.card_color, borderColor: data.program.card_color }
                      : { borderColor: "#cbd5e1" }
                  }
                />
              ))}
            </div>
          )}

          {!linked && (
            <button
              onClick={attach}
              disabled={busy !== null}
              className="w-full inline-flex items-center justify-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {busy === "attach" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
              Add to this bill
            </button>
          )}

          {billId && data.rewards.length > 0 && (
            <div className="space-y-1.5">
              {data.rewards.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">{r.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {rewardLabel(r)} · {r.cost} {unitWord(r.unit, r.cost)}
                    </p>
                  </div>
                  {r.can_redeem ? (
                    <button
                      onClick={() => redeem(r)}
                      disabled={busy !== null}
                      className="shrink-0 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {busy === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Use"}
                    </button>
                  ) : (
                    <span className="shrink-0 text-[11px] text-slate-400">{r.needs} more</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {data.applied && data.applied.length > 0 && (
        <div className="text-[11px] text-emerald-700 space-y-0.5">
          {data.applied.map((a) => (
            <p key={a.id}>
              {a.reward_name}: −₹{Number(a.discount_amount).toFixed(2)}
            </p>
          ))}
        </div>
      )}
      {notice && <p className="text-[11px] font-medium text-emerald-700">{notice}</p>}
      {error && <p className="text-[11px] font-medium text-rose-600">{error}</p>}
    </div>
  );
}
