import type { Metadata } from "next";
import FcAdminShell from "./FcAdminShell";

export const metadata: Metadata = { title: "Food court dashboard | Qrave" };

export default function FcAdminLayout({ children }: { children: React.ReactNode }) {
  return <FcAdminShell>{children}</FcAdminShell>;
}
