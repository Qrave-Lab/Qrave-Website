"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Save, Loader2, Globe } from "lucide-react";
import StaffSidebar from "../../../components/StaffSidebar";
import RestaurantProfile from "@/app/components/settings/RestaurantProfile";
import DeviceSettings from "@/app/components/settings/DeviceSettings";
import TableManager from "@/app/components/settings/TableManager";
import StaffManager from "@/app/components/settings/StaffManager";
import { api } from "@/app/lib/api";
import toast from "react-hot-toast";
import type { Restaurant, Staff, Table } from "@/app/components/settings/types";

export default function SettingsPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  
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
        api<any>("/api/admin/me", { method: "GET" }),
        api<Table[]>("/api/admin/tables", { method: "GET" })
      ]);

      const restObj: Restaurant = {
        name: adminData.restaurant || "",
        address: adminData.address || "",
        phone: adminData.phone || "",
        currency: adminData.currency || "INR",
        taxPercent: adminData.tax_percent || 0,
        serviceCharge: adminData.service_charge || 0,
        logo_url: adminData.logo_url || "",
        openTime: adminData.open_time || "",
        closeTime: adminData.close_time || "",
      };

      const fetchedTables = tablesData || [];
      const fetchedStaff: Staff[] = []; 

      setRestaurant(restObj);
      setTables(fetchedTables);
      setStaff(fetchedStaff);
      
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
      const { upload_url } = await api<{ upload_url: string }>("/api/admin/logo-pic/upload-url", {
        method: "POST",
      });
      const uploadRes = await fetch(upload_url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!uploadRes.ok) throw new Error();
      toast.success("Logo uploaded");
    } catch (err) {
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
          open_time: restaurant.openTime || "",
          close_time: restaurant.closeTime || "",
        }),
      });
      setInitialData({ restaurant, tables, staff });
      toast.success("Settings updated successfully");
    } catch (e) {
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
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
