"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Box, ChevronRight, Flame, Leaf, Loader2, MapPin, Search, Sparkles, Store, TrendingUp, X } from "lucide-react";
import {
  type CourtDish,
  type CourtListing,
  type FeaturedDish,
  type SearchFilters,
  type StallCard,
  cuisineLabel,
  currentZone,
  fetchListing,
  formatPrice,
  searchCourt,
  trackCourt,
} from "@/app/lib/foodCourt";

const PRICE_CAP = 200;

export default function FoodCourtClient({ slug }: { slug: string }) {
  const [listing, setListing] = useState<CourtListing | null>(null);
  const [error, setError] = useState<{ status?: number; message: string } | null>(null);
  const [cuisine, setCuisine] = useState("");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Omit<SearchFilters, "q">>({});
  // Results are tagged with the search they answer, so stale ones never show.
  const [found, setFound] = useState<{ key: string; items: CourtDish[] } | null>(null);
  const [zone, setZone] = useState("");

  useEffect(() => {
    trackCourt(slug, { event: "court_open" }, "court_open");
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    fetchListing(slug, cuisine)
      .then((data) => {
        if (cancelled) return;
        setListing(data);
        setError(null);
        setZone(currentZone(slug));
      })
      .catch((e: Error & { status?: number }) => !cancelled && setError({ status: e.status, message: e.message }));
    return () => {
      cancelled = true;
    };
  }, [slug, cuisine]);

  const searchActive = query.trim().length > 0 || Boolean(filters.veg || filters.maxPrice || filters.spice || filters.hasAr);
  const searchKey = JSON.stringify({ q: query.trim(), ...filters });
  const searching = searchActive && found?.key !== searchKey;
  const results = searchActive && found?.key === searchKey ? found.items : null;

  useEffect(() => {
    if (!searchActive) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      const q = query.trim();
      searchCourt(slug, { q, ...filters }, ctrl.signal)
        .then((r) => {
          const items = r.items || [];
          setFound({ key: searchKey, items });
          if (q.length >= 2) trackCourt(slug, { event: "search", meta: { q, results: items.length } });
        })
        .catch(() => !ctrl.signal.aborted && setFound({ key: searchKey, items: [] }));
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
    // searchKey covers query and filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, searchKey, searchActive]);

  const stallsById = useMemo(() => {
    const m = new Map<string, StallCard>();
    listing?.stalls.forEach((s) => m.set(s.restaurantId, s));
    return m;
  }, [listing]);

  if (error) return <CourtError status={error.status} />;
  if (!listing) return <CourtSkeleton />;

  const { court, stalls, cuisines, popular, featured } = listing;
  const toggle = (k: keyof typeof filters, v: unknown) =>
    setFilters((f) => ({ ...f, [k]: f[k] ? undefined : v }));

  return (
    <div className="min-h-[100dvh] bg-[#F8FAFC] text-slate-900 font-sans">
      {/* Header */}
      <header className="relative overflow-hidden">
        {court.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={court.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_10%_0%,#fdba74_0%,#fb923c_35%,#ea580c_70%,#9a3412_100%)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-black/55" />
        <div className="relative mx-auto max-w-3xl px-4 pt-8 pb-6 text-white">
          <div className="flex items-center gap-3">
            {court.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={court.logoUrl} alt="" className="h-12 w-12 rounded-2xl bg-white object-contain p-1 shadow" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
                <Store size={22} />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-extrabold tracking-tight">{court.name}</h1>
              <p className="flex items-center gap-1 text-sm text-white/85">
                {court.city && (
                  <>
                    <MapPin size={13} /> {court.city} ·{" "}
                  </>
                )}
                {stalls.length} {stalls.length === 1 ? "stall" : "stalls"}
              </p>
            </div>
          </div>
          {zone && (
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> {zone}
            </span>
          )}
        </div>
      </header>

      {/* Search + filters */}
      <div className="sticky top-0 z-20 border-b border-slate-200/80 bg-[#F8FAFC]/95 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 pt-3 pb-2">
          <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm focus-within:border-orange-400">
            <Search size={18} className="shrink-0 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search dishes across all stalls"
              className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-slate-400"
              enterKeyHint="search"
              aria-label="Search dishes"
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label="Clear search" className="text-slate-400">
                <X size={16} />
              </button>
            )}
          </label>
          <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
            <Chip active={!!filters.veg} onClick={() => toggle("veg", true)} icon={<Leaf size={14} />}>
              Veg only
            </Chip>
            <Chip active={!!filters.maxPrice} onClick={() => toggle("maxPrice", PRICE_CAP)}>
              Under {formatPrice(PRICE_CAP)}
            </Chip>
            <Chip active={!!filters.hasAr} onClick={() => toggle("hasAr", true)} icon={<Box size={14} />}>
              See in 3D
            </Chip>
            <Chip active={filters.spice === "hot"} onClick={() => toggle("spice", "hot")} icon={<Flame size={14} />}>
              Spicy
            </Chip>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-4 pb-16">
        {searchActive ? (
          <SearchResults slug={slug} results={results} searching={searching} stallsById={stallsById} />
        ) : (
          <>
            {cuisines.length > 0 && (
              <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4">
                <Chip active={!cuisine} onClick={() => setCuisine("")}>
                  All
                </Chip>
                {cuisines.map((c) => (
                  <Chip key={c} active={cuisine === c} onClick={() => setCuisine(cuisine === c ? "" : c)}>
                    {cuisineLabel(c)}
                  </Chip>
                ))}
              </div>
            )}

            {featured.length > 0 && !cuisine && (
              <Section title="Featured" icon={<Sparkles size={16} className="text-orange-500" />}>
                <DishRow slug={slug} dishes={featured} stallsById={stallsById} sponsored />
              </Section>
            )}

            {popular.length > 0 && !cuisine && (
              <Section title="Popular right now" icon={<TrendingUp size={16} className="text-orange-500" />}>
                <DishRow slug={slug} dishes={popular} stallsById={stallsById} />
              </Section>
            )}

            <Section title={cuisine ? `${cuisineLabel(cuisine)} stalls` : "All stalls"}>
              {stalls.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
                  No stalls here yet.
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {stalls.map((s) => (
                    <li key={s.restaurantId}>
                      <StallRow slug={slug} stall={s} />
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </>
        )}
      </main>
    </div>
  );
}

function Chip({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition active:scale-95 ${
        active
          ? "border-orange-500 bg-orange-500 text-white"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-3 flex items-center gap-1.5 text-[15px] font-extrabold tracking-tight text-slate-900">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

function SponsoredTag() {
  return (
    <span className="rounded-md bg-slate-900/80 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
      Sponsored
    </span>
  );
}

/** Reports one impression when at least half the card has been on screen. */
function useImpression(slug: string, placementId: string | undefined, restaurantId: string) {
  const ref = useRef<HTMLAnchorElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !placementId || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          trackCourt(slug, { event: "sponsored_impression", placement_id: placementId, restaurant_id: restaurantId }, `imp:${placementId}`);
          io.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [slug, placementId, restaurantId]);
  return ref;
}

function StallRow({ slug, stall }: { slug: string; stall: StallCard }) {
  const ref = useImpression(slug, stall.sponsored ? stall.placementId : undefined, stall.restaurantId);
  const onClick = () => {
    if (stall.sponsored && stall.placementId) {
      trackCourt(slug, { event: "sponsored_click", placement_id: stall.placementId, restaurant_id: stall.restaurantId }, `click:${stall.placementId}`);
    }
  };
  return (
    <Link
      ref={ref}
      href={`/fc/${slug}/${stall.restaurantId}`}
      onClick={onClick}
      className={`group flex gap-3 rounded-3xl border bg-white p-3 shadow-sm transition active:scale-[0.99] ${
        stall.sponsored ? "border-orange-200 ring-1 ring-orange-100" : "border-slate-200/80"
      } ${stall.isOpen ? "" : "opacity-60"}`}
    >
      <div className="relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-2xl bg-slate-100">
        {stall.thumbnails[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={stall.thumbnails[0]} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : stall.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={stall.logoUrl} alt="" className="h-full w-full object-contain p-3" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl font-black text-slate-300">
            {stall.name.slice(0, 1)}
          </div>
        )}
        {stall.arItemCount > 0 && (
          <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-0.5 rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-slate-800">
            <Box size={10} /> 3D
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-[16px] font-extrabold tracking-tight">{stall.name}</h3>
          {stall.sponsored && <SponsoredTag />}
        </div>
        <p className="mt-0.5 truncate text-[13px] text-slate-500">
          {[stall.stallLabel, ...stall.cuisineTags.slice(0, 3).map(cuisineLabel)].filter(Boolean).join(" · ")}
        </p>
        <div className="mt-2 flex items-center gap-2 text-[12px] font-semibold">
          {stall.isOpen ? (
            <span className="text-emerald-600">Open</span>
          ) : (
            <span className="text-slate-500">Closed now</span>
          )}
          <span className="text-slate-300">•</span>
          <span className="text-slate-500">
            {stall.itemCount} {stall.itemCount === 1 ? "dish" : "dishes"}
          </span>
        </div>
      </div>
      <ChevronRight size={18} className="self-center text-slate-300 transition group-hover:translate-x-0.5" />
    </Link>
  );
}

function DishRow({
  slug,
  dishes,
  stallsById,
  sponsored = false,
}: {
  slug: string;
  dishes: (CourtDish | FeaturedDish)[];
  stallsById: Map<string, StallCard>;
  sponsored?: boolean;
}) {
  return (
    <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
      {dishes.map((d) => (
        <DishCard
          key={d.id}
          slug={slug}
          dish={d}
          stall={stallsById.get(d.restaurantId)}
          placementId={sponsored ? (d as FeaturedDish).placementId : undefined}
        />
      ))}
    </div>
  );
}

function DishCard({
  slug,
  dish,
  stall,
  placementId,
}: {
  slug: string;
  dish: CourtDish;
  stall?: StallCard;
  placementId?: string;
}) {
  const ref = useImpression(slug, placementId, dish.restaurantId);
  const onClick = () => {
    trackCourt(slug, { event: "item_view", menu_item_id: dish.id, restaurant_id: dish.restaurantId });
    if (placementId) {
      trackCourt(slug, { event: "sponsored_click", placement_id: placementId, restaurant_id: dish.restaurantId }, `click:${placementId}`);
    }
  };
  return (
    <Link
      ref={ref}
      href={`/fc/${slug}/${dish.restaurantId}`}
      onClick={onClick}
      className="w-[160px] shrink-0 snap-start overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm active:scale-[0.98]"
    >
      <div className="relative aspect-[4/3] bg-slate-100">
        {dish.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dish.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
        )}
        <div className="absolute left-2 top-2 flex gap-1">
          {placementId && <SponsoredTag />}
          {dish.hasAr && (
            <span className="inline-flex items-center gap-0.5 rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-slate-800">
              <Box size={10} /> 3D
            </span>
          )}
        </div>
      </div>
      <div className="p-2.5">
        <div className="flex items-start gap-1.5">
          <VegMark veg={dish.isVeg} />
          <p className="line-clamp-2 text-[13px] font-bold leading-tight">{dish.name}</p>
        </div>
        <p className="mt-1 truncate text-[11px] text-slate-500">{stall?.name}</p>
        <p className="mt-1 text-[13px] font-extrabold">{formatPrice(dish.price)}</p>
      </div>
    </Link>
  );
}

function VegMark({ veg }: { veg: boolean }) {
  return (
    <span
      aria-label={veg ? "Vegetarian" : "Non-vegetarian"}
      className={`mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border ${
        veg ? "border-emerald-600" : "border-red-600"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${veg ? "bg-emerald-600" : "bg-red-600"}`} />
    </span>
  );
}

function SearchResults({
  slug,
  results,
  searching,
  stallsById,
}: {
  slug: string;
  results: CourtDish[] | null;
  searching: boolean;
  stallsById: Map<string, StallCard>;
}) {
  if (results === null || (searching && results.length === 0)) {
    return (
      <div className="flex justify-center py-12 text-slate-400">
        <Loader2 className="animate-spin" />
      </div>
    );
  }
  if (results.length === 0) {
    return (
      <p className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
        No dishes match. Try another word or fewer filters.
      </p>
    );
  }
  const groups = new Map<string, CourtDish[]>();
  for (const d of results) groups.set(d.restaurantId, [...(groups.get(d.restaurantId) || []), d]);

  return (
    <div className="mt-4 flex flex-col gap-5">
      {[...groups].map(([rid, dishes]) => {
        const stall = stallsById.get(rid);
        return (
          <section key={rid}>
            <Link href={`/fc/${slug}/${rid}`} className="mb-2 flex items-center justify-between">
              <h3 className="text-[14px] font-extrabold">
                {stall?.name || "Stall"}
                {stall?.stallLabel && <span className="ml-1.5 font-semibold text-slate-400">{stall.stallLabel}</span>}
              </h3>
              <span className="flex items-center text-[12px] font-semibold text-orange-600">
                Menu <ChevronRight size={14} />
              </span>
            </Link>
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl border border-slate-200/80 bg-white">
              {dishes.map((d) => (
                <li key={d.id}>
                  <Link
                    href={`/fc/${slug}/${rid}`}
                    onClick={() => trackCourt(slug, { event: "item_view", menu_item_id: d.id, restaurant_id: rid })}
                    className="flex items-center gap-3 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-1.5">
                        <VegMark veg={d.isVeg} />
                        <p className="text-[14px] font-bold leading-tight">{d.name}</p>
                        {d.hasAr && <Box size={13} className="mt-0.5 shrink-0 text-slate-500" aria-label="Has 3D view" />}
                      </div>
                      {d.description && <p className="mt-1 line-clamp-1 text-[12px] text-slate-500">{d.description}</p>}
                      <p className="mt-1 text-[13px] font-extrabold">{formatPrice(d.price)}</p>
                    </div>
                    {d.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={d.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-2xl object-cover" loading="lazy" />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function CourtSkeleton() {
  return (
    <div className="min-h-[100dvh] bg-[#F8FAFC]">
      <div className="h-36 animate-pulse bg-slate-200" />
      <div className="mx-auto max-w-3xl space-y-3 px-4 pt-4">
        <div className="h-11 animate-pulse rounded-2xl bg-slate-200" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-3xl bg-slate-200" />
        ))}
      </div>
    </div>
  );
}

function CourtError({ status }: { status?: number }) {
  const inactive = status === 410;
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#F8FAFC] px-6 text-center">
      <Store size={36} className="text-slate-300" />
      <h1 className="mt-3 text-lg font-extrabold">{inactive ? "Menus are unavailable right now" : "Food court not found"}</h1>
      <p className="mt-1 max-w-xs text-sm text-slate-500">
        {inactive ? "Please ask the staff at any stall for a menu." : "Check the QR code or link and try again."}
      </p>
    </div>
  );
}
