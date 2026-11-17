"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadStaffSession } from "@/app/lib/api";

import ManagerPinModal from "@/app/components/ui/ManagerPinModal";
import ConnectionBanner from "@/app/components/ConnectionBanner";

export default function StaffShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkAccess = async () => {
      try {
        const { me, signedOut } = await loadStaffSession<{ role?: string }>();
        if (!mounted) return;
        // Only a session the server has really ended goes to /login. If the
        // server can't be reached, keep the user in: each page's own calls
        // still check the session.
        const noRole = me !== null && !String(me?.role || "").trim();
        if (signedOut || noRole) {
          setIsAllowed(false);
          router.replace("/login");
          return;
        }
        setIsAllowed(true);
      } catch {
        if (mounted) setIsAllowed(true);
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/landing/image.png"
            alt="Qrave Logo"
            className="h-12 w-auto object-contain animate-pulse"
          />
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-[#fe5c13]" />
        </div>
      </div>
    );
  }

  if (!isAllowed) {
    return null;
  }

  return (
    <div className="admin-ui">
      <ConnectionBanner />
      {children}
      <ManagerPinModal />
    </div>
  );
}
