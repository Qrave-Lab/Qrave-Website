"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { api } from "@/app/lib/api";
import toast from "react-hot-toast";
import SettingsPageLayout from "@/app/components/settings/SettingsPageLayout";
import { StaffFields, StaffPreview, type StaffFormValues } from "@/app/components/settings/StaffForm";

const EditStaffPage = () => {
  const router = useRouter();
  const params = useParams();
  const userId = params?.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<StaffFormValues>({ name: "", email: "", phone: "", password: "", role: "waiter" });

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (userId) {
          const staffData = await api<any>(`/api/admin/staffDetails/${userId}`, { method: "GET" });
          const email = staffData.Email || "";
          const rawPhone = (staffData.Phone || "").replace(/\D/g, "");
          setFormData({
            name: staffData.Name || "",
            email: email.includes("@internal.nologin") ? "" : email,
            phone: rawPhone.length > 10 ? rawPhone.slice(-10) : rawPhone,
            password: "",
            role: staffData.Role || "waiter",
          });
        }
      } catch {
        toast.error("Couldn't load this team member");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.phone && formData.phone.length !== 10) {
      toast.error("Enter all 10 digits of the phone number, or leave it empty");
      return;
    }
    setIsSaving(true);
    try {
      await api(`/api/admin/staffDetails/${userId}`, {
        method: "PUT",
        body: JSON.stringify({
          email: formData.email || undefined,
          name: formData.name || undefined,
          phone: formData.phone || undefined,
          password: formData.password,
          role: formData.role,
        }),
      });
      toast.success("Team member updated");
      router.push("/staff/settings/team");
      router.refresh();
    } catch {
      toast.error("Couldn't update the team member");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SettingsPageLayout
      title={isLoading ? "Edit team member" : formData.name || "Edit team member"}
      description="Change their details, role or password"
      maxWidth="max-w-5xl"
      action={
        <>
          <button
            type="button"
            onClick={() => router.push("/staff/settings/team")}
            className="inline-flex h-10 items-center rounded-xl border border-[#E8E8E3] bg-white px-3.5 text-[13px] font-semibold text-[#374151] transition-colors hover:border-[#D6D6CF] hover:text-[#0F1117]"
          >
            Cancel
          </button>
          <button
            form="staff-form"
            type="submit"
            disabled={isSaving || isLoading}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#fe5c13] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#e44e0b] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fe5c13]/40 focus-visible:ring-offset-2"
          >
            {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving</> : "Save changes"}
          </button>
        </>
      }
    >
      {isLoading ? (
        <div className="grid animate-pulse grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="h-[520px] rounded-2xl border border-[#E8E8E3] bg-white" />
          <div className="h-64 rounded-2xl border border-[#E8E8E3] bg-white" />
        </div>
      ) : (
        <form id="staff-form" onSubmit={handleSubmit} className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-2xl border border-[#E8E8E3] bg-white">
            <div className="border-b border-[#F0F0EB] px-6 py-4">
              <h2 className="text-[15px] font-semibold text-[#0F1117]">Details</h2>
            </div>
            <div className="px-6 py-5">
              <StaffFields value={formData} onChange={setFormData} mode="edit" />
            </div>
          </section>
          <aside className="lg:sticky lg:top-0">
            <StaffPreview value={formData} />
          </aside>
        </form>
      )}
    </SettingsPageLayout>
  );
};

export default EditStaffPage;
