"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Save, Loader2, Globe, AlertTriangle, ArrowRight } from "lucide-react";
import StaffSidebar from "../../../components/StaffSidebar";
import RestaurantProfile from "@/app/components/settings/RestaurantProfile";
import DeviceSettings from "@/app/components/settings/DeviceSettings";
import TableManager from "@/app/components/settings/TableManager";
import StaffManager from "@/app/components/settings/StaffManager";
import { api } from "@/app/lib/api";
import toast from "react-hot-toast";
import type { Restaurant, Staff, Table } from "@/app/components/settings/types";
import Link from "next/link";

type AdminMeResponse = {
  role?: string;
  email?: string;
  restaurant?: string;
  address?: string;
  phone?: string;
  currency?: string;
  tax_percent?: number;
  service_charge?: number;
  ordering_enabled?: boolean;
  logo_url?: string;
  logo_version?: number;
  open_time?: string;
  close_time?: string;
};

export default function SettingsPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [role, setRole] = useState<string>("");

  const [tables, setTables] = useState<Table[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [restaurant, setRestaurant] = useState<Restaurant>({
    name: "",
    address: "",
    currency: "INR",
    taxPercent: 5,
    serviceCharge: 10,
    phone: "",
    logo_url: "",
    orderingEnabled: true,
    openTime: "",
    closeTime: "",
  });

  const [initialData, setInitialData] = useState<{
    restaurant: Restaurant;
    tables: Table[];
    staff: Staff[];
  } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [adminData, tablesData] = await Promise.all([
        api<AdminMeResponse>("/api/admin/me", { method: "GET" }),
        api<Table[]>("/api/admin/tables", { method: "GET" })
      ]);

      const logoVersionSuffix = adminData.logo_version ? `?v=${adminData.logo_version}` : "";
      const restObj: Restaurant = {
        name: adminData.restaurant || "",
        address: adminData.address || "",
        phone: adminData.phone || "",
        currency: adminData.currency || "INR",
        taxPercent: adminData.tax_percent || 0,
        serviceCharge: adminData.service_charge || 0,
        orderingEnabled: adminData.ordering_enabled !== false,
        logo_url: adminData.logo_url ? `${adminData.logo_url}${logoVersionSuffix}` : "",
        openTime: adminData.open_time || "",
        closeTime: adminData.close_time || "",
      };

      const fetchedTables = tablesData || [];
      const fetchedStaff: Staff[] = [];

      setRestaurant(restObj);
      setTables(fetchedTables);
      setStaff(fetchedStaff);
      setRole(adminData.role || "");

      setInitialData({
        restaurant: restObj,
        tables: fetchedTables,
        staff: fetchedStaff
      });

    } catch {
      toast.error("Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  };

  const isDirty = useMemo(() => {
    if (!initialData) return false;
    return (
      JSON.stringify(restaurant) !== JSON.stringify(initialData.restaurant) ||
      JSON.stringify(tables) !== JSON.stringify(initialData.tables) ||
      JSON.stringify(staff) !== JSON.stringify(initialData.staff)
    );
  }, [restaurant, tables, staff, initialData]);

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const { upload_url, public_url } = await api<{ upload_url: string; public_url: string }>("/api/admin/logo-pic/upload-url", {
        method: "POST",
      });
      const uploadRes = await fetch(upload_url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!uploadRes.ok) throw new Error();
      setRestaurant((prev) => ({ ...prev, logo_url: `${public_url}?v=${Date.now()}` }));
      toast.success("Logo uploaded");
    } catch {
      toast.error("Logo upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api("/api/admin/update-details", {
        method: "PATCH",
        body: JSON.stringify({
          name: restaurant.name,
          address: restaurant.address,
          phone: restaurant.phone,
          tax_percent: restaurant.taxPercent,
          service_charge: restaurant.serviceCharge,
          ordering_enabled: restaurant.orderingEnabled !== false,
          open_time: restaurant.openTime || "",
          close_time: restaurant.closeTime || "",
        }),
      });
      await fetchData();
      toast.success("Settings updated successfully");
    } catch {
      toast.error("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const addTable = async () => {
    try {
      const newTable = await api<Table>("/api/admin/tables", {
        method: "POST",
      });
      setTables(prev => [...prev, newTable]);
      toast.success("Table created");
    } catch {
      toast.error("Failed to create table");
    }
  };

  const toggleTable = async (id: string) => {
    const table = tables.find(t => t.id === id);
    if (!table) return;

    try {
      await api(`/api/admin/tables/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          is_enabled: !table.is_enabled,
        }),
      });

      setTables(prev =>
        prev.map(t =>
          t.id === id ? { ...t, is_enabled: !t.is_enabled } : t
        )
      );
    } catch {
      toast.error("Failed to update status");
    }
  };

  const removeTable = async (id: string) => {
    try {
      await api(`/api/admin/tables/${id}`, { method: "DELETE" });
      setTables((prev) => prev.filter((t) => t.id !== id));
      toast.success("Table archived");
    } catch {
      toast.error("Failed to archive table");
    }
  };


  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] text-slate-900 overflow-hidden font-sans">
      <StaffSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0 z-10">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Settings</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Globe className="w-3 h-3 text-slate-400" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Global Configuration • {restaurant.currency}
              </span>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 text-white disabled:text-slate-400 px-8 py-2.5 rounded-lg text-sm font-bold transition-all active:scale-95 shadow-sm"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save Changes</>}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-6 scroll-smooth">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 max-w-[1600px] mx-auto pb-10">
            <div className="xl:col-span-7 flex flex-col gap-6">
              <RestaurantProfile
                data={restaurant}
                onChange={setRestaurant}
                onLogoChange={handleLogoChange}
                isUploading={isUploading}
              />
              <DeviceSettings />
            </div>

            <div className="xl:col-span-5 flex flex-col gap-6">
              <TableManager
                tables={tables}
                onAdd={addTable}
                onToggle={toggleTable}
                onRemove={removeTable}
              />
              <StaffManager />
              {role === "owner" && (
                <section className="bg-white rounded-2xl border border-rose-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-rose-100 bg-rose-50/50">
                    <h2 className="font-bold text-rose-700">Delete Account</h2>
                    <p className="text-[11px] text-rose-600 mt-1">
                      Account deletion is permanent.
                    </p>
                  </div>
                  <div className="p-6">
                    <Link
                      href="/staff/settings/delete-account"
                      className="inline-flex items-center gap-2 rounded-lg border border-rose-300 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-xs font-bold"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      Delete Account
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </section>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
