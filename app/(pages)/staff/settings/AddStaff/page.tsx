"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ChevronLeft, 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff,
  UserPlus,
  BadgeCheck,
  Loader2
} from "lucide-react";
import Link from "next/link";
import { api } from "@/app/lib/api";
import toast from "react-hot-toast";
import StaffSidebar from "@/app/components/StaffSidebar";

const AddStaffPage = () => {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "waiter", 
  });

  const roles = [
    { id: "owner", label: "Owner" },
    { id: "manager", label: "Manager" },
    { id: "kitchen", label: "Chef" },
    { id: "waiter", label: "Waiter" },
    { id: "cashier", label: "Cashier" },
  ];

  useEffect(() => {
    const getRestaurantInfo = async () => {
      try {
        const data = await api<any>("/api/admin/me", { method: "GET" });
        const id = data.restaurant_id || data.id;
        setRestaurantId(id);
      } catch (err) {
        toast.error("Authentication error");
      }
    };
    getRestaurantInfo();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId) {
      toast.error("Connecting to server...");
      return;
    }

    setIsSaving(true);
    try {
      await api(`/api/admin/restaurants/${restaurantId}/staff`, {
        method: "POST",
        body: JSON.stringify(formData),
      });

      toast.success("Staff member created successfully");
      router.push("/settings");
      router.refresh();
    } catch (err) {
      toast.error("Failed to create staff member");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] text-slate-900 overflow-hidden font-sans">
      <StaffSidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-8 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <Link href="/settings" className="p-2 hover:bg-slate-50 rounded-lg border border-slate-200">
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <h1 className="text-lg font-bold">Add Team Member</h1>
          </div>
          <button
            form="staff-form"
            type="submit"
            className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all active:scale-95 disabled:bg-slate-300 disabled:cursor-not-allowed"
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UserPlus className="w-4 h-4" /> Save Member</>}
          </button>
        </header>

        <main className="flex-1 p-6 flex items-center justify-center overflow-hidden">
          <form id="staff-form" onSubmit={handleSubmit} className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6 h-fit items-center">
            
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input required className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all" 
                  placeholder="John Doe" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Work Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input required type="email" className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all" 
                  placeholder="email@work.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Access Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input required type={showPassword ? "text" : "password"} className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all" 
                  placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Role Selection</label>
                <div className="flex flex-wrap gap-2">
                  {roles.map((role) => (
                    <button key={role.id} type="button" onClick={() => setFormData({ ...formData, role: role.id })}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                        formData.role === role.id ? "bg-slate-900 border-slate-900 text-white shadow-md" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {role.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-xl aspect-[1.4/1] flex flex-col justify-between">
                <div className="absolute top-0 right-0 p-6 opacity-5">
                  <BadgeCheck className="w-32 h-32" />
                </div>
                <div className="flex justify-between items-start">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/10">
                    <UserPlus className="w-5 h-5 text-indigo-400" />
                  </div>
                  <span className="text-[9px] font-bold opacity-40 uppercase tracking-[0.2em]">Live Preview</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold truncate mb-1">{formData.name || "Member Name"}</h2>
                  <p className="text-sm font-semibold text-indigo-400 uppercase tracking-widest">{formData.role}</p>
                </div>
                <div className="pt-4 border-t border-white/5 text-[10px] opacity-30 truncate">
                  {formData.email || "user@workplace.com"}
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                <p className="text-[11px] text-slate-500 leading-normal font-medium">
                  Note: Staff will use their work email and password to log in. Role determines access level in the dashboard.
                </p>
              </div>
            </div>

          </form>
        </main>
      </div>
    </div>
  );
};

export default AddStaffPage;