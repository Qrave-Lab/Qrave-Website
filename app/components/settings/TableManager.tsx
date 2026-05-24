"use client";

import React from "react";
import { Receipt, Plus, Trash2, Edit2, XCircle, Users } from "lucide-react";
import type { Table } from "@/app/components/settings/types";
import ConfirmModal from "@/app/components/ui/ConfirmModal";
import Link from "next/link";

type Props = {
  tables: Table[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onUpdateMeta: (id: string, floorName: string, counterName: string, capacity: number) => void;
};

export default function TableManager({ tables, onToggle, onRemove, onUpdateMeta }: Props) {
  const [pendingDelete, setPendingDelete] = React.useState<Table | null>(null);
  const [editingTable, setEditingTable] = React.useState<Table | null>(null);
  const [editFloor, setEditFloor] = React.useState("");
  const [editCounter, setEditCounter] = React.useState("");
  const [editCapacity, setEditCapacity] = React.useState(4);
  const [floorFilter, setFloorFilter] = React.useState<string>("all");

  const floors = Array.from(
    new Set(tables.map((t) => (t.floor_name || "Main Floor").trim()).filter(Boolean))
  ).sort();
  const counters = Array.from(
    new Set(tables.map((t) => (t.counter_name || "Counter A").trim()).filter(Boolean))
  ).sort();
  const filteredTables = tables.filter(
    (t) => floorFilter === "all" || (t.floor_name || "Main Floor") === floorFilter
  );

  const openEdit = (table: Table) => {
    setEditingTable(table);
    setEditFloor(table.floor_name || "");
    setEditCounter(table.counter_name || "");
    setEditCapacity(table.capacity ?? 4);
  };

  return (
    <>
      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-gray-500" /> Floor Plan
          </h2>
          <Link
            href="/staff/settings/tables/add"
            className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-gray-800 transition-colors flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add Table
          </Link>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 rounded-xl border border-gray-100 bg-gray-50 p-3">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Show Floor</span>
            <select
              value={floorFilter}
              onChange={(e) => setFloorFilter(e.target.value)}
              className="min-w-40 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700"
            >
              <option value="all">All Floors</option>
              {floors.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2">
            <div className="col-span-2">Table</div>
            <div className="col-span-2">Seats</div>
            <div className="col-span-3">Floor</div>
            <div className="col-span-2">Counter</div>
            <div className="col-span-1 text-center">On</div>
            <div className="col-span-2"></div>
          </div>

          {filteredTables.map((table) => (
            <div
              key={table.id ?? `table-${table.table_number}`}
              className="grid grid-cols-12 gap-2 items-center p-2 rounded-xl border border-gray-100 bg-white hover:border-gray-300 transition-all shadow-sm"
            >
              <div className="col-span-2">
                <span className="font-bold text-sm text-gray-900 px-1">T{table.table_number}</span>
              </div>

              {/* Capacity badge */}
              <div className="col-span-2">
                <span className="inline-flex items-center gap-0.5 rounded-lg border border-emerald-100 bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">
                  <Users className="h-3 w-3" />
                  {table.capacity ?? 4}
                </span>
              </div>

              <div className="col-span-3">
                <span className="inline-flex rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs font-medium text-gray-700 truncate max-w-full">
                  {table.floor_name || "Main Floor"}
                </span>
              </div>

              <div className="col-span-2">
                <span className="inline-flex rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs font-medium text-gray-700 truncate max-w-full">
                  {table.counter_name || "Counter A"}
                </span>
              </div>

              <div className="col-span-1 flex justify-center">
                <button
                  onClick={() => onToggle(table.id)}
                  className={`relative w-9 h-5 rounded-full transition-colors ${
                    table.is_enabled ? "bg-emerald-500" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                      table.is_enabled ? "translate-x-[18px]" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              <div className="col-span-2 flex justify-end gap-1">
                <button
                  onClick={() => openEdit(table)}
                  className="px-2 py-1 text-[10px] font-bold rounded-md border border-[#FFC529] text-[#FFC529] hover:bg-slate-50"
                >
                  <span className="inline-flex items-center gap-1">
                    <Edit2 className="w-3 h-3" /> Edit
                  </span>
                </button>
                <button
                  onClick={() => setPendingDelete(table)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          <datalist id="floor-options">
            {floors.map((f) => <option key={f} value={f} />)}
          </datalist>
          <datalist id="counter-options">
            {counters.map((c) => <option key={c} value={c} />)}
          </datalist>

          {filteredTables.length === 0 && (
            <div className="py-10 text-center text-gray-400 text-sm">
              No tables configured for this floor.
            </div>
          )}
        </div>
      </section>

      <ConfirmModal
        open={Boolean(pendingDelete)}
        title="Archive table?"
        message={pendingDelete ? `Archive table ${pendingDelete.table_number}?` : "Archive this table?"}
        confirmText="Archive"
        cancelText="Keep"
        destructive
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete?.id) onRemove(pendingDelete.id);
          setPendingDelete(null);
        }}
      />

      {/* Edit modal — floor, counter, capacity */}
      {editingTable && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/30 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-bold text-slate-900">
                Edit Table {editingTable.table_number}
              </h3>
              <button
                onClick={() => setEditingTable(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Floor
                </label>
                <input
                  list="floor-options"
                  value={editFloor}
                  onChange={(e) => setEditFloor(e.target.value)}
                  placeholder="e.g. Main Floor, Rooftop"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Counter / Section
                </label>
                <input
                  list="counter-options"
                  value={editCounter}
                  onChange={(e) => setEditCounter(e.target.value)}
                  placeholder="e.g. Counter A, Bar Section, VIP"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                />
              </div>

              {/* Capacity stepper */}
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Seating Capacity
                </label>
                <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <Users className="h-4 w-4 text-slate-400 shrink-0" />
                  <button
                    type="button"
                    onClick={() => setEditCapacity((c) => Math.max(1, c - 1))}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-lg font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    −
                  </button>
                  <span className="min-w-[2rem] text-center text-sm font-bold text-slate-900">
                    {editCapacity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditCapacity((c) => Math.min(100, c + 1))}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-lg font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    +
                  </button>
                  <span className="text-xs text-slate-400">guests max</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setEditingTable(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onUpdateMeta(
                      editingTable.id,
                      editFloor.trim() || "Main Floor",
                      editCounter.trim() || "Counter A",
                      editCapacity
                    );
                    setEditingTable(null);
                  }}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
