"use client";

import { useEffect, useState } from "react";
import { Gift, Loader2, Plus, Copy, Check } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { api } from "@/app/lib/api";
import { getRootDomain } from "@/app/lib/tenant";
import { rewardLabel, type LoyaltyProgram } from "@/app/components/billing/LoyaltyPanel";
import LoyaltyInsights from "@/app/components/settings/LoyaltyInsights";
import LoyaltyOutreach from "@/app/components/settings/LoyaltyOutreach";
import LoyaltyMembers from "@/app/components/settings/LoyaltyMembers";
import LoyaltyBranches from "@/app/components/settings/LoyaltyBranches";

type Reward = {
  id: string;
  name: string;
  description: string;
  unit: "points" | "stamps";
  cost: number;
  reward_kind: "fixed" | "percent" | "free_item";
  reward_value: string | number;
  is_active: boolean;
  sort_order: number;
};

type Summary = {
  members: number;
  active_members_30d: number;
  repeat_members: number;
  earned_last_30d: number;
  rewards_last_30d: number;
  discount_last_30d: string | number;
  member_spend_last_30d: string | number;
};

type Tab = "card" | "auto" | "today" | "insights" | "members" | "branches";

const emptyReward = { name: "", description: "", cost: "", reward_kind: "fixed", reward_value: "" };

/**
 * Owner/manager settings for the loyalty card: on/off, points or stamps,
 * rewards, automatic rewards, today's birthdays and win-backs, insights,
 * member export/import, and sharing the card across branches.
 */
