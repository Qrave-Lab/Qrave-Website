"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { api } from "@/app/lib/api";
import toast from "react-hot-toast";
import SettingsPageLayout from "@/app/components/settings/SettingsPageLayout";
import { STAFF_INPUT, StaffFields, StaffPreview, passwordProblem, type StaffFormValues } from "@/app/components/settings/StaffForm";

import { Select } from "@/app/components/ui/Select";

type BranchInfo = { restaurant_id: string; restaurant: string };

const AddStaffPage = () => {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [ownerBranches, setOwnerBranches] = useState<BranchInfo[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [formData, setFormData] = useState<StaffFormValues>({ name: "", email: "", phone: "", password: "", role: "waiter" });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetBranch = ownerBranches.length > 1 ? selectedBranchId : restaurantId;
    if (!targetBranch) { toast.error("Still connecting. Try again in a moment."); return; }
    if (formData.phone && formData.phone.length !== 10) {
      toast.error("Enter all 10 digits of the phone number, or leave it empty");
      return;
    }
    const pwError = passwordProblem(formData.password);
    if (pwError) { toast.error(`Password: ${pwError.toLowerCase()}`); return; }
    setIsSaving(true);
    try {
      await api(`/api/admin/restaurants/${targetBranch}/staff`, { method: "POST", body: JSON.stringify({ name: formData.name || undefined, email: formData.email || undefined, phone: formData.phone || undefined, password: formData.password, role: formData.role }) });
      toast.success("Team member added");
      router.push("/staff/settings/team"); router.refresh();
    } catch (err: unknown) {
      const message = err && typeof err === "object" && "message" in err ? String((err as { message?: string }).message || "") : "";
      toast.error(message || "Couldn't add the team member");
    } finally { setIsSaving(false); }
  };

  const branchName = ownerBranches.length > 1 ? ownerBranches.find((b) => b.restaurant_id === selectedBranchId)?.restaurant : undefined;

  return (
    <SettingsPageLayout
      title="Add team member"
      description="Create an account and choose what they do"
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
            disabled={isSaving}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#fe5c13] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#e44e0b] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fe5c13]/40 focus-visible:ring-offset-2"
          >
            {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Adding</> : "Add team member"}
          </button>
        </>
      }
    >
      <form id="staff-form" onSubmit={handleSubmit} className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-2xl border border-[#E8E8E3] bg-white">
          <div className="border-b border-[#F0F0EB] px-6 py-4">
            <h2 className="text-[15px] font-semibold text-[#0F1117]">Details</h2>
            <p className="mt-0.5 text-[13px] text-[#6B7280]">They sign in with their email and this password.</p>
          </div>
          <div className="space-y-5 px-6 py-5">
            <StaffFields value={formData} onChange={setFormData} mode="add" />
            {ownerBranches.length > 1 && (
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[#4B5563]">Branch</label>
                <Select value={selectedBranchId} onChange={(e) => setSelectedBranchId(e.target.value)} className={STAFF_INPUT}>
                  {ownerBranches.map((b) => (
                    <option key={b.restaurant_id} value={b.restaurant_id}>{b.restaurant}</option>
                  ))}
                </Select>
              </div>
            )}
          </div>
        </section>
        <aside className="lg:sticky lg:top-0">
          <StaffPreview value={formData} branch={branchName} />
        </aside>
      </form>
    </SettingsPageLayout>
  );
};

export default AddStaffPage;
