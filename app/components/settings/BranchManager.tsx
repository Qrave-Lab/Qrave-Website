"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Building2, Plus, Save, Archive, UserPlus } from "lucide-react";
import { api } from "@/app/lib/api";
import toast from "react-hot-toast";
import Link from "next/link";

type Branch = {
  restaurant_id: string;
  name: string;
  currency: string;
  address?: string | null;
  phone?: string | null;
  role: string;
  is_archived?: boolean;
};

type BranchStaff = {
  ID: string;
  Email: string;
  Role: string;
};

export default function BranchManager() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [branchStaff, setBranchStaff] = useState<BranchStaff[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    currency: "INR",
    address: "",
    phone: "",
  });
  const [assignForm, setAssignForm] = useState({
    email: "",
    password: "",
    role: "cashier",
  });

  const selectedBranch = useMemo(
    () => branches.find((b) => b.restaurant_id === selectedBranchId) || null,
    [branches, selectedBranchId]
  );

  const loadBranches = async () => {
    const res = await api<{ branches: Branch[] }>("/api/admin/branches?include_archived=0");
    const list = res?.branches || [];
    setBranches(list);
    const nextSelected = selectedBranchId && list.some((b) => b.restaurant_id === selectedBranchId)
      ? selectedBranchId
      : (list[0]?.restaurant_id || "");
    setSelectedBranchId(nextSelected);
  };

  const loadBranchStaff = async (branchId: string) => {
    if (!branchId) {
      setBranchStaff([]);
      return;
    }
    const staff = await api<BranchStaff[]>(`/api/admin/branches/${branchId}/staff`);
    setBranchStaff(staff || []);
  };

  useEffect(() => {
    loadBranches().catch(() => {
      toast.error("Failed to load branches");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedBranchId) return;
    const branch = branches.find((b) => b.restaurant_id === selectedBranchId);
    if (branch) {
      setEditForm({
        name: branch.name || "",
        currency: branch.currency || "INR",
        address: branch.address || "",
        phone: branch.phone || "",
      });
    }
    loadBranchStaff(selectedBranchId).catch(() => {
      toast.error("Failed to load branch staff");
    });
  }, [selectedBranchId, branches]);

  const saveBranch = async () => {
    if (!selectedBranchId) return;
    setIsBusy(true);
    try {
      await api(`/api/admin/branches/${selectedBranchId}`, {
        method: "PATCH",
        body: JSON.stringify(editForm),
      });
      toast.success("Branch updated");
      await loadBranches();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update branch");
    } finally {
      setIsBusy(false);
    }
  };

  const archiveBranch = async () => {
    if (!selectedBranchId || !selectedBranch) return;
    if (!confirm(`Archive branch "${selectedBranch.name}"?`)) return;
    setIsBusy(true);
    try {
      await api(`/api/admin/branches/${selectedBranchId}/archive`, { method: "POST" });
      toast.success("Branch archived");
      await loadBranches();
    } catch (err: any) {
      toast.error(err?.message || "Failed to archive branch");
    } finally {
      setIsBusy(false);
    }
  };

  const assignStaff = async () => {
    if (!selectedBranchId) return;
    setIsBusy(true);
    try {
      await api(`/api/admin/branches/${selectedBranchId}/staff`, {
        method: "POST",
        body: JSON.stringify(assignForm),
      });
      toast.success("Staff assigned to branch");
      setAssignForm((prev) => ({ ...prev, email: "", password: "" }));
      await loadBranchStaff(selectedBranchId);
    } catch (err: any) {
      toast.error(err?.message || "Failed to assign staff");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <h2 className="font-bold text-slate-900 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-slate-500" /> Branches & Locations
        </h2>
        <Link
          href="/staff/settings/branches/add"
          className="text-xs bg-slate-900 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-slate-800 flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> New Branch
        </Link>
      </div>

      <div className="p-4 space-y-4">
        {branches.length > 0 ? (
          <div className="space-y-3">
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium"
            >
              {branches.map((b) => (
                <option key={b.restaurant_id} value={b.restaurant_id}>
                  {b.name} ({b.role})
                </option>
              ))}
            </select>

            <div className="rounded-xl border border-slate-200 p-3 space-y-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Edit Branch</p>
              <div className="grid grid-cols-2 gap-2">
                <input className="rounded-lg border border-slate-200 px-3 py-2 text-xs" value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} />
                <input className="rounded-lg border border-slate-200 px-3 py-2 text-xs" value={editForm.currency} onChange={(e) => setEditForm((p) => ({ ...p, currency: e.target.value }))} />
                <input className="rounded-lg border border-slate-200 px-3 py-2 text-xs col-span-2" value={editForm.address} onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))} />
                <input className="rounded-lg border border-slate-200 px-3 py-2 text-xs col-span-2" value={editForm.phone} onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="flex gap-2">
                <button disabled={isBusy} onClick={saveBranch} className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                  <Save className="w-3 h-3" /> Save Branch
                </button>
                <button disabled={isBusy} onClick={archiveBranch} className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                  <Archive className="w-3 h-3" /> Archive
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-3 space-y-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assign Staff To Branch</p>
              <div className="grid grid-cols-3 gap-2">
                <input className="rounded-lg border border-slate-200 px-3 py-2 text-xs" placeholder="Email" value={assignForm.email} onChange={(e) => setAssignForm((p) => ({ ...p, email: e.target.value }))} />
                <input className="rounded-lg border border-slate-200 px-3 py-2 text-xs" placeholder="Password (new users only)" value={assignForm.password} onChange={(e) => setAssignForm((p) => ({ ...p, password: e.target.value }))} />
                <select className="rounded-lg border border-slate-200 px-3 py-2 text-xs" value={assignForm.role} onChange={(e) => setAssignForm((p) => ({ ...p, role: e.target.value }))}>
                  <option value="manager">Manager</option>
                  <option value="kitchen">Chef</option>
                  <option value="waiter">Waiter</option>
                  <option value="cashier">Cashier</option>
                </select>
              </div>
              <button disabled={isBusy} onClick={assignStaff} className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                <UserPlus className="w-3 h-3" /> Assign
              </button>

              <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50 p-2">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Branch Staff</p>
                <div className="space-y-1">
                  {branchStaff.map((s) => (
                    <div key={s.ID} className="flex items-center justify-between rounded-md bg-white px-2 py-1.5 text-xs">
                      <span className="font-medium text-slate-700">{s.Email}</span>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">{s.Role}</span>
                    </div>
                  ))}
                  {branchStaff.length === 0 && <p className="text-xs text-slate-400">No staff assigned.</p>}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">No branches yet. Create your first branch.</p>
        )}
      </div>
    </section>
  );
}
