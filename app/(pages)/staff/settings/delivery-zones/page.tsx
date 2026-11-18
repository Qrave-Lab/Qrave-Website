"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Bike, Edit2, Info, Loader2, Plus, Trash2, X } from "lucide-react";
import ConfirmModal from "@/app/components/ui/ConfirmModal";
import SettingsPageLayout from "@/app/components/settings/SettingsPageLayout";
import { api } from "@/app/lib/api";
import toast from "react-hot-toast";

type DeliveryZone = {
  id: string;
  name: string;
  distance_km?: number | null;
  fee: number;
  estimated_minutes?: number | null;
  sort_order: number;
};

type ZoneForm = {
  name: string;
  distance_km: string;
  fee: string;
  estimated_minutes: string;
};

const emptyForm: ZoneForm = {
  name: "",
  distance_km: "",
  fee: "",
  estimated_minutes: "",
};

export default function DeliveryZonesPage() {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ZoneForm>(emptyForm);
  const [showAdd, setShowAdd] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<DeliveryZone | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api<{ zones?: DeliveryZone[] }>("/api/admin/delivery/zones");
        setZones(res?.zones || []);
      } catch {
        toast.error("Failed to load zones");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const startEdit = (zone: DeliveryZone) => {
    setEditingId(zone.id);
    setForm({
      name: zone.name,
      distance_km: zone.distance_km != null ? String(zone.distance_km) : "",
      fee: String(zone.fee),
      estimated_minutes: zone.estimated_minutes != null ? String(zone.estimated_minutes) : "",
    });
    setShowAdd(false);
  };

  const startAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowAdd(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowAdd(false);
    setForm(emptyForm);
  };

  const saveZone = async (isNew: boolean) => {
    if (!form.name.trim()) {
      toast.error("Give the zone a name");
      return;
    }
    const fee = parseFloat(form.fee);
    if (isNaN(fee) || fee < 0) {
      toast.error("Enter a delivery charge of 0 or more");
      return;
    }
    setIsSaving(true);
    try {
      const payload: any = {
        name: form.name.trim(),
        fee,
        sort_order: isNew ? zones.length : zones.find(z => z.id === editingId)?.sort_order ?? 0,
      };
      if (form.distance_km.trim()) {
        const d = parseFloat(form.distance_km);
        if (!isNaN(d)) payload.distance_km = d;
      }
      if (form.estimated_minutes.trim()) {
        const m = parseInt(form.estimated_minutes, 10);
        if (!isNaN(m)) payload.estimated_minutes = m;
      }
      const saved = await api<DeliveryZone>("/api/admin/delivery/zones", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast.success(isNew ? "Zone added" : "Zone updated");
      setZones(prev =>
        isNew ? [...prev.filter(z => z.id !== saved.id), saved] : prev.map(z => z.id === saved.id ? saved : z)
      );
      cancelEdit();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save zone");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteZone = async (id: string) => {
    try {
      await api(`/api/admin/delivery/zones/${id}`, { method: "DELETE" });
      setZones(prev => prev.filter(z => z.id !== id));
      toast.success("Zone removed");
    } catch {
      toast.error("Failed to remove zone");
    }
  };

  const sorted = useMemo(
    () =>
      [...zones].sort((a, b) => {
        const da = a.distance_km ?? Number.POSITIVE_INFINITY;
        const db = b.distance_km ?? Number.POSITIVE_INFINITY;
        return da - db || a.fee - b.fee || a.name.localeCompare(b.name);
      }),
    [zones]
  );
  const withDistance = sorted.filter((z) => z.distance_km != null && z.distance_km > 0);
  const maxKm = withDistance.length ? Math.max(...withDistance.map((z) => z.distance_km as number)) : 0;
  const LADDER = ["#FFF4EC", "#FFE7D6", "#FFD7BC", "#FFC6A0", "#FDB384", "#FBA06A"];
  const fmtFee = (n: number) => (n === 0 ? "Free" : `₹${n.toLocaleString("en-IN")}`);
  const fmtKm = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)} km`;

  const INPUT_WRAP =
    "flex h-10 overflow-hidden rounded-xl border border-[#E8E8E3] bg-white transition-colors hover:border-[#D6D6CF] focus-within:border-[#fe5c13]";
  const INPUT_BARE = "w-full min-w-0 bg-transparent px-3.5 text-[14px] tabular-nums text-[#0F1117] outline-none placeholder:text-[#9CA3AF]";
  const ADDON = "flex shrink-0 items-center border-[#E8E8E3] bg-[#F3F3EF] px-3 text-[13px] font-medium text-[#6B7280]";
  const LABEL = "mb-1.5 block text-[13px] font-medium text-[#4B5563]";

  const formOpen = showAdd || editingId !== null;
  const previewFee = parseFloat(form.fee);
  const previewKm = parseFloat(form.distance_km);
  const previewMin = parseInt(form.estimated_minutes, 10);

  return (
    <SettingsPageLayout
      title="Delivery zones"
      description="Where you deliver and what each area costs"
      maxWidth="max-w-4xl"
      action={
        <button
          onClick={startAdd}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#fe5c13] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#e44e0b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fe5c13]/40 focus-visible:ring-offset-2"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} /> Add zone
        </button>
      }
    >
      {isLoading ? (
        <div className="animate-pulse space-y-6">
          <div className="h-28 rounded-2xl border border-[#E8E8E3] bg-white" />
          <div className="space-y-px overflow-hidden rounded-2xl border border-[#E8E8E3] bg-[#F0F0EB]">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-white" />
            ))}
          </div>
        </div>
      ) : zones.length === 0 ? (
        <section className="flex flex-col items-center justify-center rounded-2xl border border-[#E8E8E3] bg-white px-6 py-20 text-center">
          <Bike className="h-6 w-6 text-[#C4C4BE]" />
          <p className="mt-3 text-[15px] font-semibold text-[#0F1117]">No delivery zones yet</p>
          <p className="mt-1 max-w-sm text-[13px] text-[#6B7280]">
            Add the areas you deliver to and what each one costs. Staff pick a zone on delivery orders and the charge is added for them.
          </p>
          <button
            onClick={startAdd}
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-[#fe5c13] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#e44e0b]"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} /> Add your first zone
          </button>
        </section>
      ) : (
        <>
          {withDistance.length > 0 && (
            <section className="rounded-2xl border border-[#E8E8E3] bg-white px-6 py-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-[15px] font-semibold text-[#0F1117]">Charges by distance</h2>
                <p className="text-[12px] text-[#6B7280]">From your kitchen out to {fmtKm(maxKm)}</p>
              </div>
              <div className="mt-4 flex h-11 overflow-hidden rounded-xl border border-[#E8E8E3]">
                {withDistance.map((z, i) => {
                  const prev = i === 0 ? 0 : (withDistance[i - 1].distance_km as number);
                  const span = Math.max((z.distance_km as number) - prev, 0);
                  return (
                    <div
                      key={z.id}
                      title={`${z.name}: ${fmtKm(prev)} to ${fmtKm(z.distance_km as number)}, ${fmtFee(z.fee)}`}
                      className={`flex min-w-[56px] items-center justify-center px-2 ${i > 0 ? "border-l border-white" : ""}`}
                      style={{ flexGrow: span || 0.0001, flexBasis: 0, background: LADDER[Math.min(i, LADDER.length - 1)] }}
                    >
                      <span className="truncate text-[13px] font-semibold tabular-nums text-[#0F1117]">{fmtFee(z.fee)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-1.5 flex text-[11px] tabular-nums text-[#9CA3AF]">
                <span className="w-0 overflow-visible whitespace-nowrap">0</span>
                {withDistance.map((z, i) => {
                  const prev = i === 0 ? 0 : (withDistance[i - 1].distance_km as number);
                  const span = Math.max((z.distance_km as number) - prev, 0);
                  return (
                    <span key={z.id} className="min-w-[56px] text-right" style={{ flexGrow: span || 0.0001, flexBasis: 0 }}>
                      {fmtKm(z.distance_km as number)}
                    </span>
                  );
                })}
              </div>
            </section>
          )}

          <section className="overflow-hidden rounded-2xl border border-[#E8E8E3] bg-white">
            <div className="flex items-center gap-2.5 border-b border-[#F0F0EB] px-6 py-4">
              <h2 className="text-[15px] font-semibold text-[#0F1117]">Zones</h2>
              <span className="rounded-full bg-[#F3F3EF] px-2.5 py-1 text-[12px] font-medium leading-none tabular-nums text-[#6B7280]">
                {zones.length}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#F0F0EB] text-[12px] text-[#6B7280]">
                    <th className="px-6 py-3 font-medium">Zone</th>
                    <th className="px-6 py-3 font-medium">Up to</th>
                    <th className="px-6 py-3 font-medium">Delivery time</th>
                    <th className="px-6 py-3 text-right font-medium">Charge</th>
                    <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F0EB] text-[13px] text-[#4B5563]">
                  {sorted.map((zone) => (
                    <tr key={zone.id} className="transition-colors hover:bg-[#FAFAF7]">
                      <td className="px-6 py-3.5 text-[14px] font-semibold text-[#0F1117]">{zone.name}</td>
                      <td className="px-6 py-3.5 tabular-nums">
                        {zone.distance_km != null ? fmtKm(zone.distance_km) : <span className="text-[#9CA3AF]">Any distance</span>}
                      </td>
                      <td className="px-6 py-3.5 tabular-nums">
                        {zone.estimated_minutes != null ? `About ${zone.estimated_minutes} min` : <span className="text-[#9CA3AF]">Not set</span>}
                      </td>
                      <td className="px-6 py-3.5 text-right text-[14px] font-semibold tabular-nums text-[#0F1117]">
                        {zone.fee === 0 ? <span className="text-emerald-700">Free</span> : `₹${zone.fee.toLocaleString("en-IN")}`}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex justify-end gap-0.5">
                          <button
                            onClick={() => startEdit(zone)}
                            aria-label={`Edit ${zone.name}`}
                            title="Edit zone"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#9CA3AF] transition-colors hover:bg-[#F3F3EF] hover:text-[#0F1117]"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setPendingDelete(zone)}
                            aria-label={`Delete ${zone.name}`}
                            title="Delete zone"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#9CA3AF] transition-colors hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <p className="flex items-start gap-2 px-1 text-[12px] leading-relaxed text-[#6B7280]">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#9CA3AF]" />
            Staff choose a zone when they place a delivery order, and its charge is added to the bill automatically.
          </p>
        </>
      )}

      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F1117]/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={showAdd ? "Add delivery zone" : "Edit delivery zone"}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveZone(showAdd);
            }}
            className="w-full max-w-md overflow-hidden rounded-2xl border border-[#E8E8E3] bg-white shadow-[0_24px_60px_-20px_rgba(15,17,23,0.35)]"
          >
            <div className="flex items-start justify-between gap-4 px-6 pt-6">
              <div>
                <h3 className="text-[17px] font-bold text-[#0F1117]">{showAdd ? "Add delivery zone" : "Edit delivery zone"}</h3>
                <p className="mt-1 text-[13px] text-[#6B7280]">Name the area and set what delivery there costs.</p>
              </div>
              <button
                type="button"
                onClick={cancelEdit}
                aria-label="Close"
                className="-mr-2 -mt-1 inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#9CA3AF] transition-colors hover:bg-[#F3F3EF] hover:text-[#0F1117]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-6 pt-5">
              <div>
                <label htmlFor="dz-name" className={LABEL}>Zone name</label>
                <input
                  id="dz-name"
                  autoFocus
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Nearby, City centre, 0 to 3 km"
                  className="h-10 w-full rounded-xl border border-[#E8E8E3] bg-white px-3.5 text-[14px] text-[#0F1117] outline-none transition-colors placeholder:text-[#9CA3AF] hover:border-[#D6D6CF] focus:border-[#fe5c13]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="dz-fee" className={LABEL}>Delivery charge</label>
                  <div className={INPUT_WRAP}>
                    <span className={`${ADDON} border-r`}>₹</span>
                    <input
                      id="dz-fee"
                      type="number"
                      min="0"
                      step="0.5"
                      inputMode="decimal"
                      value={form.fee}
                      onChange={(e) => setForm((f) => ({ ...f, fee: e.target.value }))}
                      placeholder="40"
                      className={`${INPUT_BARE} px-3`}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="dz-km" className={LABEL}>
                    Up to <span className="font-normal text-[#9CA3AF]">Optional</span>
                  </label>
                  <div className={INPUT_WRAP}>
                    <input
                      id="dz-km"
                      type="number"
                      min="0"
                      step="0.1"
                      inputMode="decimal"
                      value={form.distance_km}
                      onChange={(e) => setForm((f) => ({ ...f, distance_km: e.target.value }))}
                      placeholder="5"
                      className={INPUT_BARE}
                    />
                    <span className={`${ADDON} border-l`}>km</span>
                  </div>
                </div>
              </div>
              <div>
                <label htmlFor="dz-min" className={LABEL}>
                  Delivery time <span className="font-normal text-[#9CA3AF]">Optional</span>
                </label>
                <div className={`${INPUT_WRAP} w-40`}>
                  <input
                    id="dz-min"
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={form.estimated_minutes}
                    onChange={(e) => setForm((f) => ({ ...f, estimated_minutes: e.target.value }))}
                    placeholder="15"
                    className={INPUT_BARE}
                  />
                  <span className={`${ADDON} border-l`}>min</span>
                </div>
              </div>

              <div className="rounded-xl border border-[#F0F0EB] bg-[#FAFAF7] px-4 py-3">
                <p className="text-[12px] font-medium text-[#6B7280]">On a delivery order</p>
                <div className="mt-1.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-[#0F1117]">{form.name.trim() || "Zone name"}</p>
                    <p className="text-[12px] tabular-nums text-[#6B7280]">
                      {[
                        !isNaN(previewKm) && previewKm > 0 ? `Up to ${fmtKm(previewKm)}` : "Any distance",
                        !isNaN(previewMin) && previewMin > 0 ? `about ${previewMin} min` : null,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                  <span className="shrink-0 text-[15px] font-bold tabular-nums text-[#0F1117]">
                    {isNaN(previewFee) ? "₹—" : previewFee === 0 ? "Free" : `+ ₹${previewFee.toLocaleString("en-IN")}`}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-2 border-t border-[#F0F0EB] px-6 py-4">
              <button
                type="button"
                onClick={cancelEdit}
                className="h-10 flex-1 rounded-xl border border-[#E8E8E3] bg-white text-[13px] font-semibold text-[#374151] transition-colors hover:border-[#D6D6CF] hover:text-[#0F1117]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#fe5c13] text-[14px] font-semibold text-white transition-colors hover:bg-[#e44e0b] disabled:opacity-50"
              >
                {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving</> : showAdd ? "Add zone" : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmModal
        open={Boolean(pendingDelete)}
        title="Delete this zone?"
        message={pendingDelete ? `${pendingDelete.name} will no longer be offered on delivery orders.` : ""}
        confirmText="Delete zone"
        cancelText="Keep zone"
        destructive
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteZone(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </SettingsPageLayout>
  );
}
