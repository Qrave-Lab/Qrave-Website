"use client";

import { useEffect, useState } from "react";
import QrLoader from "./QrLoader";
import ReloadButton from "./ReloadButton";

/** Shown while a scanned table QR is being resolved. */
export default function GuestTableLoader() {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-white px-8 text-center"
    >
      <QrLoader size={88} />
      <p className="text-base font-medium text-slate-800">Preparing your table&hellip;</p>

      {slow && (
        <div className="flex flex-col items-center gap-3">
          <p className="max-w-[30ch] text-sm text-slate-600">
            This is taking longer than usual. Check your connection and try again.
          </p>
          <ReloadButton />
        </div>
      )}
    </div>
  );
}
