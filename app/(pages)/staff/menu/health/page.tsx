"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Box,
  Check,
  FolderX,
  History,
  Image as ImageIcon,
  Link2Off,
  Loader2,
  PackageX,
  RefreshCw,
  Search,
  ShieldAlert,
  TrendingDown,
  X,
} from "lucide-react";
import SettingsPageLayout from "@/app/components/settings/SettingsPageLayout";
import { api } from "@/app/lib/api";

type MenuHealthItem = {
  id: string;
  name: string;
  category_name: string;
  price: number;
  food_cost: number;
  order_count: number;
  out_of_stock_events: number;
  missing_image: boolean;
  missing_model: boolean;
  missing_category: boolean;
  missing_allergens: boolean;
  is_archived: boolean;
  hidden_but_linked: boolean;
};

type CheckId = "image" | "model" | "allergens" | "never" | "margin" | "stock" | "category" | "linked";
type Tone = "rose" | "amber" | "neutral";

const LOW_MARGIN = 0.35;
const marginPct = (i: MenuHealthItem) => (i.price > 0 && i.food_cost > 0 ? (i.price - i.food_cost) / i.price : null);

const CHECKS: {
  id: CheckId;
  label: string;
  flag: string;
  hint: string;
  tone: Tone;
  icon: React.ElementType;
  /** Optional extras don't stop a dish counting as ready for service. */
  optional?: boolean;
  test: (i: MenuHealthItem) => boolean;
}[] = [
  { id: "allergens", label: "No allergen info", flag: "No allergens", hint: "Guests can't check what's safe to eat", tone: "rose", icon: ShieldAlert, test: (i) => i.missing_allergens },
  { id: "image", label: "No photo", flag: "No photo", hint: "Dishes with photos get ordered more", tone: "amber", icon: ImageIcon, test: (i) => i.missing_image },
  { id: "margin", label: "Low margin", flag: "Low margin", hint: "Food cost is over 65% of the price", tone: "amber", icon: TrendingDown, test: (i) => { const m = marginPct(i); return m !== null && m < LOW_MARGIN; } },
  { id: "stock", label: "Often out of stock", flag: "Often runs out", hint: "Ran out 3 or more times", tone: "amber", icon: PackageX, test: (i) => i.out_of_stock_events >= 3 },
  { id: "never", label: "Never ordered", flag: "Never ordered", hint: "No orders yet", tone: "neutral", icon: History, test: (i) => i.order_count === 0 },
  { id: "category", label: "No category", flag: "No category", hint: "Won't appear under any section", tone: "amber", icon: FolderX, test: (i) => i.missing_category || !i.category_name },
  { id: "model", label: "No 3D model", flag: "No 3D model", hint: "Can't be viewed in AR. Optional", tone: "neutral", icon: Box, optional: true, test: (i) => i.missing_model },
  { id: "linked", label: "Archived but still linked", flag: "Archived, still linked", hint: "Still used by a combo or offer", tone: "amber", icon: Link2Off, test: (i) => i.is_archived && i.hidden_but_linked },
];

