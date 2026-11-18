"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRightLeft, Edit2, Loader2, MapPin, Plus, Search, Trash2, Users, X } from "lucide-react";
import { Avatar, STAFF_INPUT, STAFF_ROLES, StaffFields, isPlaceholderEmail, roleLabel } from "./StaffForm";
import { api } from "@/app/lib/api";
import toast from "react-hot-toast";

import { Select } from "@/app/components/ui/Select";
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
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
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
      toast.success("Team member removed");
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
    setEditFormLoading(true);
    setEditForm({ email: "", name: "", phone: "", role: "", password: "" });
    try {
      const detail = await api<StaffDetail>(`/api/admin/staffDetails/${staffId}`, {
        method: "GET",
      });
      const email = detail?.Email || "";
      const rawPhone = (detail?.Phone || "").replace(/\D/g, "");
      setEditForm({
        email: email.includes('@internal.nologin') ? "" : email,
        name: detail?.Name || "",
        phone: rawPhone.length > 10 ? rawPhone.slice(-10) : rawPhone,
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
    if (editForm.phone && editForm.phone.length !== 10) {
      toast.error("Enter all 10 digits of the phone number, or leave it empty");
      return;
    }
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
      toast.success("Team member updated");
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
      toast.success("Moved to the new branch");
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

  const multiBranch = isOwner && ownerBranches.length > 1;
  const q = query.trim().toLowerCase();
  const roleCounts = staff.reduce<Record<string, number>>((acc, s) => {
    acc[s.Role] = (acc[s.Role] || 0) + 1;
    return acc;
  }, {});
  const shown = staff
    .filter((s) => roleFilter === "all" || s.Role === roleFilter)
    .filter((s) => !q || (s.Name || "").toLowerCase().includes(q) || s.Email.toLowerCase().includes(q) || (s.Phone || "").includes(q))
    .sort((a, b) => (a.Name || a.Email).localeCompare(b.Name || b.Email));
  const deleting = staff.find((s) => s.ID === deletingId);
  const displayName = (s: StaffMember) => s.Name || s.Email.split("@")[0];

  const ICON_BTN = "inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#9CA3AF] transition-colors hover:bg-[#F3F3EF] hover:text-[#0F1117]";
  const OVERLAY = "fixed inset-0 z-[100] flex items-center justify-center bg-[#0F1117]/40 p-4 backdrop-blur-sm";
  const DIALOG = "w-full rounded-2xl border border-[#E8E8E3] bg-white shadow-[0_24px_60px_-20px_rgba(15,17,23,0.35)]";
  const BTN_CANCEL = "h-10 flex-1 rounded-xl border border-[#E8E8E3] bg-white text-[13px] font-semibold text-[#374151] transition-colors hover:border-[#D6D6CF] hover:text-[#0F1117]";
  const BTN_PRIMARY = "inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#fe5c13] text-[14px] font-semibold text-white transition-colors hover:bg-[#e44e0b] disabled:cursor-not-allowed disabled:opacity-50";

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-px overflow-hidden rounded-2xl border border-[#E8E8E3] bg-[#F0F0EB]">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 bg-white px-6 py-4">
            <div className="h-9 w-9 rounded-full bg-[#F3F3EF]" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-36 rounded bg-[#E8E8E3]" />
              <div className="h-3 w-48 rounded bg-[#F3F3EF]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {staff.length === 0 ? (
        <section className="flex flex-col items-center justify-center rounded-2xl border border-[#E8E8E3] bg-white px-6 py-20 text-center">
          <Users className="h-6 w-6 text-[#C4C4BE]" />
          <p className="mt-3 text-[15px] font-semibold text-[#0F1117]">No team members yet</p>
          <p className="mt-1 max-w-sm text-[13px] text-[#6B7280]">Add your managers, chefs, waiters and cashiers so they can sign in and take orders.</p>
          <Link
            href="/staff/settings/AddStaff"
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-[#fe5c13] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#e44e0b]"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} /> Add your first team member
          </Link>
        </section>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex h-9 max-w-full items-center gap-0.5 overflow-x-auto rounded-xl bg-[#F3F3EF] p-1" role="tablist" aria-label="Filter by role">
              {[{ id: "all", label: "Everyone" }, ...STAFF_ROLES.filter((r) => roleCounts[r.id])].map((r) => {
                const on = roleFilter === r.id;
                const n = r.id === "all" ? staff.length : roleCounts[r.id];
                return (
                  <button
                    key={r.id}
                    role="tab"
                    aria-selected={on}
                    onClick={() => setRoleFilter(r.id)}
                    className={`flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-[12px] transition-colors ${on ? "bg-white font-semibold text-[#0F1117] shadow-[0_1px_2px_rgba(15,17,23,0.06)]" : "font-medium text-[#6B7280] hover:text-[#0F1117]"}`}
                  >
                    {r.label}
                    <span className={`tabular-nums ${on ? "text-[#6B7280]" : "text-[#9CA3AF]"}`}>{n}</span>
                  </button>
                );
              })}
            </div>
            <div className="relative w-60">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, email or phone"
                aria-label="Search team"
                className="h-9 w-full rounded-xl border border-[#E8E8E3] bg-white pl-9 pr-3 text-[13px] text-[#0F1117] outline-none transition-colors placeholder:text-[#9CA3AF] hover:border-[#D6D6CF] focus:border-[#fe5c13]"
              />
            </div>
          </div>

          <section className="overflow-hidden rounded-2xl border border-[#E8E8E3] bg-white">
            {shown.length === 0 ? (
              <p className="px-6 py-14 text-center text-[13px] text-[#6B7280]">No one matches.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[#F0F0EB] text-[12px] text-[#6B7280]">
                      <th className="px-6 py-3 font-medium">Team member</th>
                      <th className="px-6 py-3 font-medium">Role</th>
                      <th className="px-6 py-3 font-medium">Sign in</th>
                      <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0F0EB] text-[13px]">
                    {shown.map((s) => {
                      const noLogin = isPlaceholderEmail(s.Email);
                      const contact = [noLogin ? "" : s.Email, s.Phone || ""].filter(Boolean).join(", ");
                      return (
                        <tr key={s.ID} className="transition-colors hover:bg-[#FAFAF7]">
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar name={displayName(s)} />
                              <div className="min-w-0">
                                <p className="truncate text-[14px] font-semibold text-[#0F1117]">{displayName(s)}</p>
                                <p className="mt-0.5 truncate text-[12px] tabular-nums text-[#9CA3AF]">{contact || "No contact details"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            <span className="inline-flex items-center rounded-full bg-[#F3F3EF] px-2.5 py-0.5 text-[12px] font-medium text-[#374151]">{roleLabel(s.Role)}</span>
                          </td>
                          <td className="px-6 py-3">
                            {noLogin ? (
                              <span className="text-[12px] text-[#9CA3AF]">No login</span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-emerald-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Can sign in
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-right">
                            <div className="flex items-center justify-end gap-0.5">
                              {multiBranch && s.Role === "manager" && (
                                <button onClick={() => openBranchAccess(s)} title="Branch access" aria-label={`Branch access for ${displayName(s)}`} className={ICON_BTN}>
                                  <MapPin className="h-4 w-4" />
                                </button>
                              )}
                              {multiBranch && s.Role !== "manager" && s.Role !== "owner" && (
                                <button onClick={() => openMoveBranch(s)} title="Move to another branch" aria-label={`Move ${displayName(s)} to another branch`} className={ICON_BTN}>
                                  <ArrowRightLeft className="h-4 w-4" />
                                </button>
                              )}
                              <button onClick={() => openEdit(s.ID)} title="Edit" aria-label={`Edit ${displayName(s)}`} className={ICON_BTN}>
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setDeletingId(s.ID)}
                                title="Remove"
                                aria-label={`Remove ${displayName(s)}`}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#9CA3AF] transition-colors hover:bg-rose-50 hover:text-rose-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {/* Remove */}
      {deletingId && (
        <div className={OVERLAY} role="alertdialog" aria-modal="true" aria-label="Remove team member">
          <div className={`${DIALOG} max-w-sm p-6`}>
            <h3 className="text-[17px] font-bold text-[#0F1117]">Remove {deleting ? displayName(deleting) : "this team member"}?</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[#6B7280]">They lose access straight away. This can&apos;t be undone.</p>
            <div className="mt-6 flex gap-2">
              <button onClick={() => setDeletingId(null)} className={BTN_CANCEL}>Keep</button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 text-[13px] font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit */}
      {isEditing && editingId && (
        <div className={OVERLAY} role="dialog" aria-modal="true" aria-label="Edit team member">
          <div className={`${DIALOG} flex max-h-[92vh] max-w-lg flex-col`}>
            <div className="flex items-start justify-between gap-4 px-6 pt-6">
              <div className="flex items-center gap-3">
                <Avatar name={editForm.name || editForm.email} size={40} />
                <div>
                  <h3 className="text-[17px] font-bold text-[#0F1117]">{editForm.name || "Edit team member"}</h3>
                  <p className="text-[13px] text-[#6B7280]">{roleLabel(editForm.role)}</p>
                </div>
              </div>
              <button onClick={() => { setIsEditing(false); setEditingId(null); }} aria-label="Close" className={`${ICON_BTN} -mr-2 -mt-1`}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {editFormLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-[#9CA3AF]" /></div>
              ) : (
                <StaffFields value={editForm} onChange={setEditForm} mode="edit" compact />
              )}
            </div>
            <div className="flex gap-2 border-t border-[#F0F0EB] px-6 py-4">
              <button onClick={() => { setIsEditing(false); setEditingId(null); }} className={BTN_CANCEL}>Cancel</button>
              <button onClick={handleUpdate} disabled={isSavingEdit || editFormLoading} className={BTN_PRIMARY}>
                {isSavingEdit ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving</> : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move branch */}
      {movingStaff && (
        <div className={OVERLAY} role="dialog" aria-modal="true" aria-label="Move to another branch">
          <div className={`${DIALOG} max-w-sm p-6`}>
            <h3 className="text-[17px] font-bold text-[#0F1117]">Move to another branch</h3>
            <p className="mt-1 text-[13px] text-[#6B7280]">{displayName(movingStaff)}</p>
            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[#4B5563]">From</label>
                <Select value={moveFromBranch} onChange={(e) => setMoveFromBranch(e.target.value)} className={STAFF_INPUT}>
                  {staffBranchesForMove.map((b) => (
                    <option key={b.restaurant_id} value={b.restaurant_id}>{b.restaurant}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[#4B5563]">To</label>
                <Select value={moveToBranch} onChange={(e) => setMoveToBranch(e.target.value)} className={STAFF_INPUT}>
                  <option value="" hidden>Choose a branch</option>
                  {ownerBranches
                    .filter((b) => b.restaurant_id !== moveFromBranch)
                    .map((b) => (
                      <option key={b.restaurant_id} value={b.restaurant_id}>{b.restaurant}</option>
                    ))}
                </Select>
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <button onClick={() => setMovingStaff(null)} className={BTN_CANCEL}>Cancel</button>
              <button onClick={handleMoveBranch} disabled={isMoving || !moveToBranch} className={BTN_PRIMARY}>
                {isMoving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Move"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Branch access (managers) */}
      {branchAccessStaff && (
        <div className={OVERLAY} role="dialog" aria-modal="true" aria-label="Branch access">
          <div className={`${DIALOG} max-w-sm p-6`}>
            <h3 className="text-[17px] font-bold text-[#0F1117]">Branch access</h3>
            <p className="mt-1 text-[13px] text-[#6B7280]">Choose which branches {displayName(branchAccessStaff)} can manage. Changes save straight away.</p>
            {branchAccessLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-[#9CA3AF]" /></div>
            ) : (
              <ul className="mt-5 divide-y divide-[#F0F0EB] rounded-xl border border-[#E8E8E3]">
                {ownerBranches.map((branch) => {
                  const granted = staffCurrentBranches.some((b) => b.restaurant_id === branch.restaurant_id);
                  const isToggling = togglingBranchId === branch.restaurant_id;
                  return (
                    <li key={branch.restaurant_id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <span className={`text-[14px] font-medium ${granted ? "text-[#0F1117]" : "text-[#6B7280]"}`}>{branch.restaurant}</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={granted}
                        aria-label={`Access to ${branch.restaurant}`}
                        onClick={() => handleToggleBranchAccess(branch.restaurant_id, granted)}
                        disabled={isToggling}
                        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${granted ? "bg-[#fe5c13]" : "bg-[#D6D6CF]"}`}
                      >
                        {isToggling ? (
                          <Loader2 className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 animate-spin text-white" />
                        ) : (
                          <span className={`absolute left-0.5 h-4 w-4 rounded-full bg-white shadow-[0_1px_2px_rgba(15,17,23,0.2)] transition-transform ${granted ? "translate-x-4" : "translate-x-0"}`} />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <button onClick={() => setBranchAccessStaff(null)} className="mt-6 h-10 w-full rounded-xl border border-[#E8E8E3] bg-white text-[13px] font-semibold text-[#374151] transition-colors hover:border-[#D6D6CF] hover:text-[#0F1117]">
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}