export default function LoyaltySettings({ onSaved }: { onSaved?: () => void }) {
  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [sharedFrom, setSharedFrom] = useState<{ restaurant_id: string; name: string } | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [slug, setSlug] = useState("");
  const [role, setRole] = useState("");
  const [tab, setTab] = useState<Tab>("card");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [draft, setDraft] = useState(emptyReward);
  const [addingReward, setAddingReward] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = () => {
    api<{ program: LoyaltyProgram; rewards: Reward[]; shared_from?: { restaurant_id: string; name: string } }>("/api/admin/crm/loyalty/program", { noCache: true })
      .then((res) => {
        setProgram(res.program);
        setRewards(res.rewards || []);
        setSharedFrom(res.shared_from || null);
      })
      .catch((e) => setMessage({ ok: false, text: (e as Error).message || "Couldn't load loyalty settings." }));
    api<{ summary: Summary }>("/api/admin/crm/loyalty/summary", { noCache: true, suppressErrorLog: true })
      .then((r) => setSummary(r.summary))
      .catch(() => setSummary(null));
    api<{ store_slug?: string; role?: string }>("/api/admin/me", { suppressErrorLog: true })
      .then((me) => {
        setSlug((me?.store_slug || "").trim());
        setRole(me?.role || "");
      })
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  if (!program) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
        {message?.text || "Loading loyalty settings..."}
      </div>
    );
  }

  const unit = program.mode === "stamps" ? "stamps" : "points";
  const cardUrl = slug ? `https://${slug}.${getRootDomain()}/loyalty/${slug}` : "";
  const set = (patch: Partial<LoyaltyProgram>) => setProgram({ ...program, ...patch });
  const isManager = role === "owner" || role === "manager" || role === "";
  const num = (v: unknown, fallback = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  const save = async (next: LoyaltyProgram = program) => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await api<{ program: LoyaltyProgram }>("/api/admin/crm/loyalty/program", {
        method: "PUT",
        body: JSON.stringify({
          ...next,
          points_per_100: num(next.points_per_100),
          min_bill_amount: num(next.min_bill_amount),
          stamps_per_card: num(next.stamps_per_card, 10),
          welcome_bonus: num(next.welcome_bonus),
          birthday_bonus: num(next.birthday_bonus),
          visit_bonus_every: num(next.visit_bonus_every),
          visit_bonus: num(next.visit_bonus),
          tier_silver_spend: num(next.tier_silver_spend, 5000),
          tier_gold_spend: num(next.tier_gold_spend, 15000),
          tier_platinum_spend: num(next.tier_platinum_spend, 40000),
          tier_silver_multiplier: num(next.tier_silver_multiplier, 1.25),
          tier_gold_multiplier: num(next.tier_gold_multiplier, 1.5),
          tier_platinum_multiplier: num(next.tier_platinum_multiplier, 2),
          referral_bonus_referrer: num(next.referral_bonus_referrer),
          referral_bonus_friend: num(next.referral_bonus_friend),
          winback_days: num(next.winback_days),
          winback_bonus: num(next.winback_bonus),
        }),
      });
      setProgram(res.program);
      setMessage({ ok: true, text: res.program.is_active ? "Saved. Loyalty is on." : "Saved. Loyalty is off." });
      onSaved?.();
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message || "Couldn't save." });
    } finally {
      setSaving(false);
    }
  };

  const saveReward = async (r: Partial<Reward> & { id?: string }) => {
    setMessage(null);
    const body = JSON.stringify({
      name: r.name,
      description: r.description || "",
      unit: r.unit || unit,
      cost: Number(r.cost),
      reward_kind: r.reward_kind,
      reward_value: Number(r.reward_value),
      is_active: r.is_active ?? true,
      sort_order: r.sort_order ?? 0,
    });
    try {
      if (r.id) {
        await api(`/api/admin/crm/loyalty/rewards/${r.id}`, { method: "PUT", body });
      } else {
        await api(`/api/admin/crm/loyalty/rewards`, { method: "POST", body });
      }
      const res = await api<{ program: LoyaltyProgram; rewards: Reward[] }>("/api/admin/crm/loyalty/program", { noCache: true });
      setRewards(res.rewards || []);
      return true;
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message || "Couldn't save the reward." });
      return false;
    }
  };

  const addReward = async () => {
    setAddingReward(true);
    const ok = await saveReward({
      name: draft.name,
      description: draft.description,
      cost: Number(draft.cost),
      reward_kind: draft.reward_kind as Reward["reward_kind"],
      reward_value: draft.reward_value,
    });
    if (ok) setDraft(emptyReward);
    setAddingReward(false);
  };

  const visibleRewards = rewards.filter((r) => r.unit === unit);
  const otherUnitCount = rewards.filter((r) => r.unit !== unit && r.is_active).length;
  const field = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900";
  const small = "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900";

  const tabs: { id: Tab; label: string }[] = sharedFrom
    ? [
        { id: "today", label: "Today" },
        { id: "insights", label: "Insights" },
        { id: "branches", label: "Branches" },
      ]
    : [
        { id: "card", label: "Card & rewards" },
        { id: "auto", label: "Automatic rewards" },
        { id: "today", label: "Today" },
        ...(isManager ? [{ id: "insights" as Tab, label: "Insights" }, { id: "members" as Tab, label: "Members" }] : []),
        { id: "branches", label: "Branches" },
      ];
  const activeTab = tabs.some((t) => t.id === tab) ? tab : tabs[0].id;

  const saveButton = (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={() => save()}
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save settings
      </button>
      {message && <p className={`text-xs font-medium ${message.ok ? "text-emerald-700" : "text-rose-600"}`}>{message.text}</p>}
    </div>
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-5" data-testid="loyalty-settings">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white" style={{ background: program.card_color }}>
            <Gift className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Loyalty card</h2>
            <p className="text-xs text-slate-500">Customers collect {unit} on every paid bill and swap them for rewards.</p>
          </div>
        </div>
        {!sharedFrom && (
          <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={program.is_active}
              onChange={(e) => {
                const next = { ...program, is_active: e.target.checked };
                setProgram(next);
                save(next);
              }}
              className="h-4 w-4"
            />
            {program.is_active ? "On" : "Off"}
          </label>
        )}
      </div>

      {sharedFrom && (
        <p className="rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900">
          This branch uses <b>{sharedFrom.name}</b>&apos;s card. Change the card, rewards and automatic rewards at {sharedFrom.name}.
        </p>
      )}

      {summary && program.is_active && !sharedFrom && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Members", summary.members],
            ["Came back in 30 days", summary.active_members_30d],
            ["Visited 2+ times", summary.repeat_members],
            ["Rewards used (30 days)", summary.rewards_last_30d],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs text-slate-500">{label}</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
            </div>
          ))}
        </div>
      )}

      <div role="tablist" className="flex flex-wrap gap-1 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={activeTab === t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-xs font-semibold ${
              activeTab === t.id ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "card" && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-800">How customers earn</p>
              <div className="flex gap-2">
                {(["points", "stamps"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => set({ mode: m })}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                      program.mode === m ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {m === "points" ? "Points" : "Stamp card"}
                  </button>
                ))}
              </div>
              {program.mode === "points" ? (
                <label className="block text-xs text-slate-600">
                  Points for every ₹100 spent
                  <input type="number" min={0} step="0.5" value={program.points_per_100} onChange={(e) => set({ points_per_100: e.target.value })} className={field} />
                </label>
              ) : (
                <label className="block text-xs text-slate-600">
                  Stamps to fill a card (one stamp per paid bill)
                  <input type="number" min={2} max={50} value={program.stamps_per_card} onChange={(e) => set({ stamps_per_card: Number(e.target.value) })} className={field} />
                </label>
              )}
              <label className="block text-xs text-slate-600">
                Smallest bill that earns (₹)
                <input type="number" min={0} value={program.min_bill_amount} onChange={(e) => set({ min_bill_amount: e.target.value })} className={field} />
              </label>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <label className="block text-xs text-slate-600">
                  Card name (optional)
                  <input value={program.card_title} maxLength={60} placeholder="e.g. Coffee Club" onChange={(e) => set({ card_title: e.target.value })} className={field} />
                </label>
                <label className="block text-xs text-slate-600">
                  Colour
                  <input type="color" value={program.card_color} onChange={(e) => set({ card_color: e.target.value })} className="mt-0 h-[38px] w-14 rounded-lg border border-slate-200" />
                </label>
              </div>
              {saveButton}
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-800">Customer card page</p>
              {cardUrl ? (
                <div className="flex gap-3 items-start">
                  <div className="rounded-xl border border-slate-200 p-2 bg-white">
                    <QRCodeSVG value={cardUrl} size={96} />
                  </div>
                  <div className="min-w-0 space-y-2">
                    <p className="text-xs text-slate-500">
                      Customers scan this to see their {unit} and rewards. They sign in with an email code. Nothing to install.
                    </p>
                    <p className="text-xs font-mono text-slate-700 break-all">{cardUrl}</p>
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(cardUrl).then(() => {
                          setCopied(true);
                          setTimeout(() => setCopied(false), 1500);
                        });
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? "Copied" : "Copy link"}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500">Set your store link in Settings &gt; Profile to get a card page.</p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-800">Rewards</p>
            {otherUnitCount > 0 && (
              <p className="text-xs text-amber-700">
                {otherUnitCount} reward{otherUnitCount === 1 ? "" : "s"} for {unit === "points" ? "stamps" : "points"} are hidden while the card uses {unit}.
              </p>
            )}
            {visibleRewards.length === 0 && <p className="text-xs text-slate-500">No rewards yet. Add one below.</p>}
            <div className="space-y-2">
              {visibleRewards.map((r) => (
                <div key={r.id} className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 ${r.is_active ? "border-slate-200" : "border-dashed border-slate-200 opacity-60"}`}>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{r.name}</p>
                    <p className="text-xs text-slate-500">
                      {r.cost} {unit} · {rewardLabel(r)}
                      {r.description ? ` · ${r.description}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => saveReward({ ...r, is_active: !r.is_active })}
                    className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {r.is_active ? "Hide" : "Show"}
                  </button>
                </div>
              ))}
            </div>
            <div className="grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-[2fr_1fr_1.4fr_1fr_auto] items-end">
              <label className="block text-xs text-slate-600">
                Reward name
                <input value={draft.name} placeholder="e.g. Free coffee" onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={field} />
              </label>
              <label className="block text-xs text-slate-600">
                Costs ({unit})
                <input type="number" min={1} value={draft.cost} onChange={(e) => setDraft({ ...draft, cost: e.target.value })} className={field} />
              </label>
              <label className="block text-xs text-slate-600">
                Type
                <select value={draft.reward_kind} onChange={(e) => setDraft({ ...draft, reward_kind: e.target.value })} className={field}>
                  <option value="fixed">Amount off (₹)</option>
                  <option value="percent">Percent off (%)</option>
                  <option value="free_item">Free item (up to ₹)</option>
                </select>
              </label>
              <label className="block text-xs text-slate-600">
                {draft.reward_kind === "percent" ? "Percent" : "Value (₹)"}
                <input type="number" min={1} value={draft.reward_value} onChange={(e) => setDraft({ ...draft, reward_value: e.target.value })} className={field} />
              </label>
              <button
                onClick={addReward}
                disabled={addingReward || !draft.name.trim() || !draft.cost || !draft.reward_value}
                className="inline-flex items-center justify-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {addingReward ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add
              </button>
            </div>
          </div>
        </>
      )}

      {activeTab === "auto" && (
        <div className="space-y-5" data-testid="loyalty-auto">
          <div className="grid gap-4 md:grid-cols-2">
            <fieldset className="space-y-2 rounded-xl border border-slate-200 p-3">
              <legend className="px-1 text-sm font-semibold text-slate-800">Bonuses</legend>
              <label className="block text-xs text-slate-600">
                Welcome bonus for new members ({unit})
                <input type="number" min={0} value={program.welcome_bonus ?? 0} onChange={(e) => set({ welcome_bonus: Number(e.target.value) })} className={small} />
              </label>
              <label className="block text-xs text-slate-600">
                Birthday bonus ({unit}), once a year
                <input type="number" min={0} value={program.birthday_bonus ?? 0} onChange={(e) => set({ birthday_bonus: Number(e.target.value) })} className={small} />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-xs text-slate-600">
                  Every … visits (0 = off)
                  <input type="number" min={0} max={100} value={program.visit_bonus_every ?? 0} onChange={(e) => set({ visit_bonus_every: Number(e.target.value) })} className={small} />
                </label>
                <label className="block text-xs text-slate-600">
                  …give this bonus ({unit})
                  <input type="number" min={0} value={program.visit_bonus ?? 0} onChange={(e) => set({ visit_bonus: Number(e.target.value) })} className={small} />
                </label>
              </div>
            </fieldset>

            <fieldset className="space-y-2 rounded-xl border border-slate-200 p-3">
              <legend className="px-1 text-sm font-semibold text-slate-800">Win back quiet members</legend>
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-xs text-slate-600">
                  After … days away (0 = off)
                  <input type="number" min={0} max={365} value={program.winback_days ?? 0} onChange={(e) => set({ winback_days: Number(e.target.value) })} className={small} />
                </label>
                <label className="block text-xs text-slate-600">
                  Bonus to bring them back ({unit})
                  <input type="number" min={0} value={program.winback_bonus ?? 0} onChange={(e) => set({ winback_bonus: Number(e.target.value) })} className={small} />
                </label>
              </div>
              <p className="text-[11px] text-slate-500">Each member gets this once per quiet spell. It starts again after their next visit.</p>
            </fieldset>

            <fieldset className="space-y-2 rounded-xl border border-slate-200 p-3">
              <legend className="px-1 text-sm font-semibold text-slate-800">Invite a friend</legend>
              <label className="flex items-center gap-2 text-xs text-slate-700">
                <input type="checkbox" checked={!!program.referral_enabled} onChange={(e) => set({ referral_enabled: e.target.checked })} className="h-4 w-4" />
                Members get a share link on their card page
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-xs text-slate-600">
                  Member who invited ({unit})
                  <input type="number" min={0} value={program.referral_bonus_referrer ?? 0} onChange={(e) => set({ referral_bonus_referrer: Number(e.target.value) })} className={small} />
                </label>
                <label className="block text-xs text-slate-600">
                  Friend who joined ({unit})
                  <input type="number" min={0} value={program.referral_bonus_friend ?? 0} onChange={(e) => set({ referral_bonus_friend: Number(e.target.value) })} className={small} />
                </label>
              </div>
              <p className="text-[11px] text-slate-500">Both bonuses land after the friend&apos;s first paid visit.</p>
            </fieldset>

            <fieldset className="space-y-2 rounded-xl border border-slate-200 p-3">
              <legend className="px-1 text-sm font-semibold text-slate-800">Messages</legend>
              <label className="flex items-start gap-2 text-xs text-slate-700">
                <input type="checkbox" checked={!!program.auto_messages} onChange={(e) => set({ auto_messages: e.target.checked })} className="mt-0.5 h-4 w-4" />
                <span>Email birthday and win-back messages to members who agreed to them on their card page.</span>
              </label>
              <label className="flex items-start gap-2 text-xs text-slate-700">
                <input type="checkbox" checked={program.review_prompt !== false} onChange={(e) => set({ review_prompt: e.target.checked })} className="mt-0.5 h-4 w-4" />
                <span>Ask for a Google review on the card page for a few days after a visit. Set your review link in Settings &gt; Profile. No points for reviews (Google doesn&apos;t allow it).</span>
              </label>
            </fieldset>
          </div>

          <fieldset className="space-y-3 rounded-xl border border-slate-200 p-3">
            <legend className="px-1 text-sm font-semibold text-slate-800">Tiers</legend>
            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input type="checkbox" checked={!!program.tiers_enabled} onChange={(e) => set({ tiers_enabled: e.target.checked })} className="h-4 w-4" />
              Members move up from Bronze as they spend more
              {unit === "points" ? " and earn points faster" : " (stamp cards show the tier but earn one stamp per visit)"}
            </label>
            {program.tiers_enabled && (
              <div className="grid gap-2 sm:grid-cols-3">
                {(["silver", "gold", "platinum"] as const).map((t) => (
                  <div key={t} className="space-y-1 rounded-lg bg-slate-50 p-2">
                    <p className="text-xs font-semibold capitalize text-slate-800">{t}</p>
                    <label className="block text-[11px] text-slate-600">
                      From lifetime spend (₹)
                      <input
                        type="number"
                        min={1}
                        value={(program[`tier_${t}_spend` as keyof LoyaltyProgram] as string | number) ?? ""}
                        onChange={(e) => set({ [`tier_${t}_spend`]: e.target.value } as Partial<LoyaltyProgram>)}
                        className={small}
                      />
                    </label>
                    {unit === "points" && (
                      <label className="block text-[11px] text-slate-600">
                        Earns points × (1–5)
                        <input
                          type="number"
                          min={1}
                          max={5}
                          step="0.25"
                          value={(program[`tier_${t}_multiplier` as keyof LoyaltyProgram] as string | number) ?? ""}
                          onChange={(e) => set({ [`tier_${t}_multiplier`]: e.target.value } as Partial<LoyaltyProgram>)}
                          className={small}
                        />
                      </label>
                    )}
                  </div>
                ))}
              </div>
            )}
          </fieldset>
          {saveButton}
        </div>
      )}

      {activeTab === "today" && <LoyaltyOutreach canRun={isManager && !sharedFrom} />}
      {activeTab === "insights" && <LoyaltyInsights />}
      {activeTab === "members" && <LoyaltyMembers canImport={isManager && !sharedFrom} />}
      {activeTab === "branches" && (
        <LoyaltyBranches
          onChanged={() => {
            load();
            onSaved?.();
          }}
        />
      )}
    </section>
  );
}
