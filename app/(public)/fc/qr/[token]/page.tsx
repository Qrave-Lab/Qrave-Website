"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Store } from "lucide-react";
import { rememberZone, resolveCourtToken } from "@/app/lib/foodCourt";

/** A court QR code lands here, remembers which table/zone it was, then opens the court. */
export default function FoodCourtQRPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!token) return;
    resolveCourtToken(token)
      .then(({ court, zone }) => {
        rememberZone(court.slug, zone || "");
        router.replace(`/fc/${court.slug}`);
      })
      .catch(() => setFailed(true));
  }, [token, router]);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#F8FAFC] px-6 text-center">
      {failed ? (
        <>
          <Store size={36} className="text-slate-300" />
          <h1 className="mt-3 text-lg font-extrabold">This QR code isn&apos;t working</h1>
          <p className="mt-1 max-w-xs text-sm text-slate-500">Try another code nearby, or ask the staff at any stall.</p>
        </>
      ) : (
        <Loader2 className="animate-spin text-slate-400" />
      )}
    </div>
  );
}
