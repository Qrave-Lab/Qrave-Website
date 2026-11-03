"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Gift, Loader2, Mail, LogOut, Store, Star, Share2, Cake } from "lucide-react";
import { getBackendBase } from "@/app/lib/api";


async function call<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const res = await fetch(`${getBackendBase()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const text = await res.text();
  let json: { message?: string } & Record<string, unknown> = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {}
  if (!res.ok) {
    const err = new Error(json?.message || "Something went wrong. Please try again.") as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return json as T;
}

type Reward = {
  id: string;
  name: string;
  description: string;
  cost: number;
  reward_kind: string;
  reward_value: string | number;
  can_redeem?: boolean;
  needs?: number;
};

type Info = {
  restaurant_name: string;
  logo_url?: string;
  active: boolean;
  mode: "points" | "stamps";
  points_per_100: string | number;
  min_bill_amount: string | number;
  stamps_per_card: number;
  card_title: string;
  card_color: string;
  rewards: Reward[];
  welcome_bonus?: number;
  birthday_bonus?: number;
  visit_bonus_every?: number;
  visit_bonus?: number;
  referral_bonus?: number;
  tiers_enabled?: boolean;
};

type Card = {
  name: string;
  phone_last4: string;
  email: string;
  balance: number;
  unit: "points" | "stamps";
  visit_count: number;
  member_since: string;
  stamps_per_card: number;
  rewards: Reward[];
  history: { event_type: string; unit: string; delta: number; note?: string; created_at: string }[];
  tier?: string;
  next_tier?: string;
  spend_to_next?: string | number;
  birthday?: string;
  messages_opt_in: boolean;
  referral_code?: string;
  review_url?: string;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

function rewardText(r: Reward) {
  const v = Number(r.reward_value);
  if (r.reward_kind === "percent") return `${v}% off your bill`;
  if (r.reward_kind === "free_item") return `A free item, up to ₹${v}`;
  return `₹${v} off your bill`;
}

function historyText(h: Card["history"][number]) {
  switch (h.event_type) {
    case "earn":
      return h.unit === "stamps" ? "Stamp for your visit" : "Points for your bill";
    case "reward_redeem":
      return h.note ? `Reward: ${h.note}` : "Reward used";
    case "earn_reversal":
      return "Taken back after a refund";
    case "welcome_bonus":
      return "Welcome bonus";
    case "birthday_bonus":
      return "Birthday bonus";
    case "visit_bonus":
      return h.note || "Visit bonus";
    case "referral_bonus":
      return h.note || "Bonus for inviting a friend";
    case "winback_bonus":
      return "Welcome-back bonus";
    default:
      return h.note || "Adjusted by the restaurant";
  }
}

const unitWord = (u: string, n: number) => (u === "stamps" ? (n === 1 ? "stamp" : "stamps") : n === 1 ? "point" : "points");

export default function LoyaltyCardPage() {
  const params = useParams();
  const slug = String(params?.slug || "");
  const storageKey = `qrave_loyalty_${slug}`;

  const [info, setInfo] = useState<Info | null>(null);
  const [infoError, setInfoError] = useState("");
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem(`qrave_loyalty_${slug}`);
    } catch {
      return null;
    }
  });
  const [card, setCard] = useState<Card | null>(null);
  const [step, setStep] = useState<"email" | "code" | "phone">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // A friend's invite code from the link (?ref=CODE).
  const [referral] = useState(() => {
    if (typeof window === "undefined") return "";
    return (new URLSearchParams(window.location.search).get("ref") || "").slice(0, 20);
  });
  const [bMonth, setBMonth] = useState("");
  const [bDay, setBDay] = useState("");
  const [optIn, setOptIn] = useState<boolean | null>(null);
  const [prefsNote, setPrefsNote] = useState("");
  const [shared, setShared] = useState(false);

  useEffect(() => {
    if (!slug) return;
    call<Info>(`/public/loyalty/${encodeURIComponent(slug)}`)
      .then(setInfo)
      .catch((e) => setInfoError(e.message));
  }, [slug]);

  const saveToken = (t: string | null) => {
    setToken(t);
    try {
      if (t) localStorage.setItem(storageKey, t);
      else localStorage.removeItem(storageKey);
    } catch {}
  };

  useEffect(() => {
    if (!token) return;
    let alive = true;
    call<Card>(`/public/loyalty/${encodeURIComponent(slug)}/card`, {}, token)
      .then((c) => alive && setCard(c))
      .catch((e: Error & { status?: number }) => {
        if (!alive) return;
        if (e.status === 401) {
          setToken(null);
          try {
            localStorage.removeItem(`qrave_loyalty_${slug}`);
          } catch {}
        } else {
          setError(e.message);
        }
      });
    return () => {
      alive = false;
    };
  }, [token, slug]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const sendCode = () =>
    run(async () => {
      await call(`/public/loyalty/${encodeURIComponent(slug)}/send-code`, { method: "POST", body: JSON.stringify({ email }) });
      setStep("code");
    });

  const verify = () =>
    run(async () => {
      const res = await call<{ status: string; token?: string }>(`/public/loyalty/${encodeURIComponent(slug)}/verify`, {
        method: "POST",
        body: JSON.stringify({ email, code }),
      });
      if (res.status === "ok" && res.token) saveToken(res.token);
      else setStep("phone");
    });

  const join = () =>
    run(async () => {
      const res = await call<{ token: string }>(`/public/loyalty/${encodeURIComponent(slug)}/join`, {
        method: "POST",
        body: JSON.stringify({ email, phone, name, referral_code: referral }),
      });
      saveToken(res.token);
    });

  const savePrefs = () =>
    run(async () => {
      if (!token || !card) return;
      const birthday = bMonth && bDay ? `${bMonth}-${bDay}` : "";
      await call(`/public/loyalty/${encodeURIComponent(slug)}/preferences`, {
        method: "POST",
        body: JSON.stringify({ birthday, messages_opt_in: optIn ?? card.messages_opt_in }),
      }, token);
      setCard({ ...card, birthday: birthday || card.birthday, messages_opt_in: optIn ?? card.messages_opt_in });
      setPrefsNote("Saved.");
    });

  const color = info?.card_color || "#0f766e";
  const input = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 focus:outline-none focus:ring-2";

  if (infoError) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <p className="text-sm text-slate-600 text-center">{infoError}</p>
      </main>
    );
  }
  if (!info) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </main>
    );
  }

  const unit = info.mode === "stamps" ? "stamps" : "points";
  const earnLine =
    info.mode === "stamps"
      ? `Get a stamp every visit${Number(info.min_bill_amount) > 0 ? ` (bills over ₹${Number(info.min_bill_amount)})` : ""}. Fill ${info.stamps_per_card} for a reward.`
      : `Earn ${Number(info.points_per_100)} points for every ₹100 you spend${Number(info.min_bill_amount) > 0 ? ` (bills over ₹${Number(info.min_bill_amount)})` : ""}.`;

  const perks = [
    info.welcome_bonus ? `${info.welcome_bonus} ${unitWord(unit, info.welcome_bonus)} just for joining` : "",
    info.birthday_bonus ? `${info.birthday_bonus} ${unitWord(unit, info.birthday_bonus)} on your birthday` : "",
    info.visit_bonus_every && info.visit_bonus ? `${info.visit_bonus} bonus ${unitWord(unit, info.visit_bonus)} every ${info.visit_bonus_every} visits` : "",
    info.tiers_enabled ? "Move up to Silver, Gold and Platinum as you visit" : "",
  ].filter(Boolean);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="mx-auto w-full max-w-md space-y-4">
        <header className="flex items-center gap-3">
          {info.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={info.logo_url} alt="" className="w-10 h-10 rounded-xl object-cover border border-slate-200 bg-white" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
              <Store className="w-5 h-5 text-slate-500" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-base font-bold text-slate-900 truncate">{info.restaurant_name}</h1>
            <p className="text-xs text-slate-500">{info.card_title || "Loyalty card"}</p>
          </div>
          {card && (
            <button
              onClick={() => {
                saveToken(null);
                setCard(null);
                setStep("email");
                setCode("");
              }}
              className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-100"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          )}
        </header>

        {!info.active ? (
          <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center text-sm text-slate-600">
            This restaurant&apos;s loyalty card isn&apos;t running right now.
          </div>
        ) : card ? (
          <>
            <section className="rounded-3xl p-5 text-white shadow-lg" style={{ background: color }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs opacity-80">
                    {card.name || "Member"}
                    {card.tier && <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">{card.tier}</span>}
                  </p>
                  <p className="text-[11px] opacity-70">Phone ending {card.phone_last4}</p>
                </div>
                <Gift className="w-5 h-5 opacity-80" />
              </div>
              {unit === "stamps" ? (
                <div className="mt-5">
                  <div className="grid grid-cols-5 gap-2">
                    {Array.from({ length: card.stamps_per_card }).map((_, i) => {
                      const filled = i < (card.balance >= card.stamps_per_card ? card.stamps_per_card : card.balance % card.stamps_per_card);
                      return (
                        <div
                          key={i}
                          className={`aspect-square rounded-full border-2 border-white/70 flex items-center justify-center ${filled ? "bg-white" : ""}`}
                        >
                          {filled && <Gift className="w-4 h-4" style={{ color }} />}
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-sm font-semibold">
                    {card.balance} {unitWord("stamps", card.balance)}
                  </p>
                </div>
              ) : (
                <div className="mt-5">
                  <p className="text-4xl font-bold">{card.balance}</p>
                  <p className="text-sm opacity-90">points</p>
                </div>
              )}
              <p className="mt-4 text-[11px] opacity-80">
                {card.visit_count} {card.visit_count === 1 ? "visit" : "visits"} · Give your phone number at the counter to collect
              </p>
            </section>

            <p className="text-xs text-slate-500 px-1">
              {earnLine}
              {card.tier && card.next_tier && Number(card.spend_to_next) > 0 && (
                <> Spend ₹{Math.ceil(Number(card.spend_to_next)).toLocaleString("en-IN")} more to reach {cap(card.next_tier)}.</>
              )}
            </p>

            {card.review_url && (
              <a
                href={card.review_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-2xl bg-white border border-slate-200 p-4 hover:bg-slate-50"
              >
                <Star className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="text-sm font-bold text-slate-900">How was your visit?</p>
                  <p className="text-xs text-slate-500">Tell others on Google. It takes a minute.</p>
                </div>
              </a>
            )}

            <section className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
              <h2 className="text-sm font-bold text-slate-900">Rewards</h2>
              {card.rewards.length === 0 && <p className="text-xs text-slate-500">Rewards are coming soon.</p>}
              {card.rewards.map((r) => {
                const pct = Math.min(100, Math.round((card.balance / r.cost) * 100));
                return (
                  <div key={r.id} className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">{r.name}</p>
                      <p className="text-xs text-slate-500 shrink-0">
                        {r.cost} {unitWord(unit, r.cost)}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500">{r.description || rewardText(r)}</p>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                    </div>
                    <p className={`text-[11px] font-medium ${r.can_redeem ? "text-emerald-700" : "text-slate-400"}`}>
                      {r.can_redeem ? "Ready! Ask the staff when you pay." : `${r.needs} more ${unitWord(unit, r.needs || 0)} to go`}
                    </p>
                  </div>
                );
              })}
            </section>

            {card.referral_code && (
              <section className="rounded-2xl bg-white border border-slate-200 p-4 space-y-2">
                <h2 className="text-sm font-bold text-slate-900">Invite a friend</h2>
                <p className="text-xs text-slate-500">
                  When a friend joins with your link and pays their first bill, you both get a bonus
                  {info.referral_bonus ? ` (they get ${info.referral_bonus} ${unitWord(unit, info.referral_bonus)})` : ""}.
                </p>
                <button
                  onClick={async () => {
                    const link = `${window.location.origin}${window.location.pathname}?ref=${card.referral_code}`;
                    const text = `Join ${info.restaurant_name}'s loyalty card with my link: ${link}`;
                    try {
                      if (navigator.share) await navigator.share({ text, url: link });
                      else {
                        await navigator.clipboard.writeText(link);
                        setShared(true);
                      }
                    } catch {}
                  }}
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white"
                  style={{ background: color }}
                >
                  <Share2 className="w-4 h-4" /> {shared ? "Link copied" : "Share my link"}
                </button>
              </section>
            )}

            <section className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Cake className="w-4 h-4 text-pink-600" /> Your birthday
              </h2>
              <p className="text-xs text-slate-500">
                {info.birthday_bonus
                  ? `Get ${info.birthday_bonus} ${unitWord(unit, info.birthday_bonus)} on your birthday.`
                  : "We'd love to celebrate with you."}
                {card.birthday && ` Saved: ${Number(card.birthday.slice(3))} ${MONTHS[Number(card.birthday.slice(0, 2)) - 1]}.`}
              </p>
              <div className="flex gap-2">
                <select value={bMonth} onChange={(e) => setBMonth(e.target.value)} aria-label="Birthday month" className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
                  <option value="">Month</option>
                  {MONTHS.map((m, i) => (
                    <option key={m} value={String(i + 1).padStart(2, "0")}>
                      {m}
                    </option>
                  ))}
                </select>
                <select value={bDay} onChange={(e) => setBDay(e.target.value)} aria-label="Birthday day" className="w-24 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
                  <option value="">Day</option>
                  {Array.from({ length: 31 }).map((_, i) => (
                    <option key={i} value={String(i + 1).padStart(2, "0")}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-start gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={optIn ?? card.messages_opt_in}
                  onChange={(e) => setOptIn(e.target.checked)}
                  className="mt-0.5 h-4 w-4"
                />
                <span>Send me birthday treats and offers by email or WhatsApp. You can turn this off any time.</span>
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={savePrefs}
                  disabled={busy || ((!bMonth || !bDay) && (optIn === null || optIn === card.messages_opt_in))}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                >
                  Save
                </button>
                {prefsNote && <span className="text-xs text-emerald-700">{prefsNote}</span>}
              </div>
            </section>

            {card.history.length > 0 && (
              <section className="rounded-2xl bg-white border border-slate-200 p-4">
                <h2 className="text-sm font-bold text-slate-900 mb-2">Recent activity</h2>
                <ul className="divide-y divide-slate-100">
                  {card.history.map((h, i) => (
                    <li key={i} className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-xs font-medium text-slate-800">{historyText(h)}</p>
                        <p className="text-[11px] text-slate-400">{new Date(h.created_at).toLocaleDateString()}</p>
                      </div>
                      <span className={`text-xs font-bold ${h.delta > 0 ? "text-emerald-700" : "text-slate-500"}`}>
                        {h.delta > 0 ? "+" : ""}
                        {h.delta}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        ) : (
          <section className="rounded-2xl bg-white border border-slate-200 p-5 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {step === "phone" ? "Almost there" : `Collect ${unit} at ${info.restaurant_name}`}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {step === "email" && `${earnLine} Sign in with your email to see your card.`}
                {step === "code" && `We sent a 6-digit code to ${email}.`}
                {step === "phone" && "Add your phone number. Staff use it to find your card when you pay."}
              </p>
              {step === "email" && (perks.length > 0 || (referral && info.referral_bonus)) && (
                <ul className="mt-3 space-y-1 text-xs text-slate-600">
                  {referral && info.referral_bonus ? (
                    <li>A friend invited you: get {info.referral_bonus} {unitWord(unit, info.referral_bonus)} after your first visit.</li>
                  ) : null}
                  {perks.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              )}
            </div>

            {step === "email" && (
              <>
                <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" aria-label="Email" className={input} />
                <button onClick={sendCode} disabled={busy || !email.includes("@")} className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white disabled:opacity-50" style={{ background: color }}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />} Send me a code
                </button>
              </>
            )}

            {step === "code" && (
              <>
                <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="6-digit code" aria-label="Code" className={`${input} tracking-[0.4em] text-center`} />
                <button onClick={verify} disabled={busy || code.length !== 6} className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white disabled:opacity-50" style={{ background: color }}>
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />} Continue
                </button>
                <button onClick={() => { setStep("email"); setCode(""); }} className="w-full text-xs text-slate-500">
                  Use a different email
                </button>
              </>
            )}

            {step === "phone" && (
              <>
                <input inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" aria-label="Phone number" className={input} />
                <input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name (optional)" aria-label="Name" className={input} />
                <button onClick={join} disabled={busy || phone.replace(/\D/g, "").length < 8} className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white disabled:opacity-50" style={{ background: color }}>
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />} Show my card
                </button>
              </>
            )}

            {error && <p className="text-sm text-rose-600">{error}</p>}

            {info.rewards.length > 0 && step === "email" && (
              <div className="border-t border-slate-100 pt-3 space-y-1">
                <p className="text-xs font-semibold text-slate-700">Rewards you can get</p>
                {info.rewards.map((r) => (
                  <p key={r.id} className="text-xs text-slate-500">
                    {r.name}: {r.cost} {unitWord(unit, r.cost)}
                  </p>
                ))}
              </div>
            )}
          </section>
        )}
        {card && error && <p className="text-sm text-rose-600">{error}</p>}
      </div>
    </main>
  );
}
