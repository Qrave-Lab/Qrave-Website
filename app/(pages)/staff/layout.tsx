import type { Metadata, Viewport } from "next";
import StaffShell from "./StaffShell";

export const metadata: Metadata = {
  manifest: "/qrave-staff.webmanifest",
  appleWebApp: { capable: true, title: "Qrave", statusBarStyle: "black-translucent" },
  icons: { apple: "/pwa-icon/192" },
};

export const viewport: Viewport = { themeColor: "#0F1117" };

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return <StaffShell>{children}</StaffShell>;
}
