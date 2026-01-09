"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Users, Plus, Trash2, Edit2, AlertTriangle, Loader2 } from "lucide-react";
import { api } from "@/app/lib/api";
import toast from "react-hot-toast";

type StaffMember = {
  ID: string;
  Email: string;
  Role: string;
};

type Props = {
  restaurantId: string;
  onRefresh?: () => void;
};

export default function StaffManager({ restaurantId, onRefresh }: Props) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    setIsLoading(true);
    try {
      const data = await api<StaffMember[]>(`/api/admin/staffs`, {
        method: "GET",
      });
      setStaff(data || []);
    } catch (err) {
      toast.error("Failed to load staff list");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await api(`/api/admin/restaurants/${restaurantId}/staff/${deletingId}`, {
        method: "DELETE",
      });
      toast.success("Staff member removed");
      fetchStaff();
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error("Failed to delete staff");
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <h2 className="font-bold text-slate-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-slate-500" /> Team Members
        </h2>
        <Link
          href="/staff/settings/AddStaff"
          className="text-xs bg-slate-900 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-gray-800 transition-all flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Add New
        </Link>
      </div>

      <div className="divide-y divide-slate-100">
        {staff.map((s) => (
          <div key={s.ID} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-all group">
            <img 
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${s.Email}`} 
              alt="avatar" 
              className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 shrink-0"
            />
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">
                {s.Email.split('@')[0]}
              </p>
              <p className="text-[11px] text-slate-500 truncate font-medium">
                {s.Email}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[10px] uppercase tracking-widest font-extrabold bg-slate-100 text-slate-500 px-2 py-1 rounded-md border border-slate-200">
                {s.Role}
              </span>
              
              <div className="flex items-center gap-1">
                <Link 
                  href={`/staff/settings/EditStaff/${s.ID}`}
                  className="p-2 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-900 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </Link>
                <button 
                  onClick={() => setDeletingId(s.ID)}
                  className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {staff.length === 0 && (
          <div className="p-12 text-center text-slate-400 text-sm font-medium">
            No team members onboarded yet.
          </div>
        )}
      </div>

      {deletingId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-200">
            <div className="flex items-center justify-center w-14 h-14 bg-red-50 text-red-500 rounded-2xl mb-6">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Remove Staff?</h3>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed">
              This will revoke all access for this member immediately. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-all flex items-center justify-center gap-2"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}