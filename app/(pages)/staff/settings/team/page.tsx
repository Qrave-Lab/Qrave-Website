"use client";

import React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import SettingsPageLayout from "@/app/components/settings/SettingsPageLayout";
import StaffManager from "@/app/components/settings/StaffManager";

export default function TeamSettingsPage() {
  return (
    <SettingsPageLayout
      title="Team members"
      description="Who works here, what they do, and whether they can sign in"
      maxWidth="max-w-5xl"
      action={
        <Link
          href="/staff/settings/AddStaff"
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#fe5c13] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#e44e0b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fe5c13]/40 focus-visible:ring-offset-2"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} /> Add team member
        </Link>
      }
    >
      <StaffManager />
    </SettingsPageLayout>
  );
}
