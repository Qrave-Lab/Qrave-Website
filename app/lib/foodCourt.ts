import { api } from "@/app/lib/api";

// ─── Types (match qrave-backend food court API) ──────────────────────────────

export type PublicCourt = {
  id: string;
  name: string;
  slug: string;
  address: string;
  city: string;
  logoUrl: string;
  coverUrl: string;
  themeConfig?: unknown;
  opensAt: string;
  closesAt: string;
};

export type StallCard = {
  restaurantId: string;
  name: string;
  logoUrl: string;
  stallLabel: string;
  cuisineTags: string[];
  isListed: boolean;
  opensAt: string;
  closesAt: string;
  itemCount: number;
  arItemCount: number;
  thumbnails: string[];
  themeConfig?: unknown;
  isOpen: boolean;
  sponsored: boolean;
  placementId?: string;
};

export type CourtDish = {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  isVeg: boolean;
  spiceLevel: string;
  hasAr: boolean;
  isBestSeller: boolean;
};

export type FeaturedDish = CourtDish & { placementId: string; sponsored: boolean };

export type CourtListing = {
  court: PublicCourt;
  stalls: StallCard[];
  cuisines: string[];
  popular: CourtDish[];
  featured: FeaturedDish[];
};

export type SearchFilters = {
  q?: string;
  veg?: boolean;
  maxPrice?: number;
  spice?: string;
  hasAr?: boolean;
};

const base = (slug: string) => `/public/food-courts/${encodeURIComponent(slug)}`;
const quiet = { suppressErrorLog: true, skipAuthRedirect: true, noCache: true } as const;

export function resolveCourtToken(token: string) {
  return api<{ court: PublicCourt; zone: string }>(
    `/public/food-courts/resolve?token=${encodeURIComponent(token)}`,
    quiet,
  );
}

export function fetchListing(slug: string, cuisine = "") {
  const params = new URLSearchParams({ visitor_id: visitorId() });
  if (cuisine) params.set("cuisine", cuisine);
  return api<CourtListing>(`${base(slug)}/stalls?${params}`, quiet);
}

export function fetchStallMenu(slug: string, restaurantId: string) {
  return api<{ court: PublicCourt; stall: StallCard; items: any[] }>(
    `${base(slug)}/stalls/${encodeURIComponent(restaurantId)}/menu`,
    quiet,
  );
}

export function searchCourt(slug: string, f: SearchFilters, signal?: AbortSignal) {
  const params = new URLSearchParams();
  if (f.q) params.set("q", f.q);
  if (f.veg) params.set("veg", "1");
  if (f.maxPrice) params.set("max_price", String(f.maxPrice));
  if (f.spice) params.set("spice", f.spice);
  if (f.hasAr) params.set("has_ar", "1");
  return api<{ items: CourtDish[] }>(`${base(slug)}/search?${params}`, { ...quiet, signal });
}

// ─── Visitor id: random, per browser, no personal data ───────────────────────

const VISITOR_KEY = "qrave_fc_visitor";
let memoryVisitor = "";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  // Fallback for very old browsers.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function visitorId(): string {
  if (memoryVisitor) return memoryVisitor;
  try {
    const stored = window.localStorage.getItem(VISITOR_KEY);
    if (stored) return (memoryVisitor = stored);
    memoryVisitor = newId();
    window.localStorage.setItem(VISITOR_KEY, memoryVisitor);
  } catch {
    memoryVisitor = memoryVisitor || newId();
  }
  return memoryVisitor;
}

// ─── Zone: which QR code (table / entrance) the visitor scanned ──────────────

const zoneKey = (slug: string) => `qrave_fc_zone:${slug}`;

export function rememberZone(slug: string, zone: string) {
  try {
    window.sessionStorage.setItem(zoneKey(slug), zone);
  } catch {
    // private mode: analytics just won't know the zone
  }
}

export function currentZone(slug: string): string {
  try {
    return window.sessionStorage.getItem(zoneKey(slug)) || "";
  } catch {
    return "";
  }
}

// ─── Events: batched, flushed every few seconds and when the page hides ──────

export type CourtEventName =
  | "court_open"
  | "stall_view"
  | "item_view"
  | "search"
  | "view_3d"
  | "ar_open"
  | "sponsored_impression"
  | "sponsored_click";

export type CourtEvent = {
  event: CourtEventName;
  restaurant_id?: string;
  menu_item_id?: string;
  placement_id?: string;
  meta?: Record<string, unknown>;
};

const FLUSH_MS = 5000;
const MAX_BATCH = 50;
const queues = new Map<string, CourtEvent[]>();
const once = new Set<string>();
let timer: ReturnType<typeof setTimeout> | null = null;
let listening = false;

function payload(slug: string, events: CourtEvent[]) {
  return JSON.stringify({ visitor_id: visitorId(), zone: currentZone(slug), events });
}

function flush(useBeacon = false) {
  timer = null;
  for (const [slug, events] of queues) {
    if (events.length === 0) continue;
    const batch = events.splice(0, MAX_BATCH);
    const body = payload(slug, batch);
    const url = `/api/proxy${base(slug)}/events`;
    if (useBeacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: "text/plain" }));
    } else {
      void api(`${base(slug)}/events`, { method: "POST", body, ...quiet }).catch(() => {
        // Analytics only; drop on failure.
      });
    }
    if (events.length > 0) schedule();
  }
}

function schedule() {
  if (timer || typeof window === "undefined") return;
  timer = setTimeout(() => flush(false), FLUSH_MS);
}

function listen() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("pagehide", () => flush(true));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush(true);
  });
}

/**
 * Queues an analytics event. With dedupeKey, the event is sent at most once
 * per page load (e.g. one impression per sponsored card).
 */
export function trackCourt(slug: string, e: CourtEvent, dedupeKey?: string) {
  if (typeof window === "undefined" || !slug) return;
  if (dedupeKey) {
    const k = `${slug}:${dedupeKey}`;
    if (once.has(k)) return;
    once.add(k);
  }
  listen();
  const q = queues.get(slug) ?? [];
  q.push(e);
  queues.set(slug, q);
  if (q.length >= MAX_BATCH) flush(false);
  else schedule();
}

// ─── Display helpers ─────────────────────────────────────────────────────────

export function formatPrice(rupees: number): string {
  return `₹${Math.round(rupees).toLocaleString("en-IN")}`;
}

export function cuisineLabel(tag: string): string {
  return tag
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}
