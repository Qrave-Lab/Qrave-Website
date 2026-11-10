"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, Loader2, Store } from "lucide-react";
import ModernFoodUI from "@/app/(pages)/menu/MenuUi";
import { setARSink } from "@/app/lib/arTracking";
import { type PublicCourt, type StallCard, fetchStallMenu, trackCourt } from "@/app/lib/foodCourt";

type Loaded = { court: PublicCourt; stall: StallCard; items: any[] };

export default function StallMenuClient({ slug, stallId }: { slug: string; stallId: string }) {
  const router = useRouter();
  const [data, setData] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchStallMenu(slug, stallId)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        document.title = `${d.stall.name} · ${d.court.name}`;
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [slug, stallId]);

  useEffect(() => {
    trackCourt(slug, { event: "stall_view", restaurant_id: stallId }, `stall:${stallId}`);
    // 3D / AR views on this page count for the court, not a table session.
    setARSink((menuItemId, event) => {
      if (event === "view_3d" || event === "ar_open") {
        trackCourt(slug, { event, menu_item_id: menuItemId, restaurant_id: stallId });
      }
    });
    return () => setARSink(null);
  }, [slug, stallId]);

  const onItemView = useCallback(
    (item: any) => {
      if (item?.id) trackCourt(slug, { event: "item_view", menu_item_id: String(item.id), restaurant_id: stallId }, `item:${item.id}`);
    },
    [slug, stallId],
  );

  if (failed) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#F8FAFC] px-6 text-center">
        <Store size={36} className="text-slate-300" />
        <h1 className="mt-3 text-lg font-extrabold">This stall&apos;s menu isn&apos;t available</h1>
        <Link
          href={`/fc/${slug}`}
          className="mt-4 inline-flex items-center gap-1 rounded-full bg-orange-500 px-4 py-2 text-sm font-bold text-white"
        >
          <ChevronLeft size={16} /> All stalls
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#F8FAFC] text-slate-400">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  const { stall, court, items } = data;
  const label = [stall.stallLabel, stall.isOpen ? null : "Closed now"].filter(Boolean).join(" · ") || court.name;

  return (
    <ModernFoodUI
      menuItems={items}
      orderingEnabled={false}
      previewMode
      previewRestaurantName={stall.name}
      previewRestaurantLogoUrl={stall.logoUrl || undefined}
      previewThemeConfig={(stall.themeConfig as any) || undefined}
      onBack={() => router.push(`/fc/${slug}`)}
      contextLabel={label}
      onItemView={onItemView}
    />
  );
}
