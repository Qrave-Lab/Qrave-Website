"use client";

import React from "react";
import SettingsPageLayout from "@/app/components/settings/SettingsPageLayout";
import DeviceSettings from "@/app/components/settings/DeviceSettings";

export default function DeviceSettingsPage() {
  return (
    <SettingsPageLayout title="Devices" description="Manage printers, terminals and connected hardware.">
      <DeviceSettings />
    </SettingsPageLayout>
  );
}
