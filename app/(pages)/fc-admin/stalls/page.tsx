"use client";

import { useCallback, useEffect, useState } from "react";
import { Box, Check, Eye, EyeOff, Loader2, Pencil, X } from "lucide-react";
import { toast } from "react-hot-toast";
import { fcAdmin, type OperatorStall } from "@/app/lib/foodCourtAdmin";
import { cuisineLabel } from "@/app/lib/foodCourt";
import { Card, useOperator } from "../FcAdminShell";

export default function StallsPage() {
  const me = useOperator();
  const canEdit = me.role === "owner";
  const [stalls, setStalls] = useState<OperatorStall[] | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  const load = useCallback(() => {
    fcAdmin
      .stalls()
      .then((r) => setStalls(r.stalls))
      .catch(() => toast.error("Couldn't load stalls"));
  }, []);
  useEffect(load, [load]);

  const save = async (id: string, patch: Parameters<typeof fcAdmin.updateStall>[1]) => {
    try {
      await fcAdmin.updateStall(id, patch);
      setEditing(null);
      load();
    } catch (e) {
      toast.error((e as Error).message || "Couldn't save");
    }
  };

  if (!stalls) {
    return (
      <div className="flex justify-center py-16 text-slate-400">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-extrabold">Stalls</h2>
        <p className="text-sm text-slate-500">
          Each stall manages its own menu, photos and 3D dishes from its Qrave account. To add or remove a stall, contact Qrave.
        </p>
      </div>
      <Card>
        {stalls.length === 0 ? (
          <p className="text-sm text-slate-500">No stalls yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {stalls.map((s) =>
              editing === s.restaurantId ? (
                <EditRow key={s.restaurantId} stall={s} onCancel={() => setEditing(null)} onSave={(p) => save(s.restaurantId, p)} />
              ) : (
                <li key={s.restaurantId} className={`flex items-center gap-3 py-3 ${s.isListed ? "" : "opacity-60"}`}>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">
                      {s.name}
                      {s.stallLabel && <span className="ml-2 text-sm font-medium text-slate-400">{s.stallLabel}</span>}
                      {!s.isListed && <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-[11px] font-bold text-slate-600">Hidden</span>}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {s.itemCount} {s.itemCount === 1 ? "dish" : "dishes"}
                      {s.arItemCount > 0 && (
                        <span className="ml-2 inline-flex items-center gap-0.5">
                          · <Box size={12} /> {s.arItemCount} in 3D
                        </span>
                      )}
                      {s.cuisineTags.length > 0 && <> · {s.cuisineTags.map(cuisineLabel).join(", ")}</>}
                    </p>
                  </div>
                  {canEdit && (
                    <>
                      <button
                        onClick={() => save(s.restaurantId, { is_listed: !s.isListed })}
                        className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
                        aria-label={s.isListed ? "Hide from diners" : "Show to diners"}
                        title={s.isListed ? "Hide from diners" : "Show to diners"}
                      >
                        {s.isListed ? <Eye size={17} /> : <EyeOff size={17} />}
                      </button>
                      <button
                        onClick={() => setEditing(s.restaurantId)}
                        className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
                        aria-label="Edit stall"
                      >
                        <Pencil size={16} />
                      </button>
                    </>
                  )}
                </li>
              ),
            )}
          </ul>
        )}
      </Card>
    </div>
  );
}

function EditRow({
  stall,
  onCancel,
  onSave,
}: {
  stall: OperatorStall;
  onCancel: () => void;
  onSave: (p: { stall_label: string; cuisine_tags: string[] }) => void;
}) {
  const [label, setLabel] = useState(stall.stallLabel);
  const [tags, setTags] = useState(stall.cuisineTags.map(cuisineLabel).join(", "));
  return (
    <li className="grid gap-2 py-3 sm:grid-cols-[1fr_1fr_1.4fr_auto] sm:items-center">
      <p className="font-bold">{stall.name}</p>
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Label, e.g. Stall 12"
        maxLength={60}
        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm"
      />
      <input
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder="Cuisines, comma separated"
        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm"
      />
      <div className="flex gap-1">
        <button
          onClick={() => onSave({ stall_label: label, cuisine_tags: tags.split(",").map((t) => t.trim()).filter(Boolean) })}
          className="rounded-full bg-slate-900 p-2 text-white"
          aria-label="Save"
        >
          <Check size={16} />
        </button>
        <button onClick={onCancel} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Cancel">
          <X size={16} />
        </button>
      </div>
    </li>
  );
}
