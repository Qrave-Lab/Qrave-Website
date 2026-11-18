"use client";

import Link from "next/link";
import React from "react";

type Props = {
  restaurantName?: string;
  /** What the number/name is used for, e.g. "send this bill" or "manage your rewards". */
  purpose: string;
  /** When set, shows an optional, unticked "Send me offers" checkbox. */
  marketing?: boolean;
  onMarketingChange?: (v: boolean) => void;
  className?: string;
};

/** DPDP notice shown next to any field that collects a diner's phone or name. */
export default function ConsentNotice({ restaurantName, purpose, marketing, onMarketingChange, className = "" }: Props) {
  const who = restaurantName ? `${restaurantName} and Qrave` : "the restaurant and Qrave";
  return (
    <div className={`text-xs leading-relaxed text-slate-500 ${className}`}>
      <p>
        By continuing you agree to {who} using your details to {purpose}.{" "}
        <Link href="/privacy" target="_blank" className="font-semibold text-slate-700 underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#fe5c13]">
          Privacy policy
        </Link>
      </p>
      {onMarketingChange && (
        <label className="mt-2 flex min-h-[44px] cursor-pointer items-center gap-2.5 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={Boolean(marketing)}
            onChange={(e) => onMarketingChange(e.target.checked)}
            className="h-5 w-5 shrink-0 accent-[#fe5c13]"
          />
          Send me offers (optional)
        </label>
      )}
    </div>
  );
}
