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
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center justify-center space-y-4">
          <h1 className="text-4xl font-black tracking-tighter text-slate-900">
            Qrave<span className="text-[#fe5c13]">.</span>
          </h1>
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-[#fe5c13]" />
        </div>
      </div>
    );
  }

  if (!isAllowed) {
    return null;
  }

  return <div className="admin-ui">{children}</div>;
}
