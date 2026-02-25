"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Users, Plus, Trash2, Edit2, AlertTriangle, Loader2, Eye, EyeOff } from "lucide-react";
import { api } from "@/app/lib/api";
import toast from "react-hot-toast";

type StaffMember = {
  ID: string;
  Email: string;
  Name?: string | null;
  Phone?: string | null;
  Role: string;
};

type StaffDetail = {
  ID: string;
  Email: string;
  Name?: string | null;
  Phone?: string | null;
  Role: string;
};

type Props = {
  onRefresh?: () => void;
};

export default function StaffManager({ onRefresh }: Props) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editFormLoading, setEditFormLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    email: "",
    name: "",
    phone: "",
    role: "",
    password: "",
  });

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
      await api(`/api/admin/delete/${deletingId}`, {
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

  const openEdit = async (staffId: string) => {
    setEditingId(staffId);
    setIsEditing(true);
    setShowPassword(false);
    setEditFormLoading(true);
      setEditForm({ email: "", name: "", phone: "", role: "", password: "" });
    try {
      const detail = await api<StaffDetail>(`/api/admin/staffDetails/${staffId}`, {
        method: "GET",
      });
      const email = detail?.Email || "";
      setEditForm({
        email: email.includes('@internal.nologin') ? "" : email,
        name: detail?.Name || "",
        phone: detail?.Phone || "",
        role: detail?.Role || "waiter",
        password: "",
      });
    } catch {
      toast.error("Failed to load staff details");
      setIsEditing(false);
      setEditingId(null);
    } finally {
      setEditFormLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    setIsSavingEdit(true);
    try {
      await api(`/api/admin/staffDetails/${editingId}`, {
        method: "PUT",
        body: JSON.stringify({
          email: editForm.email || undefined,
          name: editForm.name || undefined,
          phone: editForm.phone || undefined,
          role: editForm.role,
          password: editForm.password,
        }),
      });
      toast.success("Staff member updated");
      setIsEditing(false);
      setEditingId(null);
      await fetchStaff();
      if (onRefresh) onRefresh();
    } catch (err: unknown) {
      const message = err && typeof err === "object" && "message" in err
        ? String((err as { message?: string }).message || "")
        : "";
      toast.error(message || "Failed to update staff");
    } finally {
      setIsSavingEdit(false);
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
                {s.Name || s.Email.split('@')[0]}
              </p>
              <p className="text-[11px] text-slate-500 truncate font-medium">
                {s.Phone ? `${s.Email.startsWith('staff.') ? '' : s.Email + ' · '}${s.Phone}` : (s.Email.startsWith('staff.') ? 'No login email' : s.Email)}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className={`text-[10px] uppercase tracking-widest font-extrabold px-2 py-1 rounded-md border ${s.Role === "delivery_rider"
                ? "bg-indigo-50 text-indigo-600 border-indigo-200"
                : s.Role === "manager"
                  ? "bg-violet-50 text-violet-600 border-violet-200"
                  : s.Role === "kitchen"
                    ? "bg-amber-50 text-amber-600 border-amber-200"
                    : "bg-slate-100 text-slate-500 border-slate-200"
                }`}>
                {s.Role === "delivery_rider" ? "Rider" : s.Role}
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEdit(s.ID)}
                  className="p-2 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-900 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
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

      {isEditing && editingId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Edit Staff Member</h3>
            <p className="text-sm text-slate-500 mb-6">
              Update the existing details and save changes.
            </p>

            {editFormLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. John Doe"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Email <span className="text-slate-300 normal-case font-normal">(optional • used for login)</span>
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="Leave blank to keep current"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Phone <span className="text-slate-300 normal-case font-normal">(optional)</span>
                  </label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Role
                  </label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, role: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                  >
                    <option value="manager">Manager</option>
                    <option value="kitchen">Chef</option>
                    <option value="waiter">Waiter</option>
                    <option value="cashier">Cashier</option>
                    <option value="delivery_rider">Delivery Rider</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    New Password (optional)
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={editForm.password}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, password: e.target.value }))}
                      placeholder="Leave blank to keep current"
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditingId(null);
                }}
                className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                disabled={isSavingEdit || editFormLoading}
                className="flex-1 py-3 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isSavingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
