import { api } from "@/app/lib/api";

// Operator (food court management) API. Every call skips the staff login
// redirect; pages send the operator to /fc-admin/login on 401 instead.

export type Court = {
  id: string;
  name: string;
  slug: string;
  city: string;
  logoUrl: string;
  subscriptionStatus: string;
  trialEndsAt?: string;
  currentPeriodEnd?: string;
};

export type Me = { user_id: string; role: "owner" | "manager"; court: Court };

export type OperatorStall = {
  restaurantId: string;
  name: string;
  logoUrl: string;
  stallLabel: string;
  cuisineTags: string[];
  isListed: boolean;
  itemCount: number;
  arItemCount: number;
};

export type CountRow = { key: string; visitors: number };
export type Analytics = {
  from: string;
  to: string;
  visitors: number;
  opens: number;
  byHour: CountRow[];
  byDay: CountRow[];
  byZone: CountRow[];
  stalls: { restaurantId: string; name: string; views: number; itemViews: number; view3d: number; arOpens: number }[];
  topSearches: { query: string; searches: number; zeroResults: number }[];
  noResults: { query: string; searches: number; zeroResults: number }[];
};

export type Placement = {
  id: string;
  restaurantId: string;
  restaurantName: string;
  slot: "top_stall" | "featured_item";
  menuItemId?: string;
  menuItemName?: string;
  startsAt: string;
  endsAt: string;
  priceCents: number;
  note: string;
  impressions: number;
  clicks: number;
};

export type QRToken = { token: string; zoneLabel: string; createdAt: string };

const opts = { skipAuthRedirect: true, suppressErrorLog: true, noCache: true } as const;

export const fcAdmin = {
  login: (email: string, password: string) =>
    api<Me & { csrf_token: string }>("/api/food-court/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      ...opts,
    }),
  logout: () => api("/api/food-court/auth/logout", { method: "POST", ...opts }),
  me: () => api<Me>("/api/food-court/me", opts),
  stalls: () => api<{ stalls: OperatorStall[] }>("/api/food-court/stalls", opts),
  updateStall: (id: string, patch: { stall_label?: string; cuisine_tags?: string[]; is_listed?: boolean }) =>
    api(`/api/food-court/stalls/${id}`, { method: "PATCH", body: JSON.stringify(patch), ...opts }),
  analytics: (from: string, to: string) =>
    api<Analytics>(`/api/food-court/analytics?from=${from}&to=${to}`, opts),
  placements: () => api<{ placements: Placement[] }>("/api/food-court/placements", opts),
  createPlacement: (p: {
    restaurant_id: string;
    slot: string;
    menu_item_id?: string;
    starts_at: string;
    ends_at: string;
    price_cents: number;
    note: string;
  }) => api<{ id: string }>("/api/food-court/placements", { method: "POST", body: JSON.stringify(p), ...opts }),
  endPlacement: (id: string) => api(`/api/food-court/placements/${id}/end`, { method: "POST", ...opts }),
  qrTokens: () => api<{ tokens: QRToken[] }>("/api/food-court/qr-tokens", opts),
  changePassword: (current: string, next: string) =>
    api("/api/food-court/auth/password", {
      method: "POST",
      body: JSON.stringify({ current_password: current, new_password: next }),
      ...opts,
    }),
};

/** YYYY-MM-DD in India time, days ago from today. */
export function istDate(daysAgo = 0): string {
  const d = new Date(Date.now() - daysAgo * 86400000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
}

export function isUnauthorized(e: unknown): boolean {
  return (e as { status?: number } | null)?.status === 401;
}
