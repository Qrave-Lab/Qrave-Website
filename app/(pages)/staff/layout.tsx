"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/app/lib/api";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkAccess = async () => {
      try {
        const me = await api<{ role?: string }>("/api/admin/me", {
          method: "GET",
          skipAuthRedirect: true,
          suppressErrorLog: true,
        });
        if (!mounted) return;
        const role = String(me?.role || "").trim().toLowerCase();
        if (!role) {
          setIsAllowed(false);
          router.replace("/login");
          return;
        }
        setIsAllowed(true);
      } catch {
        if (!mounted) return;
        setIsAllowed(false);
        router.replace("/login");
      } finally {
        if (mounted) setIsChecking(false);
      }
    };

    checkAccess();
    return () => {
      mounted = false;
    };
  }, [router]);

  if (isChecking) {
    return <div className="h-screen w-full bg-[#f8fafc]" />;
  }

  if (!isAllowed) {
    return null;
  }

  return <>{children}</>;
}
