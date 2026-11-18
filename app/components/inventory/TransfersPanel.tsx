"use client";

import { api } from "@/app/lib/api";
import { ArrowRight, PackageCheck, Plus, Send, Store, X } from "lucide-react";
import {
  BTN_PRIMARY, BTN_SECONDARY, CARD, DIALOG, ICON_BTN_DANGER, INPUT, LABEL, OVERLAY,
  EmptyState, Pill, SectionHeader, type Tone,
} from "./ui";
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";

import { Select } from "@/app/components/ui/Select";
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

const STATUS: Record<string, { tone: Tone; label: string }> = {
  pending: { tone: "amber", label: "Waiting to dispatch" },
  shipped: { tone: "sky", label: "On the way" },
  received: { tone: "emerald", label: "Received" },
  cancelled: { tone: "neutral", label: "Cancelled" },
};
const statusOf = (s: string) =>
  STATUS[s] || { tone: "neutral" as Tone, label: s ? s.charAt(0).toUpperCase() + s.slice(1) : "Unknown" };

const ROW_ACTION =
  "inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#0F1117] px-3 text-[12px] font-semibold text-white transition-colors hover:bg-[#1F2937] disabled:opacity-50";

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

  const Row = ({ t, side }: { t: Transfer; side: "out" | "in" }) => {
    const st = statusOf(t.status);
    return (
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3.5">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[14px] font-semibold text-[#0F1117]">
            {name(t.from_restaurant_id)}
            <ArrowRight className="h-3.5 w-3.5 text-[#9CA3AF]" />
            {name(t.to_restaurant_id)}
          </p>
          <p className="mt-0.5 text-[12px] tabular-nums text-[#9CA3AF]">
            Created {new Date(t.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Pill tone={st.tone}>{st.label}</Pill>
          {side === "out" && t.status === "pending" && (
            <button disabled={busy === t.id} onClick={() => void act(t, "dispatch")} className={ROW_ACTION}>
              <Send className="h-3.5 w-3.5" /> Dispatch
            </button>
          )}
          {side === "in" && t.status === "shipped" && (
            <button disabled={busy === t.id} onClick={() => void act(t, "receive")} className={ROW_ACTION}>
              <PackageCheck className="h-3.5 w-3.5" /> Mark received
            </button>
          )}
        </div>
      </div>
    );
  };

  const incomingOnly = incoming.filter((t) => t.to_restaurant_id === me);

  return (
    <div className="px-8 py-6">
      <SectionHeader
        title="Branch transfers"
        description="Send ingredients to another branch you own. Stock leaves when you dispatch and is added when they confirm it arrived."
      >
        <button
          onClick={() => setShowNew(true)}
          disabled={destinations.length === 0}
          title={destinations.length === 0 ? "You need a second branch to transfer stock" : undefined}
          className={BTN_PRIMARY}
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} /> New transfer
        </button>
      </SectionHeader>

      {outgoing.length === 0 && incomingOnly.length === 0 ? (
        <section className={CARD}>
          <EmptyState
            icon={<Store className="h-6 w-6" />}
            title="No transfers yet"
            body={
              destinations.length === 0
                ? "Add another branch in Settings, under Branches, to start moving stock between them."
                : "Create a transfer to send stock to another branch."
            }
          />
        </section>
      ) : (
        <div className="space-y-6">
          {(
            [
              ["Outgoing", outgoing, "out"],
              ["Incoming", incomingOnly, "in"],
            ] as const
          ).map(([title, list, side]) => (
            <section key={title}>
              <h3 className="mb-2 flex items-center gap-2 text-[15px] font-semibold text-[#0F1117]">
                {title}
                <span className="text-[13px] font-medium tabular-nums text-[#9CA3AF]">{list.length}</span>
              </h3>
              {list.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-[#E8E8E3] px-5 py-4 text-[13px] text-[#9CA3AF]">
                  {side === "out" ? "Nothing sent from this branch." : "Nothing on its way to this branch."}
                </p>
              ) : (
                <div className={`${CARD} divide-y divide-[#F0F0EB]`}>
                  {list.map((t) => (
                    <Row key={t.id} t={t} side={side} />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      {showNew && (
        <div className={OVERLAY} role="dialog" aria-modal="true" aria-label="New transfer">
          <form onSubmit={create} className={`${DIALOG} max-h-[90vh] max-w-lg overflow-y-auto p-6`}>
            <h3 className="text-[17px] font-bold text-[#0F1117]">New transfer</h3>
            <p className="mt-1 text-[13px] text-[#6B7280]">Stock is deducted here when you dispatch it.</p>
            <div className="mt-5">
              <label className={LABEL}>Send to</label>
              <Select value={to} onChange={(e) => setTo(e.target.value)} className={INPUT}>
                <option value="">Choose a branch</option>
                {destinations.map((b) => (
                  <option key={b.restaurant_id} value={b.restaurant_id}>{b.name}</option>
                ))}
              </Select>
            </div>
            <div className="mt-5">
              <p className={LABEL}>Items</p>
              <div className="space-y-2">
                {lines.map((l, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Select
                      value={l.ingredient_id}
                      onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, ingredient_id: e.target.value } : x)))}
                      className={`${INPUT} min-w-0 flex-1`}
                    >
                      <option value="">Ingredient</option>
                      {ingredients.map((g) => (
                        <option key={g.ingredient_id} value={g.ingredient_id}>{g.ingredient} ({g.stock} in stock)</option>
                      ))}
                    </Select>
                    <input
                      type="number" step="0.01" min={0} placeholder="Qty" aria-label="Quantity" value={l.quantity}
                      onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))}
                      className={`${INPUT} w-20 shrink-0 tabular-nums`}
                    />
                    <Select
                      value={l.unit}
                      onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, unit: e.target.value } : x)))}
                      className={`${INPUT} w-20 shrink-0`}
                    >
                      {UNITS.map((u) => <option key={u}>{u}</option>)}
                    </Select>
                    {lines.length > 1 && (
                      <button type="button" onClick={() => setLines(lines.filter((_, j) => j !== i))} className={`${ICON_BTN_DANGER} shrink-0`} aria-label="Remove item">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setLines([...lines, { ingredient_id: "", quantity: "", unit: "kg" }])}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-1 py-1 text-[13px] font-semibold text-[#374151] transition-colors hover:text-[#0F1117]"
              >
                <Plus className="h-4 w-4" /> Add another item
              </button>
            </div>
            <div className="mt-6 flex gap-2">
              <button type="button" onClick={() => setShowNew(false)} className={`${BTN_SECONDARY} flex-1`}>Cancel</button>
              <button type="submit" disabled={busy === "create"} className={`${BTN_PRIMARY} flex-1`}>
                {busy === "create" ? "Creating" : "Create transfer"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
