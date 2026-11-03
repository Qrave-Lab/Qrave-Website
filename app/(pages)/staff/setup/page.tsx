"use client";

import SettingsPageLayout from "@/app/components/settings/SettingsPageLayout";
import SetupChecklist from "@/app/components/onboarding/SetupChecklist";

export default function SetupPage() {
  return (
    <SettingsPageLayout title="Setup guide" description="Everything to do before your first guest scans a QR code." fullBleed>
      <div className="flex-1 min-h-0 overflow-y-auto bg-[#f8fafc] p-8">
        <div className="mx-auto max-w-2xl">
          <SetupChecklist variant="page" />
        </div>
      </div>
    </SettingsPageLayout>
  );
}
