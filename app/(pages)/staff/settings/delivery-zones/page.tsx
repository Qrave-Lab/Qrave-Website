"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bike, Plus, Trash2, Loader2, MapPin, Clock, Save, X } from "lucide-react";
import StaffSidebar from "@/app/components/StaffSidebar";
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

const emptyForm: ZoneForm = { name: "", distance_km: "", fee: "", estimated_minutes: "" };

export default function DeliveryZonesPage() {
    const router = useRouter();
    const [zones, setZones] = useState<DeliveryZone[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<ZoneForm>(emptyForm);
    const [showAdd, setShowAdd] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await api<{ zones?: DeliveryZone[] }>("/api/admin/delivery/zones");
                setZones(res?.zones || []);
            } catch {
                toast.error("Failed to load zones");
            } finally {
                setIsLoading(false);
            }
        };
        load();
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
        if (!form.name.trim()) { toast.error("Zone name required"); return; }
        const fee = parseFloat(form.fee);
        if (isNaN(fee) || fee < 0) { toast.error("Invalid fee"); return; }
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
                isNew
                    ? [...prev.filter(z => z.id !== saved.id), saved]
                    : prev.map(z => z.id === saved.id ? saved : z)
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
        <div className="bg-indigo-50/40 border border-indigo-100 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-black text-slate-900">{isNew ? "Add New Zone" : "Edit Zone"}</h3>
            <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Zone Name *</label>
                    <input
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="e.g. City Centre, Zone A, 0–3 km"
                        className="w-full px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-50 focus:border-indigo-400 transition-all"
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        <MapPin className="w-3 h-3 inline mr-1" />Distance (km)
                    </label>
                    <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={form.distance_km}
                        onChange={e => setForm(f => ({ ...f, distance_km: e.target.value }))}
                        placeholder="e.g. 3.5"
                        className="w-full px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-50 focus:border-indigo-400 transition-all"
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Delivery Fee (₹) *</label>
                    <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={form.fee}
                        onChange={e => setForm(f => ({ ...f, fee: e.target.value }))}
                        placeholder="e.g. 50"
                        className="w-full px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-50 focus:border-indigo-400 transition-all"
                    />
                </div>
                <div className="col-span-2">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        <Clock className="w-3 h-3 inline mr-1" />Estimated Delivery Time (minutes)
                    </label>
                    <input
                        type="number"
                        min="0"
                        value={form.estimated_minutes}
                        onChange={e => setForm(f => ({ ...f, estimated_minutes: e.target.value }))}
                        placeholder="e.g. 30"
                        className="w-full px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-50 focus:border-indigo-400 transition-all"
                    />
                </div>
            </div>
            <div className="flex gap-2 pt-1">
                <button
                    onClick={() => saveZone(isNew)}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {isSaving ? "Saving..." : "Save Zone"}
                </button>
                <button
                    onClick={cancelEdit}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                    <X className="w-4 h-4" /> Cancel
                </button>
            </div>
        </div>
    );

    return (
        <div className="flex h-screen w-full bg-slate-50">
            <StaffSidebar />
            <main className="flex-1 overflow-y-auto p-6">
                <div className="mx-auto max-w-2xl space-y-5">
                    <button
                        onClick={() => router.push("/staff/settings")}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" /> Back to Settings
                    </button>

                    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
                            <div>
                                <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
                                    <Bike className="w-5 h-5 text-indigo-500" /> Delivery Zones
                                </h1>
                                <p className="mt-1 text-sm text-slate-500">
                                    Configure delivery areas and fees based on distance or zone name.
                                </p>
                            </div>
                            {!showAdd && !editingId && (
                                <button
                                    onClick={startAdd}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors"
                                >
                                    <Plus className="w-4 h-4" /> Add Zone
                                </button>
                            )}
                        </div>

                        <div className="p-5 space-y-4">
                            {showAdd && renderForm(true)}

                            {isLoading ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                                </div>
                            ) : zones.length === 0 && !showAdd ? (
                                <div className="text-center py-12 text-slate-400">
                                    <Bike className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                    <p className="font-bold text-slate-600">No delivery zones yet</p>
                                    <p className="text-sm mt-1">Add zones with different fees for each delivery area.</p>
                                    <button
                                        onClick={startAdd}
                                        className="mt-4 flex items-center gap-2 mx-auto px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors"
                                    >
                                        <Plus className="w-4 h-4" /> Add First Zone
                                    </button>
                                </div>
                            ) : (
                                zones.map(zone => (
                                    <div key={zone.id}>
                                        {editingId === zone.id ? (
                                            renderForm(false)
                                        ) : (
                                            <div className="flex items-center justify-between py-3 px-4 border border-slate-100 rounded-xl hover:border-slate-200 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                                                        <Bike className="w-5 h-5 text-indigo-500" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900">{zone.name}</p>
                                                        <div className="flex items-center gap-3 mt-0.5">
                                                            {zone.distance_km != null && (
                                                                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                                                                    <MapPin className="w-3 h-3" /> {zone.distance_km} km
                                                                </span>
                                                            )}
                                                            {zone.estimated_minutes != null && (
                                                                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                                                                    <Clock className="w-3 h-3" /> {zone.estimated_minutes} min
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-base font-black text-indigo-600">₹{zone.fee}</span>
                                                    <button
                                                        onClick={() => startEdit(zone)}
                                                        className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => deleteZone(zone.id)}
                                                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </section>

                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                        <h3 className="text-xs font-black text-blue-900 mb-2">💡 How distance-based pricing works</h3>
                        <p className="text-xs text-blue-700 leading-relaxed">
                            Create zones for different delivery areas. Staff select the applicable zone when placing a delivery order —
                            the fee is automatically added to the order total. You can use distance (km) as a reference or just descriptive zone names.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
