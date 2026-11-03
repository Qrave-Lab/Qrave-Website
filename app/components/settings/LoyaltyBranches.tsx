"use client";

import { useEffect, useState } from "react";
import { Loader2, Store } from "lucide-react";
import { api } from "@/app/lib/api";

type Branch = { restaurant_id: string; name: string };
type Share = { card_restaurant?: Branch; used_by: Branch[]; options: Branch[]; own_members: number; can_change: boolean };
type Preview = { members: number; matching: number; moving: number; unit_differs: boolean };

/** One loyalty card across branches: points earned at one branch work at all of them. */
export default function LoyaltyBranches({ onChanged }: { onChanged?: () => void }) {
  const [data, setData] = useState<Share | null>(null);
  const [pick, setPick] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let alive = true;
    api<Share>("/api/admin/crm/loyalty/share", { noCache: true })
      .then((d) => alive && setData(d))
      .catch((e: Error) => alive && setMessage({ ok: false, text: e.message || "Couldn't load branches." }));
    return () => {
      alive = false;
    };
  }, []);

  const choose = async (id: string) => {
    setPick(id);
    setPreview(null);
    setMessage(null);
    if (!id || !data?.own_members) return;
    try {
      setPreview(await api<Preview>(`/api/admin/crm/loyalty/share/preview?card_restaurant_id=${id}`, { noCache: true }));
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message || "Couldn't check that branch." });
    }
  };

  const change = async (target: string | null, merge = false) => {
    setBusy(true);
    setMessage(null);
    try {
      const d = await api<Share>("/api/admin/crm/loyalty/share", {
        method: "PUT",
        body: JSON.stringify({ card_restaurant_id: target, merge }),
      });
      setData(d);
      setPreview(null);
      setMessage({
        ok: true,
        text: target
          ? merge
            ? "Done. This branch's members are now on the shared card."
            : "This branch now uses the shared card."
          : "This branch is back on its own card (turned off until you set it up).",
      });
      onChanged?.();
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message || "Couldn't change it." });
    } finally {
      setBusy(false);
    }
  };

  if (!data) {
    return message ? (
      <p className="text-sm text-rose-600">{message.text}</p>
    ) : (
      <div className="flex items-center gap-2 py-6 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading...
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="loyalty-branches">
      <div>
        <p className="text-sm font-semibold text-slate-800">One card for all your branches</p>
        <p className="text-xs text-slate-500">
          A branch can use another branch&apos;s card. Members, points, rewards and settings then live at that main branch, and customers earn and spend at either. Bills stay with each branch.
        </p>
      </div>

      {data.card_restaurant ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-teal-200 bg-teal-50 p-3">
          <p className="text-sm text-teal-900">
            This branch uses <b>{data.card_restaurant.name}</b>&apos;s card.
          </p>
          {data.can_change && (
            <button
              onClick={() => change(null)}
              disabled={busy}
              className="rounded-lg border border-teal-300 bg-white px-3 py-1.5 text-xs font-semibold text-teal-900 hover:bg-teal-100 disabled:opacity-50"
            >
              Use its own card instead
            </button>
          )}
        </div>
      ) : data.used_by.length > 0 ? (
        <div className="rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
          <p className="mb-1 font-medium">These branches use this branch&apos;s card:</p>
          <ul className="space-y-1">
            {data.used_by.map((b) => (
              <li key={b.restaurant_id} className="flex items-center gap-1.5 text-xs">
                <Store className="h-3.5 w-3.5 text-slate-400" /> {b.name}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-slate-500">To share it with another branch, open that branch and choose this one there.</p>
        </div>
      ) : !data.can_change ? (
        <p className="text-xs text-slate-500">Only an owner can share a card between branches.</p>
      ) : data.options.length === 0 ? (
        <p className="text-xs text-slate-500">You don&apos;t have another branch with its own card yet.</p>
      ) : (
        <div className="space-y-3">
        <div className="flex flex-wrap items-end gap-2">
          <label className="block text-xs text-slate-600">
            Use the card of
            <select value={pick} onChange={(e) => choose(e.target.value)} className="mt-1 block w-60 rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="">Choose a branch</option>
              {data.options.map((b) => (
                <option key={b.restaurant_id} value={b.restaurant_id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          {!data.own_members && (
            <button
              onClick={() => pick && change(pick)}
              disabled={busy || !pick}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Share card
            </button>
          )}
        </div>
        {data.own_members > 0 && !pick && (
          <p className="text-xs text-slate-500">This branch has {data.own_members} members of its own. They&apos;ll move onto the shared card; you&apos;ll see what happens before anything changes.</p>
        )}
        {preview && (
          <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <p>
              {preview.members} members will move to the shared card. <b>{preview.matching}</b> already have a card there (same phone): their points, visits and spend
              are added together. <b>{preview.moving}</b> move over as they are. All history is kept.
            </p>
            {preview.unit_differs && <p>The two cards use different types (points and stamps). Balances keep their own type.</p>}
            <p>This can&apos;t be undone: if the branch leaves the shared card later, its members stay there.</p>
            <button
              onClick={() => change(pick, true)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Move {preview.members} members and share card
            </button>
          </div>
        )}
        </div>
      )}
      {message && <p className={`text-xs font-medium ${message.ok ? "text-emerald-700" : "text-rose-600"}`}>{message.text}</p>}
    </div>
  );
}
