"use client";

import React from "react";
import { Receipt, Plus, Trash2 } from "lucide-react";
import { Table } from "@/app/(pages)/staff/settings/page";

type Props = {
  tables: Table[];
  onAdd: () => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
};

export default function TableManager({ tables, onAdd, onToggle, onRemove }: Props) {
  return (
    <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          <Receipt className="w-5 h-5 text-gray-500" /> Floor Plan
        </h2>
        <button
          onClick={onAdd}
          className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-gray-800 transition-colors flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Add Table
        </button>
      </div>

      <div className="p-4 space-y-3">
        <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2">
          <div className="col-span-7">Table Identifier</div>
          <div className="col-span-3 text-center">Status</div>
          <div className="col-span-2"></div>
        </div>

        {tables.map((table) => (
          <div
            key={table.id ?? `table-${table.table_number}`}
            className="grid grid-cols-12 gap-2 items-center p-2 rounded-xl border border-gray-100 bg-white hover:border-gray-300 transition-all shadow-sm"
          >
            <div className="col-span-7">
              <span className="font-bold text-sm text-gray-900 px-1">
                {table.table_number}
              </span>
            </div>
            
            <div className="col-span-3 flex justify-center">
              <button
                onClick={() => onToggle(table.id)}
               className={`relative w-10 h-6 rounded-full ${
  table.is_enabled ? "bg-emerald-500" : "bg-gray-200"
}`}

              >
                <span
                  className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
                    table.is_enabled ? "translate-x-4" : "translate-x-0"

                  }`}
                />
              </button>
            </div>

            <div className="col-span-2 flex justify-end">
              <button
                onClick={() => {
                  if (window.confirm(`Archive table ${table.table_number}?`)) {
                    onRemove(table.id);
                  }
                }}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {tables.length === 0 && (
          <div className="py-10 text-center text-gray-400 text-sm">
            No tables configured yet.
          </div>
        )}
      </div>
    </section>
  );
}