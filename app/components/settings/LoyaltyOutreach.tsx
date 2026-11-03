"use client";

import { useCallback, useEffect, useState } from "react";
import { Cake, HeartHandshake, Loader2, MessageCircle } from "lucide-react";
import { api } from "@/app/lib/api";

type Contact = {
  customer_profile_id: string;
  name: string;
  phone: string;
  email: string;
  messages_opt_in: boolean;
  last_visit_at?: string;
  balance: number;
  rewarded: boolean;
  kind: "birthday" | "winback";
  bonus: number;
  whatsapp_url?: string;
  email_status?: string;
};

type Outreach = { unit: string; auto_messages: boolean; email_ready: boolean; contacts: Contact[] };

const emailText: Record<string, string> = { sent: "Email sent", failed: "Email couldn't be sent", skipped: "No email address" };

/** Today's birthdays and this week's win-backs, with one-tap WhatsApp messages. */
export default function LoyaltyOutreach({ canRun }: { canRun: boolean }) {
  const [data, setData] = useState<Outreach | null>(null);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [note, setNote] = useState("");

  const fetchList = useCallback(
    () =>
      api<Outreach>("/api/admin/crm/loyalty/outreach", { noCache: true })
        .then((d) => {
          setData(d);
          setError("");
        })
        .catch((e: Error) => setError(e.message || "Couldn't load the list.")),
    []
  );

  useEffect(() => {
    let alive = true;
    api<Outreach>("/api/admin/crm/loyalty/outreach", { noCache: true })
      .then((d) => alive && setData(d))
      .catch((e: Error) => alive && setError(e.message || "Couldn't load the list."));
    return () => {
      alive = false;
    };
  }, []);

  const runNow = async () => {
    setRunning(true);
    setNote("");
    try {
      const r = await api<{ birthdays: number; winbacks: number; emails: number }>("/api/admin/crm/loyalty/automations/run", { method: "POST" });
      setNote(
        r.birthdays + r.winbacks === 0
          ? "Everyone due today already has their bonus."
          : `Gave ${r.birthdays} birthday and ${r.winbacks} win-back bonuses${r.emails ? `, sent ${r.emails} emails` : ""}.`
      );
      await fetchList();
    } catch (e) {
      setNote((e as Error).message || "Couldn't run it.");
    } finally {
      setRunning(false);
    }
  };

  if (error) return <p className="text-sm text-rose-600">{error}</p>;
  if (!data) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading...
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="loyalty-outreach">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">Birthdays and win-backs</p>
          <p className="text-xs text-slate-500">
            Bonuses are added automatically every hour.{" "}
            {data.auto_messages
              ? "Members who agreed to messages get an email; tap WhatsApp to send a personal note."
              : "Turn on emails in Automatic rewards, or tap WhatsApp to send a personal note."}
          </p>
        </div>
        {canRun && (
          <button
            onClick={runNow}
            disabled={running}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {running && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Give today&apos;s bonuses now
          </button>
        )}
      </div>
      {note && <p className="text-xs font-medium text-emerald-700">{note}</p>}

      {data.contacts.length === 0 ? (
        <p className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500">
          Nobody to reach today. Birthdays show up when members add theirs on the card page; win-backs need a win-back period in Automatic rewards.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {data.contacts.map((c) => (
            <li key={`${c.kind}-${c.customer_profile_id}`} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${c.kind === "birthday" ? "bg-pink-50 text-pink-700" : "bg-sky-50 text-sky-700"}`}>
                  {c.kind === "birthday" ? <Cake className="h-3.5 w-3.5" /> : <HeartHandshake className="h-3.5 w-3.5" />}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{c.name || c.phone}</p>
                  <p className="text-[11px] text-slate-500">
                    {c.kind === "birthday" ? "Birthday today" : "Hasn't been back in a while"}
                    {c.bonus > 0 && (c.rewarded ? ` · +${c.bonus} ${data.unit} added` : ` · gets +${c.bonus} ${data.unit} in the next hourly run`)}
                    {c.email_status && ` · ${emailText[c.email_status] || c.email_status}`}
                  </p>
                </div>
              </div>
              {c.whatsapp_url ? (
                <a
                  href={c.whatsapp_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </a>
              ) : (
                <span className="text-[11px] text-slate-400">Hasn&apos;t agreed to messages</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
