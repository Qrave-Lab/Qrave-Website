import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live Demo: Menu Studio, Inventory & QR Codes",
  description:
    "Try the Qrave dashboard hands-on: build a menu, manage inventory and generate table QR codes. No sign-up needed.",
  alternates: { canonical: "/demo" },
  openGraph: { url: "/demo", title: "Try the Qrave Live Demo", description: "Build a menu, manage inventory and generate table QR codes, no sign-up needed." },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