const TONE_TEXT: Record<Tone, string> = { rose: "text-rose-600", amber: "text-amber-700", neutral: "text-[#0F1117]" };
const TONE_DOT: Record<Tone, string> = { rose: "bg-rose-500", amber: "bg-amber-500", neutral: "bg-[#9CA3AF]" };

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export default function MenuHealthPage() {
  const router = useRouter();
  const [items, setItems] = useState<MenuHealthItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [filter, setFilter] = useState<CheckId | "issues" | "all">("all");
  const [query, setQuery] = useState("");

  const refresh = async (initial = false) => {
    try {
      if (initial) setLoading(true);
      else setRefreshing(true);
      const data = await api<MenuHealthItem[]>("/api/admin/menu/health");
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const me = await api<{ role?: string; theme_config?: { role_access?: Record<string, Record<string, boolean>> } }>("/api/admin/me");
        const nextRole = String(me?.role || "").toLowerCase();
        const roleAccess = me?.theme_config?.role_access;
        if (nextRole && nextRole !== "owner" && nextRole !== "admin") {
          const allowed = roleAccess?.[nextRole]?.insights;
          if (allowed === false) {
            setAccessDenied(true);
            setLoading(false);
            return;
          }
        }
      } catch {
        // Fall through and try loading the page data
      }
      refresh(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hooks stay above any early return.
  const counts = useMemo(() => {
    const c = {} as Record<CheckId, number>;
    CHECKS.forEach((k) => (c[k.id] = items.filter(k.test).length));
    return c;
  }, [items]);

  const flagsOf = (i: MenuHealthItem) => CHECKS.filter((k) => k.test(i));
  const isReady = (i: MenuHealthItem) => CHECKS.every((k) => k.optional || !k.test(i));
  const healthy = useMemo(() => items.filter(isReady).length, [items]);
  const reportRef = React.useRef<HTMLElement | null>(null);
  const showInReport = (id: CheckId) => {
    setFilter(id);
    requestAnimationFrame(() => reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const suggestions = useMemo(() => {
    const out: { id: CheckId; text: string; n: number }[] = [];
    if (counts.allergens) out.push({ id: "allergens", n: counts.allergens, text: `${counts.allergens === 1 ? "dish is" : "dishes are"} missing allergen info. Fix these first; guests rely on it.` });
    if (counts.stock) out.push({ id: "stock", n: counts.stock, text: `${counts.stock === 1 ? "dish keeps" : "dishes keep"} running out. Prep more or adjust par levels.` });
    if (counts.margin) out.push({ id: "margin", n: counts.margin, text: `${counts.margin === 1 ? "dish earns" : "dishes earn"} a thin margin. Review the price or the recipe.` });
    if (counts.never) out.push({ id: "never", n: counts.never, text: `${counts.never === 1 ? "dish has" : "dishes have"} never been ordered. Promote, rename or remove ${counts.never === 1 ? "it" : "them"}.` });
    if (counts.image) out.push({ id: "image", n: counts.image, text: `${counts.image === 1 ? "dish has" : "dishes have"} no photo.` });
    return out;
  }, [counts]);

  const watchList = useMemo(() => {
    const stock = items
      .filter((i) => i.out_of_stock_events > 0)
      .sort((a, b) => b.out_of_stock_events - a.out_of_stock_events)
      .slice(0, 3)
      .map((i) => ({ id: `s-${i.id}`, name: i.name, note: `Ran out ${i.out_of_stock_events} ${i.out_of_stock_events === 1 ? "time" : "times"}`, tone: "rose" as Tone }));
    const margin = items
      .map((i) => ({ i, m: marginPct(i) }))
      .filter((x) => x.m !== null && (x.m as number) < LOW_MARGIN)
      .sort((a, b) => (a.m as number) - (b.m as number))
      .slice(0, 3)
      .map(({ i, m }) => ({ id: `m-${i.id}`, name: i.name, note: `${Math.round((m as number) * 100)}% margin`, tone: "amber" as Tone }));
    return [...stock, ...margin];
  }, [items]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((i) => {
        if (filter === "issues") return !isReady(i);
        if (filter !== "all") return CHECKS.find((k) => k.id === filter)!.test(i);
        return true;
      })
      .filter((i) => !q || i.name.toLowerCase().includes(q) || (i.category_name || "").toLowerCase().includes(q))
      .sort((a, b) => flagsOf(b).length - flagsOf(a).length || a.name.localeCompare(b.name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, filter, query]);

  if (accessDenied) {
    return (
      <SettingsPageLayout title="Menu health" description="Gaps to fix before service">
        <div className="mx-auto max-w-md rounded-2xl border border-[#E8E8E3] bg-white px-8 py-10 text-center">
          <ShieldAlert className="mx-auto h-6 w-6 text-[#C4C4BE]" />
          <h2 className="mt-3 text-[17px] font-bold text-[#0F1117]">You can&apos;t view menu health</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-[#6B7280]">Your role doesn&apos;t have access to insights. Ask the owner to turn it on in Role access.</p>
          <button
            type="button"
            onClick={() => router.push("/staff")}
            className="mt-5 inline-flex h-10 items-center rounded-xl border border-[#E8E8E3] bg-white px-4 text-[13px] font-semibold text-[#374151] transition-colors hover:border-[#D6D6CF] hover:text-[#0F1117]"
          >
            Go to the floor
          </button>
        </div>
      </SettingsPageLayout>
    );
  }

  const pct = items.length ? Math.round((healthy / items.length) * 100) : 0;
  const activeCheck = CHECKS.find((k) => k.id === filter);

  return (
    <SettingsPageLayout
      title="Menu health"
      description="Gaps in your menu to fix before service"
      maxWidth="max-w-6xl"
      action={
        <button
          type="button"
          onClick={() => refresh(false)}
          disabled={loading || refreshing}
          aria-label="Refresh menu health"
          title="Refresh menu health"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E8E8E3] bg-white text-[#6B7280] transition-colors hover:border-[#D6D6CF] hover:bg-[#FAFAF7] hover:text-[#0F1117] disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      }
    >
      {loading ? (
        <div className="flex h-72 items-center justify-center gap-2 text-[14px] text-[#6B7280]">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking your menu
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[#E8E8E3] bg-white px-6 py-20 text-center">
          <Search className="h-6 w-6 text-[#C4C4BE]" />
          <p className="mt-3 text-[15px] font-semibold text-[#0F1117]">No dishes to check yet</p>
          <p className="mt-1 max-w-sm text-[13px] text-[#6B7280]">Add dishes to your menu and they&apos;ll be checked here.</p>
        </div>
      ) : (
        <>
          {/* Overall */}
          <section className="rounded-2xl border border-[#E8E8E3] bg-white px-6 py-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[12px] font-medium text-[#6B7280]">Ready for service</p>
                <p className="mt-1 flex items-baseline gap-2">
                  <span className="text-[32px] font-bold leading-none tabular-nums tracking-[-0.03em] text-[#0F1117]">{healthy}</span>
                  <span className="text-[15px] tabular-nums text-[#6B7280]">of {items.length} dishes have no issues</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFilter(filter === "issues" ? "all" : "issues")}
                aria-pressed={filter === "issues"}
                className={`inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-[13px] font-semibold transition-colors ${filter === "issues" ? "border-[#0F1117] bg-[#0F1117] text-white" : "border-[#E8E8E3] bg-white text-[#374151] hover:border-[#D6D6CF] hover:text-[#0F1117]"}`}
              >
                {items.length - healthy} need attention
              </button>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#F3F3EF]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Dishes with no issues">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
            </div>
          </section>

          {/* Checks */}
          <section>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="text-[15px] font-semibold text-[#0F1117]">Checks</h2>
              <p className="text-[12px] text-[#9CA3AF]">Click a check to see the dishes it found.</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {CHECKS.map((k) => {
                const n = counts[k.id];
                const on = filter === k.id;
                const Icon = k.icon;
                return (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => setFilter(on ? "all" : k.id)}
                    disabled={n === 0}
                    aria-pressed={on}
                    className={`flex flex-col rounded-2xl border bg-white p-4 text-left transition-colors disabled:cursor-default ${on ? "border-[#fe5c13] ring-1 ring-[#fe5c13]" : "border-[#E8E8E3] enabled:hover:border-[#D6D6CF]"}`}
                  >
                    <span className="flex items-center justify-between">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${n ? "bg-[#F3F3EF] text-[#4B5563]" : "bg-emerald-50 text-emerald-600"}`}>
                        {n ? <Icon className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                      </span>
                      <span className={`text-[22px] font-bold leading-none tabular-nums tracking-[-0.02em] ${n ? TONE_TEXT[k.tone] : "text-[#C4C4BE]"}`}>{n}</span>
                    </span>
                    <span className="mt-3 text-[13px] font-semibold text-[#0F1117]">{k.label}</span>
                    <span className="mt-0.5 text-[12px] leading-snug text-[#6B7280]">{n ? k.hint : "All clear"}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Where to start */}
          {(suggestions.length > 0 || watchList.length > 0) && (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <section className="rounded-2xl border border-[#E8E8E3] bg-white">
                <div className="border-b border-[#F0F0EB] px-6 py-4">
                  <h2 className="text-[15px] font-semibold text-[#0F1117]">Where to start</h2>
                  <p className="mt-0.5 text-[13px] text-[#6B7280]">In order of what matters most to guests.</p>
                </div>
                <ol className="divide-y divide-[#F0F0EB]">
                  {suggestions.map((s, idx) => (
                    <li key={s.id} className="flex items-start gap-3 px-6 py-3.5">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F3F3EF] text-[11px] font-semibold tabular-nums text-[#6B7280]">{idx + 1}</span>
                      <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-[#4B5563]">
                        <span className="font-semibold tabular-nums text-[#0F1117]">{s.n}</span> {s.text}
                      </p>
                      <button
                        type="button"
                        onClick={() => showInReport(s.id)}
                        className="shrink-0 rounded-lg px-2 py-1 text-[12px] font-semibold text-[#6B7280] transition-colors hover:bg-[#F3F3EF] hover:text-[#0F1117]"
                      >
                        Show
                      </button>
                    </li>
                  ))}
                  {suggestions.length === 0 && <li className="px-6 py-6 text-[13px] text-[#6B7280]">Nothing urgent. Your menu is in good shape.</li>}
                </ol>
              </section>

              <section className="rounded-2xl border border-[#E8E8E3] bg-white">
                <div className="border-b border-[#F0F0EB] px-6 py-4">
                  <h2 className="text-[15px] font-semibold text-[#0F1117]">Dishes to watch</h2>
                  <p className="mt-0.5 text-[13px] text-[#6B7280]">Most stock-outs and thinnest margins.</p>
                </div>
                {watchList.length === 0 ? (
                  <p className="flex items-center gap-2 px-6 py-6 text-[13px] text-emerald-700">
                    <Check className="h-4 w-4" /> No dishes running out or losing money.
                  </p>
                ) : (
                  <ul className="divide-y divide-[#F0F0EB]">
                    {watchList.map((w) => (
                      <li key={w.id} className="flex items-center justify-between gap-3 px-6 py-3">
                        <span className="flex min-w-0 items-center gap-2.5">
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT[w.tone]}`} />
                          <span className="truncate text-[13px] font-semibold text-[#0F1117]">{w.name}</span>
                        </span>
                        <span className={`shrink-0 text-[12px] font-medium tabular-nums ${TONE_TEXT[w.tone]}`}>{w.note}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}

          {/* Report */}
          <section ref={reportRef} className="scroll-mt-6 overflow-hidden rounded-2xl border border-[#E8E8E3] bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0F0EB] px-6 py-4">
              <div className="flex items-center gap-2.5">
                <h2 className="text-[15px] font-semibold text-[#0F1117]">All dishes</h2>
                <span className="rounded-full bg-[#F3F3EF] px-2.5 py-1 text-[12px] font-medium leading-none tabular-nums text-[#6B7280]">
                  {shown.length === items.length ? items.length : `${shown.length} of ${items.length}`}
                </span>
                {filter !== "all" && (
                  <button
                    type="button"
                    onClick={() => setFilter("all")}
                    className="inline-flex h-7 items-center gap-1.5 rounded-full border border-[#fe5c13] bg-[#FFF4EC] pl-2.5 pr-2 text-[12px] font-medium text-[#0F1117] transition-colors hover:bg-[#FFE9DA]"
                  >
                    {filter === "issues" ? "Needs attention" : activeCheck?.label}
                    <X className="h-3.5 w-3.5 text-[#6B7280]" />
                    <span className="sr-only">Clear filter</span>
                  </button>
                )}
              </div>
              <div className="relative w-60">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search dish or category"
                  aria-label="Search dishes"
                  className="h-9 w-full rounded-xl border border-[#E8E8E3] bg-white pl-9 pr-3 text-[13px] text-[#0F1117] outline-none transition-colors placeholder:text-[#9CA3AF] hover:border-[#D6D6CF] focus:border-[#fe5c13]"
                />
              </div>
            </div>
            {shown.length === 0 ? (
              <p className="px-6 py-14 text-center text-[13px] text-[#6B7280]">No dishes match.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[#F0F0EB] text-[12px] text-[#6B7280]">
                      <th className="px-6 py-3 font-medium">Dish</th>
                      <th className="px-6 py-3 font-medium">Issues</th>
                      <th className="px-6 py-3 text-right font-medium">Orders</th>
                      <th className="px-6 py-3 text-right font-medium">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0F0EB] text-[13px]">
                    {shown.map((item) => {
                      const flags = flagsOf(item);
                      const m = marginPct(item);
                      return (
                        <tr key={item.id} className="transition-colors hover:bg-[#FAFAF7]">
                          <td className="px-6 py-3.5">
                            <p className="text-[14px] font-semibold text-[#0F1117]">{item.name}</p>
                            <p className="mt-0.5 text-[12px] text-[#9CA3AF]">{item.category_name || "No category"}</p>
                          </td>
                          <td className="px-6 py-3.5">
                            {flags.length ? (
                              <div className="flex flex-wrap gap-1.5">
                                {flags.map((f) => (
                                  <span key={f.id} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[#E8E8E3] bg-white px-2 py-0.5 text-[12px] font-medium text-[#374151]">
                                    <span className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[f.tone]}`} />
                                    {f.flag}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-emerald-700">
                                <Check className="h-3.5 w-3.5" /> No issues
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-3.5 text-right tabular-nums">
                            <span className={item.order_count ? "font-semibold text-[#0F1117]" : "text-[#9CA3AF]"}>{item.order_count.toLocaleString("en-IN")}</span>
                          </td>
                          <td className="px-6 py-3.5 text-right tabular-nums">
                            {m === null ? (
                              <span className="text-[12px] text-[#9CA3AF]" title="Add a food cost to this dish to see its margin">No cost set</span>
                            ) : (
                              <>
                                <span className={`font-semibold ${m < LOW_MARGIN ? "text-amber-700" : "text-[#0F1117]"}`}>{inr(Math.max(item.price - item.food_cost, 0))}</span>
                                <span className={`ml-1.5 text-[12px] ${m < LOW_MARGIN ? "text-amber-700" : "text-[#9CA3AF]"}`}>{Math.round(m * 100)}%</span>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <p className="flex items-center gap-1.5 px-1 text-[12px] text-[#9CA3AF]">
            <AlertTriangle className="h-3.5 w-3.5" /> Low margin means food cost is more than 65% of the selling price.
          </p>
        </>
      )}
    </SettingsPageLayout>
  );
}
