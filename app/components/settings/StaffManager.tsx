"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Users, Plus, Trash2, Edit2, AlertTriangle, Loader2, Eye, EyeOff, MapPin, ArrowRightLeft, ToggleLeft, ToggleRight } from "lucide-react";
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

type BranchInfo = {
  restaurant_id: string;
  restaurant: string;
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

  // Branch management state
  const [ownerBranches, setOwnerBranches] = useState<BranchInfo[]>([]);
  const [isOwner, setIsOwner] = useState(false);

  // Move-branch modal
  const [movingStaff, setMovingStaff] = useState<StaffMember | null>(null);
  const [moveFromBranch, setMoveFromBranch] = useState<string>("");
  const [moveToBranch, setMoveToBranch] = useState<string>("");
  const [isMoving, setIsMoving] = useState(false);
  const [staffBranchesForMove, setStaffBranchesForMove] = useState<BranchInfo[]>([]);

  // Branch-access modal (managers)
  const [branchAccessStaff, setBranchAccessStaff] = useState<StaffMember | null>(null);
  const [staffCurrentBranches, setStaffCurrentBranches] = useState<BranchInfo[]>([]);
  const [branchAccessLoading, setBranchAccessLoading] = useState(false);
  const [togglingBranchId, setTogglingBranchId] = useState<string | null>(null);

  useEffect(() => {
    fetchStaff();
    fetchOwnerContext();
  }, []);

  const fetchOwnerContext = async () => {
    try {
      const me = await api<{ role?: string }>("/api/admin/me", { method: "GET" });
      if ((me?.role || "").toLowerCase() === "owner") {
        setIsOwner(true);
        const branches = await api<BranchInfo[]>("/api/admin/owner/branches", { method: "GET" });
        setOwnerBranches(branches || []);
      }
    } catch {
      // not owner or single branch — silently ignore
    }
  };

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

  // ── Move-branch helpers ───────────────────────────────────────────────────

  const openMoveBranch = async (member: StaffMember) => {
    setMovingStaff(member);
    try {
      const branches = await api<BranchInfo[]>(`/api/admin/staffDetails/${member.ID}/branches`, { method: "GET" });
      const list = branches || [];
      setStaffBranchesForMove(list);
      setMoveFromBranch(list[0]?.restaurant_id || "");
    } catch {
      toast.error("Failed to load staff branches");
      setMovingStaff(null);
      return;
    }
    setMoveToBranch("");
  };

  const handleMoveBranch = async () => {
    if (!movingStaff || !moveFromBranch || !moveToBranch) return;
    setIsMoving(true);
    try {
      await api(`/api/admin/staffDetails/${movingStaff.ID}/move-branch`, {
        method: "POST",
        body: JSON.stringify({ from_branch_id: moveFromBranch, to_branch_id: moveToBranch }),
      });
      toast.success("Branch updated");
      setMovingStaff(null);
      fetchStaff();
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as { message?: string }).message) : "";
      toast.error(msg || "Failed to move branch");
    } finally {
      setIsMoving(false);
    }
  };

  // ── Branch-access helpers (managers) ────────────────────────────────────

  const openBranchAccess = async (member: StaffMember) => {
    setBranchAccessStaff(member);
    setBranchAccessLoading(true);
    try {
      const branches = await api<BranchInfo[]>(`/api/admin/staffDetails/${member.ID}/branches`, { method: "GET" });
      setStaffCurrentBranches(branches || []);
    } catch {
      toast.error("Failed to load branch access");
      setBranchAccessStaff(null);
    } finally {
      setBranchAccessLoading(false);
    }
  };

  const handleToggleBranchAccess = async (branchId: string, currentlyGranted: boolean) => {
    if (!branchAccessStaff) return;
    setTogglingBranchId(branchId);
    try {
      await api(`/api/admin/staffDetails/${branchAccessStaff.ID}/branch-access`, {
        method: "POST",
        body: JSON.stringify({ branch_id: branchId, grant: !currentlyGranted }),
      });
      // Refresh the list
      const branches = await api<BranchInfo[]>(`/api/admin/staffDetails/${branchAccessStaff.ID}/branches`, { method: "GET" });
      setStaffCurrentBranches(branches || []);
      toast.success(!currentlyGranted ? "Branch access granted" : "Branch access removed");
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as { message?: string }).message) : "";
      toast.error(msg || "Failed to update branch access");
    } finally {
      setTogglingBranchId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 bg-[#f8fafc] px-8 py-8">
        <div className="animate-pulse space-y-3">
          {[1,2,3,4].map((i) => (
            <div key={i} className="flex items-center gap-4 bg-white border-b border-slate-100 py-4">
              <div className="w-10 h-10 rounded-full bg-slate-200" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-36 rounded bg-slate-200" />
                <div className="h-2.5 w-48 rounded bg-slate-100" />
              </div>
              <div className="h-6 w-16 rounded-md bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const multiBranch = isOwner && ownerBranches.length > 1;

  return (
    <section className="flex flex-col flex-1 min-h-0">
      {/* Action bar */}
      <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Staff Management</p>
          <h2 className="text-sm font-black text-slate-900 mt-0.5">Team Members</h2>
        </div>
        <Link
          href="/staff/settings/AddStaff"
          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 text-white px-4 py-2 text-xs font-bold hover:bg-gray-800 transition-all"
        >
          <Plus className="w-3.5 h-3.5" /> Add Staff
        </Link>
      </div>

      {/* Full-width table */}
      <div className="bg-white flex-1">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100">
            <tr className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400">
              <th className="px-8 py-3">Staff Member</th>
              <th className="px-8 py-3">Role</th>
              <th className="px-8 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {staff.map((s) => (
              <tr key={s.ID} className="hover:bg-slate-50/60 transition-colors group">
                <td className="px-8 py-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${s.Email}`}
                      alt="avatar"
                      className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">{s.Name || s.Email.split('@')[0]}</p>
                      <p className="text-[11px] text-slate-400 truncate font-medium mt-0.5">
                        {s.Phone ? `${s.Email.startsWith('staff.') ? '' : s.Email + ' · '}${s.Phone}` : (s.Email.startsWith('staff.') ? 'No login email' : s.Email)}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-4">
                  <span className={`inline-block text-[10px] uppercase tracking-widest font-extrabold px-2.5 py-1 rounded-md border ${
                    s.Role === "delivery_rider" ? "bg-orange-50 text-[#fe5c13] border-orange-200"
                    : s.Role === "manager"       ? "bg-violet-50 text-violet-600 border-violet-200"
                    : s.Role === "kitchen"        ? "bg-amber-50 text-amber-600 border-amber-200"
                    : s.Role === "cashier"        ? "bg-sky-50 text-sky-600 border-sky-200"
                    :                              "bg-slate-100 text-slate-500 border-slate-200"
                  }`}>
                    {s.Role === "delivery_rider" ? "Rider" : s.Role}
                  </span>
                </td>
                <td className="px-8 py-4">
                  <div className="flex items-center gap-1 justify-end">
                    {multiBranch && s.Role === "manager" && (
                      <button onClick={() => openBranchAccess(s)} title="Manage branch access"
                        className="p-2 hover:bg-violet-50 rounded-xl text-slate-400 hover:text-violet-600 transition-colors">
                        <ToggleRight className="w-4 h-4" />
                      </button>
                    )}
                    {multiBranch && s.Role !== "manager" && s.Role !== "owner" && (
                      <button onClick={() => openMoveBranch(s)} title="Change branch"
                        className="p-2 hover:bg-sky-50 rounded-xl text-slate-400 hover:text-sky-600 transition-colors">
                        <ArrowRightLeft className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => openEdit(s.ID)}
                      className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-800 transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeletingId(s.ID)}
                      className="p-2 hover:bg-red-50 rounded-xl text-slate-400 hover:text-red-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {staff.length === 0 && (
              <tr>
                <td colSpan={3} className="px-8 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center mb-1">
                      <Users className="w-5 h-5 text-slate-300" />
                    </div>
                    <p className="text-sm font-semibold text-slate-500">No team members onboarded yet.</p>
                    <p className="text-xs text-slate-400">Click "Add Staff" to invite your first team member.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Delete confirmation ──────────────────────────────────────── */}
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

      {/* ── Edit modal ──────────────────────────────────────────────── */}
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
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-[#fe5c13]"
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
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-[#fe5c13]"
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
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-[#fe5c13]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Role
                  </label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, role: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-[#fe5c13] bg-white"
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
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-[#fe5c13]"
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
                className="flex-1 py-3 rounded-xl bg-[#fe5c13] text-gray-900 font-bold text-sm hover:brightness-95 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isSavingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Move-branch modal ────────────────────────────────────────── */}
      {movingStaff && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-sky-50 rounded-2xl flex items-center justify-center">
                <ArrowRightLeft className="w-5 h-5 text-sky-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Change Branch</h3>
                <p className="text-xs text-slate-500">{movingStaff.Name || movingStaff.Email.split('@')[0]}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Current Branch
                </label>
                <select
                  value={moveFromBranch}
                  onChange={(e) => setMoveFromBranch(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 bg-white"
                >
                  {staffBranchesForMove.map((b) => (
                    <option key={b.restaurant_id} value={b.restaurant_id}>{b.restaurant}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Move To
                </label>
                <select
                  value={moveToBranch}
                  onChange={(e) => setMoveToBranch(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 bg-white"
                >
                  <option value="">Select a branch…</option>
                  {ownerBranches
                    .filter((b) => b.restaurant_id !== moveFromBranch)
                    .map((b) => (
                      <option key={b.restaurant_id} value={b.restaurant_id}>{b.restaurant}</option>
                    ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setMovingStaff(null)}
                className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleMoveBranch}
                disabled={isMoving || !moveToBranch}
                className="flex-1 py-3 rounded-xl bg-sky-500 text-white font-bold text-sm hover:bg-sky-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isMoving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Move"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Branch access modal (managers) ──────────────────────────── */}
      {branchAccessStaff && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-violet-50 rounded-2xl flex items-center justify-center">
                <MapPin className="w-5 h-5 text-violet-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Branch Access</h3>
                <p className="text-xs text-slate-500">{branchAccessStaff.Name || branchAccessStaff.Email.split('@')[0]}</p>
              </div>
            </div>

            {branchAccessLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              </div>
            ) : (
              <div className="space-y-2">
                {ownerBranches.map((branch) => {
                  const granted = staffCurrentBranches.some((b) => b.restaurant_id === branch.restaurant_id);
                  const isToggling = togglingBranchId === branch.restaurant_id;
                  return (
                    <div key={branch.restaurant_id} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-sm font-semibold text-slate-700">{branch.restaurant}</span>
                      <button
                        onClick={() => handleToggleBranchAccess(branch.restaurant_id, granted)}
                        disabled={isToggling}
                        className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${granted ? "bg-violet-500" : "bg-slate-300"} disabled:opacity-50`}
                      >
                        {isToggling ? (
                          <Loader2 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-white" />
                        ) : (
                          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${granted ? "left-5" : "left-0.5"}`} />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={() => setBranchAccessStaff(null)}
              className="w-full mt-6 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
