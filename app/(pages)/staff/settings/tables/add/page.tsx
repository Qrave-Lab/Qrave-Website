"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, PlusSquare, Loader2 } from "lucide-react";
import StaffSidebar from "@/app/components/StaffSidebar";
import { api } from "@/app/lib/api";
import toast from "react-hot-toast";

type TableMeta = {
  id: string;
  floor_name?: string | null;
  counter_name?: string | null;
};

type CreatedTable = {
  id: string;
};

export default function AddTablesPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);

  // Raw string state so the user can clear / type freely
  const [countStr, setCountStr] = useState("1");
  const [floorName, setFloorName] = useState("");
  const [counterName, setCounterName] = useState("");

  // Existing floors/counters for autocomplete
  const [existingFloors, setExistingFloors] = useState<string[]>([]);
  const [existingCounters, setExistingCounters] = useState<string[]>([]);

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const tables = await api<TableMeta[]>("/api/admin/tables", { method: "GET" });
        if (Array.isArray(tables)) {
          const floors = Array.from(
            new Set(
              tables
                .map((t) => (t.floor_name || "").trim())
                .filter(Boolean)
            )
          ).sort();
          const counters = Array.from(
            new Set(
              tables
                .map((t) => (t.counter_name || "").trim())
                .filter(Boolean)
            )
          ).sort();
          setExistingFloors(floors);
          setExistingCounters(counters);
          // Pre-fill with first existing values as suggestions (not forced)
          if (floors.length > 0) setFloorName(floors[0]);
          if (counters.length > 0) setCounterName(counters[0]);
        }
      } catch {
        // Not critical — proceed without suggestions
      } finally {
        setIsLoadingMeta(false);
      }
    };
    loadMeta();
  }, []);

  const handleCreate = async () => {
    const count = parseInt(countStr, 10);
    if (!countStr || isNaN(count) || count < 1 || count > 200) {
      toast.error("Table count must be between 1 and 200");
      return;
    }
    const floor = floorName.trim() || "Main Floor";
    const counter = counterName.trim() || "Counter A";

    setIsSaving(true);
    try {
      for (let i = 0; i < count; i += 1) {
        const t = await api<CreatedTable>("/api/admin/tables", { method: "POST" });
        await api(`/api/admin/tables/${t.id}/meta`, {
          method: "PATCH",
          body: JSON.stringify({ floor_name: floor, counter_name: counter }),
        });
      }
      toast.success(`${count} table${count > 1 ? "s" : ""} added`);
      router.push("/staff/settings/floor-plan");
    } catch (err: any) {
      toast.error(err?.message || "Failed to add tables");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-50">
      <StaffSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl space-y-4">
          <button
            onClick={() => router.push("/staff/settings/floor-plan")}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Floor Plan
          </button>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-4">
              <h1 className="text-xl font-black text-slate-900">Add Tables</h1>
              <p className="mt-1 text-sm text-slate-500">
                Create one or more tables for a selected floor and counter.
              </p>
            </div>

            {isLoadingMeta ? (
              <div className="flex justify-center items-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : (
              <div className="space-y-5 p-6">
                {/* Number of tables */}
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Number of Tables
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={countStr}
                    onChange={(e) => setCountStr(e.target.value)}
                    placeholder="1"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
                  />
                  <p className="mt-1 text-[10px] text-slate-400">Enter 1–200 tables to be created at once.</p>
                </div>

                {/* Floor */}
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Floor Name
                  </label>
                  <input
                    list="floor-suggestions"
                    value={floorName}
                    onChange={(e) => setFloorName(e.target.value)}
                    placeholder="e.g. Main Floor, Rooftop, Ground Floor"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
                  />
                  <datalist id="floor-suggestions">
                    {existingFloors.map((f) => (
                      <option key={f} value={f} />
                    ))}
                  </datalist>
                  {existingFloors.length > 0 && (
                    <p className="mt-1 text-[10px] text-slate-400">
                      Existing: {existingFloors.join(" · ")}
                    </p>
                  )}
                </div>

                {/* Counter */}
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Counter / Zone
                  </label>
                  <input
                    list="counter-suggestions"
                    value={counterName}
                    onChange={(e) => setCounterName(e.target.value)}
                    placeholder="e.g. Counter A, Bar Section, VIP"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
                  />
                  <datalist id="counter-suggestions">
                    {existingCounters.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                  {existingCounters.length > 0 && (
                    <p className="mt-1 text-[10px] text-slate-400">
                      Existing: {existingCounters.join(" · ")}
                    </p>
                  )}
                </div>

                {/* Preview */}
                {(floorName || counterName) && (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                    <span className="font-bold text-slate-800">Preview: </span>
                    {parseInt(countStr, 10) > 0 ? parseInt(countStr, 10) : 1} table{parseInt(countStr, 10) > 1 ? "s" : ""} on{" "}
                    <span className="font-semibold text-slate-900">{floorName.trim() || "Main Floor"}</span> ·{" "}
                    <span className="font-semibold text-slate-900">{counterName.trim() || "Counter A"}</span>
                  </div>
                )}

                <button
                  onClick={handleCreate}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50 hover:bg-slate-800 transition-colors"
                >
                  {isSaving ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Adding...</>
                  ) : (
                    <><PlusSquare className="h-4 w-4" /> Add Tables</>
                  )}
                </button>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
