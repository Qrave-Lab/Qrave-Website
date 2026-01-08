import React from "react";
import Link from "next/link";
import { Users, Plus } from "lucide-react";
import { Staff } from "../page";

type Props = {
  staff: Staff[];
};

export default function StaffManager({ staff }: Props) {
  return (
    <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-500" /> Team Members
        </h2>
        <Link
          href="/staff/settings/AddStaff"
          className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-gray-800 transition-colors flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Add New
        </Link>
      </div>

      <div className="divide-y divide-gray-100">
        {staff.map((s) => (
          <div key={s.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
            <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm shrink-0">
              {s.name ? s.name.slice(0, 2).toUpperCase() : "?"}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">
                {s.name || "Unnamed Staff"}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {s.email || "No email provided"}
              </p>
            </div>

            <div className="text-[10px] uppercase tracking-wider font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded">
              {s.role}
            </div>
          </div>
        ))}

        {staff.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-sm text-gray-400">No team members found.</p>
          </div>
        )}
      </div>
    </section>
  );
}