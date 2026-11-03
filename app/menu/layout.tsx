import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  manifest: "/guest.webmanifest",
  appleWebApp: { capable: true, title: "Menu", statusBarStyle: "default" },
  icons: { apple: "/pwa-icon/192" },
};

export const viewport: Viewport = { themeColor: "#fe5c13" };

export default function GuestMenuLayout({ children }: { children: React.ReactNode }) {
  return children;
}
