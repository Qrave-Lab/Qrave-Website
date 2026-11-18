"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Plus, QrCode } from "lucide-react";
import SettingsPageLayout from "@/app/components/settings/SettingsPageLayout";
import DeviceSettings, { ADD_PRINTER_EVENT } from "@/app/components/settings/DeviceSettings";

export default function DeviceSettingsPage() {
  const router = useRouter();
  return (
    <SettingsPageLayout
      title="Devices and QR codes"
      description="Receipt and kitchen printers, and the QR codes on your tables"
      maxWidth="max-w-5xl"
      action={
        <>
          <button
            type="button"
            onClick={() => router.push("/staff/settings/qr-codes")}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#E8E8E3] bg-white px-3.5 text-[13px] font-semibold text-[#374151] transition-colors hover:border-[#D6D6CF] hover:text-[#0F1117]"
          >
            <QrCode className="h-4 w-4 text-[#6B7280]" /> Table QR codes
          </button>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event(ADD_PRINTER_EVENT))}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#fe5c13] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#e44e0b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fe5c13]/40 focus-visible:ring-offset-2"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} /> Add printer
          </button>
        </>
      }
    >
      <DeviceSettings />
    </SettingsPageLayout>
  );
}
