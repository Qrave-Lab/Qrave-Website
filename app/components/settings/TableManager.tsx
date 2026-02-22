"use client";

import React from "react";
import { Receipt, Plus, Trash2, Edit2, XCircle } from "lucide-react";
import type { Table } from "@/app/components/settings/types";
import ConfirmModal from "@/app/components/ui/ConfirmModal";
import Link from "next/link";

type Props = {
  tables: Table[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onUpdateMeta: (id: string, floorName: string, counterName: string) => void;
};

export default function TableManager({ tables, onToggle, onRemove, onUpdateMeta }: Props) {
  const [pendingDelete, setPendingDelete] = React.useState<Table | null>(null);
  const [editingTable, setEditingTable] = React.useState<Table | null>(null);
  const [editFloor, setEditFloor] = React.useState("Main Floor");
  const [editCounter, setEditCounter] = React.useState("Counter A");
  const [floorFilter, setFloorFilter] = React.useState<string>("all");

  const floors = Array.from(new Set(tables.map((t) => (t.floor_name || "Main Floor").trim()).filter(Boolean))).sort();
  const counters = Array.from(new Set(tables.map((t) => (t.counter_name || "Counter A").trim()).filter(Boolean))).sort();
  const filteredTables = tables.filter((t) => floorFilter === "all" || (t.floor_name || "Main Floor") === floorFilter);

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
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2">
          <div className="col-span-2">Table</div>
          <div className="col-span-3">Floor</div>
          <div className="col-span-3">Counter</div>
          <div className="col-span-2 text-center">Status</div>
          <div className="col-span-2"></div>
        </div>

        {filteredTables.map((table) => (
          <div
            key={table.id ?? `table-${table.table_number}`}
            className="grid grid-cols-12 gap-2 items-center p-2 rounded-xl border border-gray-100 bg-white hover:border-gray-300 transition-all shadow-sm"
          >
            <div className="col-span-2">
              <span className="font-bold text-sm text-gray-900 px-1">
                {table.table_number}
              </span>
            </div>

            <div className="col-span-3">
              <span className="inline-flex rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs font-medium text-gray-700">
                {table.floor_name || "Main Floor"}
              </span>
            </div>

            <div className="col-span-3">
              <span className="inline-flex rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs font-medium text-gray-700">
                {table.counter_name || "Counter A"}
              </span>
            </div>

            <div className="col-span-2 flex justify-center">
              <button
                onClick={() => onToggle(table.id)}
                className={`relative w-10 h-6 rounded-full ${table.is_enabled ? "bg-emerald-500" : "bg-gray-200"}`}

              >
                <span
                  className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
                    table.is_enabled ? "translate-x-4" : "translate-x-0"

                  }`}
                />
              </button>
            </div>

            <div className="col-span-2 flex justify-end gap-1">
              <button
                onClick={() => {
                  setEditingTable(table);
                  setEditFloor(table.floor_name || "Main Floor");
                  setEditCounter(table.counter_name || "Counter A");
                }}
                className="px-2 py-1 text-[10px] font-bold rounded-md border border-indigo-200 text-indigo-600 hover:bg-indigo-50"
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
          {floors.map((f) => (
            <option key={f} value={f} />
          ))}
        </datalist>
        <datalist id="counter-options">
          {counters.map((c) => (
            <option key={c} value={c} />
          ))}
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
        message={
          pendingDelete
            ? `Archive table ${pendingDelete.table_number}?`
            : "Archive this table?"
        }
        confirmText="Archive"
        cancelText="Keep"
        destructive
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete?.id) onRemove(pendingDelete.id);
          setPendingDelete(null);
        }}
      />

      {editingTable && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/30 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-bold text-slate-900">Edit Table {editingTable.table_number}</h3>
              <button
                onClick={() => setEditingTable(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 p-5">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Floor</label>
                <input
                  list="floor-options"
                  value={editFloor}
                  onChange={(e) => setEditFloor(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Counter</label>
                <input
                  list="counter-options"
                  value={editCounter}
                  onChange={(e) => setEditCounter(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setEditingTable(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onUpdateMeta(editingTable.id, editFloor, editCounter);
                    setEditingTable(null);
                  }}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white"
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
