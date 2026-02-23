"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, Camera, Image as ImageIcon } from "lucide-react";
import StaffSidebar from "@/app/components/StaffSidebar";
import { api } from "@/app/lib/api";
import toast from "react-hot-toast";

export default function AddBranchPage() {
  const router = useRouter();
  const [brandName, setBrandName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isBranchLockedByPlan, setIsBranchLockedByPlan] = useState(false);
  const [form, setForm] = useState({
    currency: "INR",
    address: "",
    phone: "",
    table_count: 12,
    open_time: "09:00",
    close_time: "23:00",
    phone_country_code: "+91",
  });
  const [currentLogoUrl, setCurrentLogoUrl] = useState("");
  const [isConfirmingAddon, setIsConfirmingAddon] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [me, branchesRes, billingRes] = await Promise.all([
          api<{ restaurant?: string; currency?: string; logo_url?: string | null; logo_version?: number | null }>("/api/admin/me", { method: "GET" }),
          api<{ branches?: Array<{ restaurant_id: string }> }>("/api/admin/branches?include_archived=0", { method: "GET" }),
          api<{ plan?: string }>("/api/admin/billing/status", { method: "GET" }),
        ]);
        const suffix = me?.logo_version ? `?v=${me.logo_version}` : "";
        setBrandName(String(me?.restaurant || ""));
        setForm((prev) => ({
          ...prev,
          currency: prev.currency === "INR" ? String(me?.currency || "INR") : prev.currency,
        }));
        setCurrentLogoUrl(me?.logo_url ? `${me.logo_url}${suffix}` : "");
        const normalizedPlan = String(billingRes?.plan || "").toLowerCase();
        const isPremiumPlan =
          normalizedPlan === "monthly_999" ||
          normalizedPlan === "monthly_1499" ||
          normalizedPlan === "yearly_10999" ||
          normalizedPlan === "yearly_14999";
        const count = (branchesRes?.branches || []).length;
        setIsBranchLockedByPlan(!isPremiumPlan && count >= 1);
      } catch {
        // Fail-safe: if entitlement can't be resolved, block extra-branch creation from UI.
        setIsBranchLockedByPlan(true);
      }
    })();
  }, []);

  const normalizePhoneForSubmit = (countryCode: string, rawPhone: string) => {
    const cleaned = String(rawPhone || "").trim();
    if (!cleaned) return "";
    let digits = cleaned.replace(/\D/g, "");
    const ccDigits = countryCode.replace("+", "");
    if (digits.startsWith(ccDigits)) {
      digits = digits.slice(ccDigits.length);
    }
    return digits;
  };

  const createBranch = async (purchaseExtraBranch: boolean) => {
    await api("/api/admin/branches", {
      method: "POST",
      body: JSON.stringify({
        name: brandName.trim(),
        ...form,
        phone: normalizePhoneForSubmit(form.phone_country_code, form.phone),
        phone_country_code: form.phone_country_code,
        copy_current_logo: true,
        purchase_extra_branch: purchaseExtraBranch,
      }),
    });
  };

  const handleCreate = async () => {
    if (isBranchLockedByPlan) {
      return;
    }
    if (!brandName.trim()) {
      toast.error("Brand name is missing");
      return;
    }
    if (!form.address.trim()) {
      toast.error("Location is required");
      return;
    }
    setIsSaving(true);
    try {
      await createBranch(false);
      toast.success("Branch created");
      router.push("/staff/settings");
    } catch (err: any) {
      const message = String(err?.message || "Failed to create branch");
      if (message.toLowerCase().includes("requires add-on")) {
        setIsConfirmingAddon(true);
        return;
      }
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmAddOnAndCreate = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await createBranch(true);
      toast.success("Branch created with extra-branch add-on (₹249/month)");
      router.push("/staff/settings");
    } catch (err: any) {
      toast.error(err?.message || "Failed to create branch");
    } finally {
      setIsSaving(false);
      setIsConfirmingAddon(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-50">
      <StaffSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl">
          <button
            onClick={() => router.push("/staff/settings")}
            className="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Settings
          </button>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-4">
              <h1 className="text-xl font-black text-slate-900">Add Branch</h1>
              <p className="mt-1 text-sm text-slate-500">Create a new branch/location with initial table setup.</p>
            </div>
            {isBranchLockedByPlan && (
              <div className="mx-6 mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm font-semibold text-amber-900">To add more branches, upgrade plan.</p>
                <p className="mt-1 text-xs text-amber-800">
                  Your current plan has reached the included branch limit.
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/staff/settings/subscription")}
                  className="mt-3 inline-flex items-center rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100"
                >
                  Go to Subscription
                </button>
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Brand name (shared across branches)</label>
                <input
                  value={brandName}
                  disabled
                  className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-600"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Currency</label>
                <input
                  value={form.currency}
                  onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Initial tables</label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={form.table_count}
                  onChange={(e) => setForm((p) => ({ ...p, table_count: Number(e.target.value) || 1 }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Location (branch area/address)</label>
                <input
                  value={form.address}
                  onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                  placeholder="e.g., Downtown, MG Road, Kochi"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Phone</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Code</label>
                  <select
                    value={form.phone_country_code}
                    onChange={(e) => setForm((p) => ({ ...p, phone_country_code: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="+91">+91</option>
                    <option value="+1">+1</option>
                    <option value="+44">+44</option>
                    <option value="+61">+61</option>
                    <option value="+65">+65</option>
                    <option value="+971">+971</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Open</label>
                  <input
                    type="time"
                    value={form.open_time}
                    onChange={(e) => setForm((p) => ({ ...p, open_time: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Close</label>
                  <input
                    type="time"
                    value={form.close_time}
                    onChange={(e) => setForm((p) => ({ ...p, close_time: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Logo</label>
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 overflow-hidden rounded-xl border border-slate-200 bg-white flex items-center justify-center">
                      {currentLogoUrl ? (
                        <img src={currentLogoUrl} alt="Current branch logo" className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Current branch logo will be used</p>
                      <p className="text-xs text-slate-500">You can change it from the logo editor.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push("/staff/settings/profile")}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                  >
                    <Camera className="h-3.5 w-3.5" /> Edit
                  </button>
                </div>
              </div>

              <div className="md:col-span-2">
                <button
                  onClick={handleCreate}
                  disabled={isSaving || isBranchLockedByPlan}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                >
                  <Building2 className="h-4 w-4" /> {isBranchLockedByPlan ? "Upgrade Plan to Add Branch" : isSaving ? "Creating..." : "Create Branch"}
                </button>
              </div>
            </div>
          </section>

          {isConfirmingAddon && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
              <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
                <h3 className="text-lg font-bold text-slate-900">Add Extra Branch?</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Your current plan includes the standard branch limit. This new branch will be added as an add-on at ₹249/month.
                </p>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsConfirmingAddon(false)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={confirmAddOnAndCreate}
                    className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white disabled:opacity-60"
                  >
                    {isSaving ? "Adding..." : "Confirm Add-On"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
