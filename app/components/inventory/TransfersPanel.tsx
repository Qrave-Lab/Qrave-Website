"use client";

import { api } from "@/app/lib/api";
import { ArrowRight, PackageCheck, Plus, Send, Store, Trash2 } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";

type Branch = { restaurant_id: string; name: string; is_archived: boolean };
type Transfer = {
  id: string;
  from_restaurant_id: string;
  to_restaurant_id: string;
  status: "pending" | "shipped" | "received" | "cancelled" | string;
  created_at: string;
  dispatched_at?: string;
  received_at?: string;
};
type Ingredient = { ingredient_id: string; ingredient: string; stock: number };

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-100",
  shipped: "bg-sky-50 text-sky-700 border-sky-100",
  received: "bg-emerald-50 text-emerald-700 border-emerald-100",
  cancelled: "bg-slate-100 text-slate-500 border-slate-200",
};

const UNITS = ["kg", "g", "l", "ml", "pcs"];

export default function TransfersPanel({ ingredients }: { ingredients: Ingredient[] }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [outgoing, setOutgoing] = useState<Transfer[]>([]);
  const [incoming, setIncoming] = useState<Transfer[]>([]);
  const [me, setMe] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [to, setTo] = useState("");
  const [lines, setLines] = useState<{ ingredient_id: string; quantity: string; unit: string }[]>([
    { ingredient_id: "", quantity: "", unit: "kg" },
  ]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [br, out, inc, meRes] = await Promise.all([
      api<{ branches: Branch[] }>("/api/admin/branches").catch(() => ({ branches: [] as Branch[] })),
      api<{ transfers: Transfer[] }>("/api/admin/inventory/advanced/transfers?role=sender", { noCache: true }).catch(() => ({ transfers: [] as Transfer[] })),
      api<{ transfers: Transfer[] }>("/api/admin/inventory/advanced/transfers", { noCache: true }).catch(() => ({ transfers: [] as Transfer[] })),
      api<{ restaurant_id?: string; restaurantId?: string }>("/api/admin/me").catch(() => ({}) as { restaurant_id?: string; restaurantId?: string }),
    ]);
    setBranches((br?.branches || []).filter((b) => !b.is_archived));
    setOutgoing(out?.transfers || []);
    setIncoming(inc?.transfers || []);
    setMe(meRes?.restaurant_id || meRes?.restaurantId || "");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const name = (id: string) =>
    id === me ? "This branch" : branches.find((b) => b.restaurant_id === id)?.name || "Other branch";

  const destinations = branches.filter((b) => b.restaurant_id !== me);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const items = lines
      .filter((l) => l.ingredient_id && Number(l.quantity) > 0)
      .map((l) => ({ ingredient_id: l.ingredient_id, quantity: Number(l.quantity), unit: l.unit }));
    if (!to) return toast.error("Choose a destination branch");
    if (items.length === 0) return toast.error("Add at least one item");
    setBusy("create");
    try {
      await api("/api/admin/inventory/advanced/transfers", {
        method: "POST",
        body: JSON.stringify({ to_restaurant_id: to, items }),
      });
      toast.success("Transfer created — dispatch it when the stock leaves");
      setShowNew(false);
      setTo("");
      setLines([{ ingredient_id: "", quantity: "", unit: "kg" }]);
      await load();
    } catch (err) {
      toast.error((err as Error)?.message || "Failed to create transfer");
    } finally {
      setBusy(null);
    }
  };

  const act = async (t: Transfer, kind: "dispatch" | "receive") => {
    setBusy(t.id);
    try {
      await api(`/api/admin/inventory/advanced/transfers/${t.id}/${kind}`, { method: "POST" });
      toast.success(kind === "dispatch" ? "Dispatched — stock deducted" : "Received — stock added");
      await load();
    } catch (err) {
      toast.error((err as Error)?.message || `Failed to ${kind}`);
    } finally {
      setBusy(null);
    }
  };

  const Row = ({ t, side }: { t: Transfer; side: "out" | "in" }) => (
    <div className="flex items-center justify-between gap-4 bg-white px-5 py-3.5 text-xs">
      <div className="flex items-center gap-2 font-bold text-slate-800">
        {name(t.from_restaurant_id)} <ArrowRight className="h-3.5 w-3.5 text-slate-300" /> {name(t.to_restaurant_id)}
        <span className="ml-2 font-medium text-slate-400">
          {new Date(t.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${STATUS_STYLE[t.status] || ""}`}>
          {t.status}
        </span>
        {side === "out" && t.status === "pending" && (
          <button disabled={busy === t.id} onClick={() => void act(t, "dispatch")} className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 font-bold text-white hover:bg-slate-800 disabled:opacity-50">
            <Send className="h-3.5 w-3.5" /> Dispatch
          </button>
        )}
        {side === "in" && t.status === "shipped" && (
          <button disabled={busy === t.id} onClick={() => void act(t, "receive")} className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
            <PackageCheck className="h-3.5 w-3.5" /> Mark received
          </button>
        )}
      </div>
    </div>
  );

  const incomingOnly = incoming.filter((t) => t.to_restaurant_id === me);

  return (
    <div className="flex flex-1 flex-col animate-in fade-in duration-200">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-100 bg-white px-8 py-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Branch transfers</h2>
          <p className="mt-1 text-xs text-slate-500">
            Send ingredients to another branch you own. Stock leaves on dispatch and is added when they confirm receipt.
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          disabled={destinations.length === 0}
          title={destinations.length === 0 ? "You need a second branch to transfer stock" : undefined}
          className="flex items-center gap-2 self-start rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 sm:self-auto"
        >
          <Plus size={16} /> New transfer
        </button>
      </div>

      {outgoing.length === 0 && incomingOnly.length === 0 ? (
        <div className="m-auto p-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-slate-200/60">
            <Store size={28} />
          </div>
          <h3 className="text-base font-semibold text-slate-900">No transfers yet</h3>
          <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
            {destinations.length === 0
              ? "Add another branch from Settings → Branches to start moving stock."
              : "Create a transfer to move stock to another branch."}
          </p>
        </div>
      ) : (
        <div className="space-y-6 p-8">
          {[
            ["Outgoing", outgoing, "out"],
            ["Incoming", incomingOnly, "in"],
          ].map(([title, list, side]) => (
            <section key={title as string}>
              <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">{title as string}</h3>
              {(list as Transfer[]).length === 0 ? (
                <p className="text-xs text-slate-400">None</p>
              ) : (
                <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
                  {(list as Transfer[]).map((t) => (
                    <Row key={t.id} t={t} side={side as "out" | "in"} />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <form onSubmit={create} className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">New transfer</h3>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Send to</label>
              <select value={to} onChange={(e) => setTo(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
                <option value="">Select branch…</option>
                {destinations.map((b) => (
                  <option key={b.restaurant_id} value={b.restaurant_id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Items</label>
              {lines.map((l, i) => (
                <div key={i} className="flex gap-2">
                  <select
                    value={l.ingredient_id}
                    onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, ingredient_id: e.target.value } : x)))}
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="">Ingredient…</option>
                    {ingredients.map((g) => (
                      <option key={g.ingredient_id} value={g.ingredient_id}>{g.ingredient} ({g.stock} in stock)</option>
                    ))}
                  </select>
                  <input
                    type="number" step="0.01" min={0} placeholder="Qty" value={l.quantity}
                    onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))}
                    className="w-20 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                  <select
                    value={l.unit}
                    onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, unit: e.target.value } : x)))}
                    className="w-20 rounded-xl border border-slate-200 px-2 py-2 text-sm"
                  >
                    {UNITS.map((u) => <option key={u}>{u}</option>)}
                  </select>
                  {lines.length > 1 && (
                    <button type="button" onClick={() => setLines(lines.filter((_, j) => j !== i))} className="px-1 text-slate-400 hover:text-rose-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => setLines([...lines, { ingredient_id: "", quantity: "", unit: "kg" }])} className="text-xs font-bold text-emerald-700 hover:underline">
                + Add another item
              </button>
            </div>
            <div className="flex gap-3 border-t border-slate-100 pt-4">
              <button type="button" onClick={() => setShowNew(false)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={busy === "create"} className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                {busy === "create" ? "Creating…" : "Create transfer"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
