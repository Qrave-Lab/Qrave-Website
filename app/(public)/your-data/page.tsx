"use client";

import Link from "next/link";
import { useState } from "react";
import { getBackendBase } from "@/app/lib/api";

type RequestType = "erase" | "export" | "correction";

const TYPES: { id: RequestType; label: string; help: string }[] = [
  { id: "erase", label: "Delete my data", help: "Ask the restaurant to erase the personal data linked to your number." },
  { id: "export", label: "Send me a copy", help: "Ask for a copy of the data held about you." },
  { id: "correction", label: "Correct my data", help: "Ask for wrong details to be fixed. Say what to change in the note." },
];

const MOBILE = /^[6-9]\d{9}$/;

export default function YourDataPage() {
  const [restaurantId] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      return new URLSearchParams(window.location.search).get("r") || localStorage.getItem("restaurant_id") || "";
    } catch {
      return "";
    }
  });
  const [phone, setPhone] = useState("");
  const [type, setType] = useState<RequestType>("erase");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const digits = phone.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
    if (!MOBILE.test(digits)) return setError("Enter a valid 10-digit Indian mobile number.");
    if (!restaurantId) return setError("We couldn't tell which restaurant this is for. Open this page from the restaurant's menu or bill.");
    setBusy(true);
    try {
      const res = await fetch(`${getBackendBase()}/api/public/privacy/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurant_id: restaurantId, phone: digits, request_type: type, note: note.trim() }),
      });
      if (res.status !== 202 && !res.ok) throw new Error();
      setDone(true);
    } catch {
      setError("Couldn't send your request. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-black text-slate-900">Your data</h1>
        {done ? (
          <div role="status" className="mt-4 space-y-3 text-sm text-slate-700">
            <p className="font-bold">Request received.</p>
            <p>The restaurant will review and action your request. You don&apos;t need to do anything else.</p>
            <Link href="/privacy" className="font-semibold underline underline-offset-2">Read the privacy policy</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-5" noValidate>
            <p className="text-sm text-slate-500">Ask this restaurant to delete, share or correct the personal data linked to your phone number.</p>
            <fieldset>
              <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">What do you need?</legend>
              <div className="space-y-2">
                {TYPES.map((t) => (
                  <label key={t.id} className={`flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl border p-3 ${type === t.id ? "border-[#fe5c13] bg-orange-50" : "border-slate-200"}`}>
                    <input type="radio" name="type" checked={type === t.id} onChange={() => setType(t.id)} className="mt-1 h-4 w-4 accent-[#fe5c13]" />
                    <span>
                      <span className="block text-sm font-bold text-slate-900">{t.label}</span>
                      <span className="block text-xs text-slate-500">{t.help}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div>
              <label htmlFor="yd-phone" className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Mobile number</label>
              <input id="yd-phone" type="tel" inputMode="numeric" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                aria-invalid={Boolean(error)} aria-describedby={error ? "yd-error" : undefined} placeholder="98765 43210"
                className="min-h-[44px] w-full rounded-xl border border-slate-200 px-3 text-base outline-none focus:border-[#fe5c13]" />
            </div>
            <div>
              <label htmlFor="yd-note" className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Note (optional)</label>
              <textarea id="yd-note" rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#fe5c13]" />
            </div>
            {error && <p id="yd-error" role="alert" className="text-sm text-rose-600">{error}</p>}
            <button type="submit" disabled={busy} className="min-h-[48px] w-full rounded-xl bg-[#fe5c13] text-sm font-bold text-white disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900">
              {busy ? "Sending..." : "Send request"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
