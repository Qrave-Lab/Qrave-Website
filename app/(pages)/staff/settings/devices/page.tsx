"use client";

import React from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import StaffSidebar from "@/app/components/StaffSidebar";
import DeviceSettings from "@/app/components/settings/DeviceSettings";

export default function DeviceSettingsPage() {
  const router = useRouter();

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900">
      <StaffSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-5xl space-y-4">
          <button
            onClick={() => router.push("/staff/settings")}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Settings
          </button>
          <DeviceSettings />
        </div>
      </main>
    </div>
  );
}
