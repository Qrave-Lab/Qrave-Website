"use client";

import { useEffect, useState } from "react";
import { Gift } from "lucide-react";
import { getBackendBase } from "@/app/lib/api";
import { getTenantSlugFromHostname } from "@/app/lib/tenant";

/** "Rewards" pill on the QR menu, shown only when the restaurant runs a loyalty card. */
export default function LoyaltyMenuLink() {
  const [href, setHref] = useState("");
  const [color, setColor] = useState("#0f766e");

  useEffect(() => {
    const slug = getTenantSlugFromHostname(window.location.hostname);
    if (!slug) return;
    let base = "";
    try {
      base = getBackendBase();
    } catch {
      return;
    }
    fetch(`${base}/public/loyalty/${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((info) => {
        if (info?.active) {
          setHref(`/loyalty/${slug}`);
          if (info.card_color) setColor(info.card_color);
        }
      })
      .catch(() => {});
  }, []);

  if (!href) return null;
  return (
    <a
      href={href}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold text-white mt-0.5 ml-1"
      style={{ background: color }}
    >
      <Gift className="w-3 h-3" />
      Rewards
    </a>
  );
}
