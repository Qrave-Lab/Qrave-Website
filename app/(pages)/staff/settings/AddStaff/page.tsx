"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Lock, Eye, EyeOff, UserPlus, BadgeCheck, Loader2, Phone, MapPin } from "lucide-react";
import { api } from "@/app/lib/api";
import toast from "react-hot-toast";
import SettingsPageLayout from "@/app/components/settings/SettingsPageLayout";

const roles = [
  { id: "manager", label: "Manager" },
  { id: "kitchen", label: "Chef" },
  { id: "waiter", label: "Waiter" },
  { id: "cashier", label: "Cashier" },
  { id: "delivery_rider", label: "Delivery Rider" },
];

type BranchInfo = { restaurant_id: string; restaurant: string };

const AddStaffPage = () => {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [ownerBranches, setOwnerBranches] = useState<BranchInfo[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", password: "", role: "waiter" });

  useEffect(() => {
    (async () => {
      try {
        const data = await api<{ restaurant_id?: string; id?: string; role?: string }>("/api/admin/me", { method: "GET" });
        const currentId = data.restaurant_id || data.id || null;
        setRestaurantId(currentId);
        if ((data.role || "").toLowerCase() === "owner") {
          try {
            const branches = await api<BranchInfo[]>("/api/admin/owner/branches", { method: "GET" });
            const list = branches || [];
            setOwnerBranches(list);
            // Default to the currently active branch
            setSelectedBranchId(currentId || list[0]?.restaurant_id || "");
          } catch {
            // single branch or error — ignore
          }
        }
      } catch {
        toast.error("Authentication error");
      }
    })();
  }, []);

  const validatePassword = (pw: string): string | null => {
    if (pw.length < 8 || pw.length > 72) return "Password must be 8–72 characters long";
    if (!/[a-zA-Z]/.test(pw)) return "Password must contain at least one letter";
    if (!/[0-9]/.test(pw)) return "Password must contain at least one number";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetBranch = ownerBranches.length > 1 ? selectedBranchId : restaurantId;
    if (!targetBranch) { toast.error("Connecting to server..."); return; }
    const pwError = validatePassword(formData.password);
    if (pwError) { toast.error(pwError); return; }
    setIsSaving(true);
    try {
      await api(`/api/admin/restaurants/${targetBranch}/staff`, { method: "POST", body: JSON.stringify({ name: formData.name || undefined, email: formData.email || undefined, phone: formData.phone || undefined, password: formData.password, role: formData.role }) });
      toast.success("Staff member created successfully");
      router.push("/staff/settings/team"); router.refresh();
    } catch (err: unknown) {
      const message = err && typeof err === "object" && "message" in err ? String((err as { message?: string }).message || "") : "";
      toast.error(message || "Failed to create staff member");
    } finally { setIsSaving(false); }
  };

  return (
    <SettingsPageLayout
      title="Add Team Member"
      description="Create a new staff account with a defined role and access level."
      action={
        <button form="staff-form" type="submit" disabled={isSaving} className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-60">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UserPlus className="w-4 h-4" /> Save Member</>}
        </button>
      }
    >
      <form id="staff-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full Name</label>
            <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input required className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 outline-none" placeholder="John Doe" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Work Email <span className="text-slate-300 normal-case font-normal">(optional • required for login)</span></label>
            <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="email" className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 outline-none" placeholder="email@work.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone <span className="text-slate-300 normal-case font-normal">(optional)</span></label>
            <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="tel" className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 outline-none" placeholder="+91 98765 43210" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} /></div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Access Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input required type={showPassword ? "text" : "password"} minLength={8} maxLength={72} className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 outline-none" placeholder="Min 8 chars, 1 letter + 1 number" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
            </div>
            <p className="text-[10px] text-slate-400">8–72 characters · at least one letter and one number</p>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Role Selection</label>
            <div className="flex flex-wrap gap-2">
              {roles.map((role) => (
                <button key={role.id} type="button" onClick={() => setFormData({ ...formData, role: role.id })} className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${formData.role === role.id ? "bg-slate-900 border-slate-900 text-white shadow-md" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{role.label}</button>
              ))}
            </div>
          </div>

          {/* Branch selector — only visible to owners with 2+ branches */}
          {ownerBranches.length > 1 && (
            <div className="space-y-1 pt-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <MapPin className="w-3 h-3" /> Assign to Branch
              </label>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 outline-none"
              >
                {ownerBranches.map((b) => (
                  <option key={b.restaurant_id} value={b.restaurant_id}>{b.restaurant}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-xl aspect-[1.4/1] flex flex-col justify-between">
            <div className="absolute top-0 right-0 p-6 opacity-5"><BadgeCheck className="w-32 h-32" /></div>
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/10"><UserPlus className="w-5 h-5 text-indigo-400" /></div>
              <span className="text-[9px] font-bold opacity-40 uppercase tracking-[0.2em]">Live Preview</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold truncate mb-1">{formData.name || "Member Name"}</h2>
              <p className="text-sm font-semibold text-indigo-400 uppercase tracking-widest">{formData.role}</p>
            </div>
            <div className="pt-4 border-t border-white/5 text-[10px] opacity-30 truncate">{formData.phone || formData.email || "user@workplace.com"}</div>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <p className="text-[11px] text-slate-500 leading-normal font-medium">Note: Email + password is required for staff login. Without email, a placeholder is used and the member cannot self-login. Role determines access level.</p>
          </div>
        </div>
      </form>
    </SettingsPageLayout>
  );
};

export default AddStaffPage;
