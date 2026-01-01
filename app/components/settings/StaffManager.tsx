import React from "react";
import { Users, Plus, Trash2 } from "lucide-react";
import { Staff } from "../page";

type Props = {
  staff: Staff[];
  onAdd: () => void;
  onUpdate: (id: string, key: keyof Staff, value: any) => void;
  onRemove: (id: string) => void;
};

export default function StaffManager({ staff, onAdd, onUpdate, onRemove }: Props) {
  return (
    <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-500" /> Team Members
        </h2>
        <button
          onClick={onAdd}
          className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-gray-800 transition-colors flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>

      <div className="p-4 space-y-4">
        {staff.map((s) => (
          <div
            key={s.id}
            className="group border border-gray-100 rounded-xl p-4 hover:border-gray-300 hover:shadow-sm transition-all bg-white relative"
          >
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onRemove(s.id)}
                className="text-gray-400 hover:text-red-500 p-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                {s.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  value={s.name}
                  onChange={(e) => onUpdate(s.id, "name", e.target.value)}
                  className="w-full font-bold text-gray-900 text-sm outline-none bg-transparent border-b border-transparent focus:border-gray-200 placeholder-gray-400"
                  placeholder="Staff Name"
                />
                <input
                  value={s.email}
                  onChange={(e) => onUpdate(s.id, "email", e.target.value)}
                  className="w-full text-xs text-gray-500 outline-none bg-transparent border-b border-transparent focus:border-gray-200 placeholder-gray-300"
                  placeholder="email@address.com"
                />
                <div className="pt-1">
                  <select
                    value={s.role}
                    onChange={(e) => onUpdate(s.id, "role", e.target.value)}
                    className="text-xs bg-gray-100 border-none rounded-md px-2 py-1 text-gray-700 font-medium outline-none focus:ring-1 focus:ring-gray-300 cursor-pointer"
                  >
                    <option value="owner">Owner (Admin)</option>
                    <option value="manager">Manager</option>
                    <option value="staff">Staff</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}