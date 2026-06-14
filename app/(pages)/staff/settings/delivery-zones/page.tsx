"use client";

import React, { useEffect, useState } from "react";
import { Bike, Plus, Trash2, Loader2, MapPin, Clock, Save, X } from "lucide-react";
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
      toast.error("Zone name required");
      return;
    }
    const fee = parseFloat(form.fee);
    if (isNaN(fee) || fee < 0) {
      toast.error("Invalid fee");
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

  const renderForm = (isNew: boolean) => (
    <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-6 space-y-5 animate-slideDown mb-6 max-w-xl">
      <div>
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
          {isNew ? "New Delivery Zone" : "Modify Zone Settings"}
        </h3>
        <p className="text-xs font-semibold text-slate-500 mt-0.5">
          Define geographical boundaries and service charge rates.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 pl-1">
            Zone Name *
          </label>
          <input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g. City Centre, Zone A, 0–3 km"
            className="w-full h-11 px-4 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#fe5c13] focus:ring-4 focus:ring-orange-105 transition-all placeholder:text-slate-405"
          />
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 pl-1">
            Distance Limit (km)
          </label>
          <div className="relative flex items-center">
            <MapPin className="absolute left-4 w-4 h-4 text-slate-400" />
            <input
              type="number"
              min="0"
              step="0.1"
              value={form.distance_km}
              onChange={e => setForm(f => ({ ...f, distance_km: e.target.value }))}
              placeholder="e.g. 5"
              className="w-full h-11 pl-11 pr-4 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#fe5c13] focus:ring-4 focus:ring-orange-105 transition-all placeholder:text-slate-405"
            />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 pl-1">
            Delivery Charge (₹) *
          </label>
          <input
            type="number"
            min="0"
            step="0.5"
            value={form.fee}
            onChange={e => setForm(f => ({ ...f, fee: e.target.value }))}
            placeholder="e.g. 40"
            className="w-full h-11 px-4 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#fe5c13] focus:ring-4 focus:ring-orange-105 transition-all placeholder:text-slate-405"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 pl-1">
            Estimated Journey Time (minutes)
          </label>
          <div className="relative flex items-center">
            <Clock className="absolute left-4 w-4 h-4 text-slate-400" />
            <input
              type="number"
              min="0"
              value={form.estimated_minutes}
              onChange={e => setForm(f => ({ ...f, estimated_minutes: e.target.value }))}
              placeholder="e.g. 15"
              className="w-full h-11 pl-11 pr-4 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#fe5c13] focus:ring-4 focus:ring-orange-105 transition-all placeholder:text-slate-405"
            />
          </div>
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button
          onClick={() => saveZone(isNew)}
          disabled={isSaving}
          className="h-11 px-5 rounded-xl bg-[#fe5c13] hover:brightness-95 active:scale-[0.98] text-white text-xs font-black shadow-md shadow-orange-100 transition-all disabled:opacity-50 disabled:scale-100 disabled:shadow-none flex items-center justify-center gap-2"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Save className="w-4 h-4 text-white" />}
          {isSaving ? "Saving..." : "Save Zone"}
        </button>
        <button
          onClick={cancelEdit}
          className="h-11 px-5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-600 transition-all flex items-center justify-center gap-1.5"
        >
          <X className="w-4 h-4" /> Cancel
        </button>
      </div>
    </div>
  );

  return (
    <SettingsPageLayout
      title="Delivery Zones"
      description="Configure delivery areas and fees based on distance or zone name."
      fullBleed
    >
      <div className="flex flex-col flex-1 min-h-0 bg-[#f8fafc]">
        {/* Sticky top sub-header */}
        <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10 shrink-0">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Settings Hub</p>
            <h2 className="text-sm font-black text-slate-900 mt-0.5">Delivery Zones</h2>
          </div>
          {!showAdd && !editingId && (
            <button
              onClick={startAdd}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#fe5c13] hover:brightness-95 active:scale-[0.98] text-white text-xs font-black shadow-md shadow-orange-100 transition-all select-none"
            >
              <Plus className="w-4 h-4" /> Add Zone
            </button>
          )}
        </div>

        {/* Scrollable page body */}
        <div className="flex-1 bg-white px-8 py-8 overflow-y-auto space-y-6">
          {/* Loading skeleton */}
          {isLoading && (
            <div className="space-y-4 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-2xl bg-slate-100 w-full" />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && zones.length === 0 && !showAdd && (
            <div className="text-center py-16 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 max-w-xl mx-auto">
              <Bike className="w-10 h-10 mx-auto mb-3 opacity-30 text-slate-450" />
              <p className="font-black text-slate-700 text-sm">No delivery zones defined</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Add delivery coverage zones and price levels to automatically update fees during order checkout.
              </p>
              <button
                onClick={startAdd}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#fe5c13] hover:brightness-95 active:scale-[0.98] text-white text-xs font-black shadow-md shadow-orange-100 transition-all select-none"
              >
                <Plus className="w-4 h-4" /> Add First Zone
              </button>
            </div>
          )}

          {/* Zones list */}
          {!isLoading && (zones.length > 0 || showAdd) && (
            <div className="max-w-4xl divide-y divide-slate-100">
              {showAdd && renderForm(true)}
              {zones.map((zone) => (
                <div key={zone.id} className="py-4">
                  {editingId === zone.id ? (
                    renderForm(false)
                  ) : (
                    <div className="flex items-center justify-between hover:bg-slate-50/40 px-4 py-3 rounded-2xl transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100">
                          <Bike className="w-5 h-5 text-[#fe5c13]" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900">{zone.name}</p>
                          <div className="flex items-center gap-3 mt-1 text-[11px] font-semibold text-slate-400">
                            {zone.distance_km != null && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                {zone.distance_km} km
                              </span>
                            )}
                            {zone.estimated_minutes != null && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                {zone.estimated_minutes} mins
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-black text-[#fe5c13]">₹{zone.fee}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => startEdit(zone)}
                            className="text-[11px] font-black text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-50 px-3 h-8 rounded-xl border border-slate-200 shadow-sm transition-all"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteZone(zone.id)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50/50 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pricing info banner */}
          <div className="bg-sky-50/40 border border-sky-100/70 rounded-2xl p-5 max-w-4xl mt-8">
            <h3 className="text-xs font-black text-sky-950 mb-1.5 flex items-center gap-1.5">
              <span className="text-base leading-none">💡</span> How distance-based pricing works
            </h3>
            <p className="text-[11px] text-sky-850 leading-relaxed font-semibold">
              Create zones for different delivery areas. Staff select the applicable zone when placing a delivery order
              — the fee is automatically added to the order total.
            </p>
          </div>
        </div>
      </div>
    </SettingsPageLayout>
  );
}
