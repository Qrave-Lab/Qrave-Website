"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "react-hot-toast";
import { fcAdmin, type OperatorStall, type Placement } from "@/app/lib/foodCourtAdmin";
import { fetchStallMenu } from "@/app/lib/foodCourt";
import { Card, useOperator } from "../FcAdminShell";

const SLOT_LABEL = { top_stall: "Top of stall list", featured_item: "Featured dish" } as const;

function status(p: Placement, now: number): "Running" | "Scheduled" | "Ended" {
  const s = new Date(p.startsAt).getTime();
  const e = new Date(p.endsAt).getTime();
  if (now < s) return "Scheduled";
  if (now >= e) return "Ended";
  return "Running";
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export default function AdsPage() {
  const me = useOperator();
  const canEdit = me.role === "owner";
  const [placements, setPlacements] = useState<Placement[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [now, setNow] = useState(0);

  const load = useCallback(() => {
    fcAdmin
      .placements()
      .then((r) => {
        setPlacements(r.placements);
        setNow(Date.now());
      })
      .catch(() => toast.error("Couldn't load ads"));
  }, []);
  useEffect(load, [load]);

  const end = async (p: Placement) => {
    const verb = status(p, now) === "Scheduled" ? "Cancel" : "End";
    if (!window.confirm(`${verb} this ad for ${p.restaurantName}?`)) return;
    try {
      await fcAdmin.endPlacement(p.id);
      load();
    } catch (e) {
      toast.error((e as Error).message || "Couldn't update");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold">Ads</h2>
          <p className="text-sm text-slate-500">
            Paid spots are always labeled &ldquo;Sponsored&rdquo; for diners. One stall can hold the top spot at a time, and up to 3 dishes can be featured.
          </p>
        </div>
        {canEdit && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-900 px-3 py-2 text-sm font-bold text-white"
          >
            <Plus size={16} /> New ad
          </button>
        )}
      </div>

      {showForm && (
        <NewAdForm
          slug={me.court.slug}
          onDone={() => {
            setShowForm(false);
            load();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      <Card>
        {!placements ? (
          <div className="flex justify-center py-8 text-slate-400">
            <Loader2 className="animate-spin" />
          </div>
        ) : placements.length === 0 ? (
          <p className="text-sm text-slate-500">No ads yet.</p>
        ) : (
          <div className="-mx-4 overflow-x-auto px-4">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-2 font-semibold">Stall</th>
                  <th className="py-2 font-semibold">Spot</th>
                  <th className="py-2 font-semibold">When</th>
                  <th className="py-2 text-right font-semibold">Seen by</th>
                  <th className="py-2 text-right font-semibold">Tapped by</th>
                  <th className="py-2 text-right font-semibold">Price</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {placements.map((p) => {
                  const st = status(p, now);
                  const ctr = p.impressions > 0 ? Math.round((p.clicks / p.impressions) * 100) : 0;
                  return (
                    <tr key={p.id} className={st === "Ended" ? "text-slate-400" : ""}>
                      <td className="py-2.5 font-semibold">{p.restaurantName}</td>
                      <td className="py-2.5">
                        {SLOT_LABEL[p.slot]}
                        {p.menuItemName && <span className="block text-xs text-slate-500">{p.menuItemName}</span>}
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`mr-1.5 rounded px-1.5 py-0.5 text-[11px] font-bold ${
                            st === "Running" ? "bg-emerald-100 text-emerald-700" : st === "Scheduled" ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {st}
                        </span>
                        <span className="text-xs">
                          {fmt(p.startsAt)} – {fmt(p.endsAt)}
                        </span>
                      </td>
                      <td className="py-2.5 text-right tabular-nums">{p.impressions}</td>
                      <td className="py-2.5 text-right tabular-nums">
                        {p.clicks}
                        {p.impressions > 0 && <span className="ml-1 text-xs text-slate-400">({ctr}%)</span>}
                      </td>
                      <td className="py-2.5 text-right tabular-nums">₹{(p.priceCents / 100).toLocaleString("en-IN")}</td>
                      <td className="py-2.5 text-right">
                        {canEdit && st !== "Ended" && (
                          <button onClick={() => end(p)} className="text-xs font-bold text-red-600 hover:underline">
                            {st === "Scheduled" ? "Cancel" : "End now"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-xs text-slate-400">&ldquo;Seen by&rdquo; and &ldquo;Tapped by&rdquo; count different visitors. Prices are for your records; Qrave doesn&apos;t charge them.</p>
      </Card>
    </div>
  );
}

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function NewAdForm({ slug, onDone, onCancel }: { slug: string; onDone: () => void; onCancel: () => void }) {
  const [stalls, setStalls] = useState<OperatorStall[]>([]);
  const [restaurantId, setRestaurantId] = useState("");
  const [slot, setSlot] = useState<"top_stall" | "featured_item">("top_stall");
  const [dishes, setDishes] = useState<{ id: string; name: string }[]>([]);
  const [menuItemId, setMenuItemId] = useState("");
  const [initial] = useState(() => {
    const start = new Date();
    return { start: toLocalInput(start), end: toLocalInput(new Date(start.getTime() + 7 * 86400000)) };
  });
  const [startsAt, setStartsAt] = useState(initial.start);
  const [endsAt, setEndsAt] = useState(initial.end);
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fcAdmin.stalls().then((r) => setStalls(r.stalls.filter((s) => s.isListed))).catch(() => {});
  }, []);

  useEffect(() => {
    if (slot !== "featured_item" || !restaurantId) return;
    let cancelled = false;
    fetchStallMenu(slug, restaurantId)
      .then((m) => !cancelled && setDishes(m.items.map((i) => ({ id: String(i.id), name: String(i.name) }))))
      .catch(() => !cancelled && setDishes([]));
    return () => {
      cancelled = true;
    };
  }, [slot, restaurantId, slug]);

  const ready = useMemo(
    () => restaurantId && startsAt && endsAt && (slot === "top_stall" || menuItemId),
    [restaurantId, startsAt, endsAt, slot, menuItemId],
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    try {
      await fcAdmin.createPlacement({
        restaurant_id: restaurantId,
        slot,
        menu_item_id: slot === "featured_item" ? menuItemId : undefined,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: new Date(endsAt).toISOString(),
        price_cents: Math.round((parseFloat(price) || 0) * 100),
        note,
      });
      toast.success("Ad scheduled");
      onDone();
    } catch (err) {
      toast.error((err as Error).message || "Couldn't create ad");
      setBusy(false);
    }
  };

  const field = "mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm";
  return (
    <Card title="New ad">
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold">
          Stall
          <select value={restaurantId} onChange={(e) => (setRestaurantId(e.target.value), setMenuItemId(""))} className={field} required>
            <option value="">Choose a stall</option>
            {stalls.map((s) => (
              <option key={s.restaurantId} value={s.restaurantId}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          Spot
          <select value={slot} onChange={(e) => setSlot(e.target.value as typeof slot)} className={field}>
            <option value="top_stall">Top of stall list</option>
            <option value="featured_item">Featured dish</option>
          </select>
        </label>
        {slot === "featured_item" && (
          <label className="text-sm font-semibold sm:col-span-2">
            Dish
            <select value={menuItemId} onChange={(e) => setMenuItemId(e.target.value)} className={field} required disabled={!restaurantId}>
              <option value="">{restaurantId ? "Choose a dish" : "Choose a stall first"}</option>
              {dishes.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="text-sm font-semibold">
          Starts
          <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={field} required />
        </label>
        <label className="text-sm font-semibold">
          Ends
          <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={field} required />
        </label>
        <label className="text-sm font-semibold">
          Price (₹, for your records)
          <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" className={field} />
        </label>
        <label className="text-sm font-semibold">
          Note
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Optional" className={field} />
        </label>
        <div className="flex gap-2 sm:col-span-2">
          <button disabled={!ready || busy} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
            {busy ? "Saving…" : "Schedule ad"}
          </button>
          <button type="button" onClick={onCancel} className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}
