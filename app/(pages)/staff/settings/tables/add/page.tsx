"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, PlusSquare } from "lucide-react";
import StaffSidebar from "@/app/components/StaffSidebar";
import { api } from "@/app/lib/api";
import toast from "react-hot-toast";

type CreatedTable = {
  id: string;
};

export default function AddTablesPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [count, setCount] = useState(1);
  const [floorName, setFloorName] = useState("Main Floor");
  const [counterName, setCounterName] = useState("Counter A");

  const handleCreate = async () => {
    if (count < 1 || count > 200) {
      toast.error("Table count must be between 1 and 200");
      return;
    }

    setIsSaving(true);
    try {
      for (let i = 0; i < count; i += 1) {
        const t = await api<CreatedTable>("/api/admin/tables", { method: "POST" });
        await api(`/api/admin/tables/${t.id}/meta`, {
          method: "PATCH",
          body: JSON.stringify({
            floor_name: floorName,
            counter_name: counterName,
          }),
        });
      }
      toast.success(`${count} table${count > 1 ? "s" : ""} added`);
      router.push("/staff/settings");
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
        <div className="mx-auto max-w-2xl">
          <button
            onClick={() => router.push("/staff/settings")}
            className="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Settings
          </button>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-4">
              <h1 className="text-xl font-black text-slate-900">Add Tables</h1>
              <p className="mt-1 text-sm text-slate-500">Create one or more tables for a selected floor/counter.</p>
            </div>
            <div className="space-y-4 p-6">
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Number of tables</label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={count}
                  onChange={(e) => setCount(Math.max(1, Math.min(200, Number(e.target.value) || 1)))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Floor</label>
                <input
                  value={floorName}
                  onChange={(e) => setFloorName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Main Floor"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Counter</label>
                <input
                  value={counterName}
                  onChange={(e) => setCounterName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Counter A"
                />
              </div>

              <button
                onClick={handleCreate}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                <PlusSquare className="h-4 w-4" /> {isSaving ? "Adding..." : "Add Tables"}
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
