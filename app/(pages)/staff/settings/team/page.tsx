"use client";

import React from "react";
import SettingsPageLayout from "@/app/components/settings/SettingsPageLayout";
import StaffManager from "@/app/components/settings/StaffManager";

export default function TeamSettingsPage() {
  return (
    <SettingsPageLayout title="Team Members" description="Add, edit, or remove staff and manage their roles.">
      <StaffManager />
    </SettingsPageLayout>
  );
}
