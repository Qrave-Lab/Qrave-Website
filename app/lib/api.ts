/** Fired on window after every API call: detail.ok is false when the server couldn't be reached. */
export const NETWORK_EVENT = "qrave:network";

function reportNetwork(ok: boolean) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(NETWORK_EVENT, { detail: { ok } }));
}

const API_BASE =
  typeof window !== "undefined"
    ? "/api/proxy"
    : (process.env.NEXT_PUBLIC_API_URL as string);

function shouldRetryViaLocalBackend(path: string, status: number, message: string): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  const isLocalHost = host === "localhost" || host === "127.0.0.1";
  if (!isLocalHost) return false;
  if (status !== 404) return false;
  const msg = (message || "").toLowerCase();
  if (!msg.includes("404 page not found")) return false;
  return path.startsWith("/api/") || path.startsWith("/auth/");
}

function localBackendBase(): string {
  if (typeof window === "undefined") return "http://localhost:9090";
  const host = window.location.hostname || "localhost";
  return `http://${host}:9090`;
}

export function getBackendBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined") {
    const host = window.location.hostname || "localhost";
    if (host === "localhost" || host === "127.0.0.1") {
      return `http://${host}:9090`;
    }
  }
  throw new Error("NEXT_PUBLIC_API_URL environment variable is required");
}

const PUBLIC_ROUTES = [
  "/auth/login",
  "/auth/2fa/verify",
  "/auth/signup",
  "/auth/google/login",
  "/auth/google/signup",
  "/auth/refresh",
  "/auth/logout",
  "/auth/email_available",
  "/auth/forgot-password/request",
  "/auth/forgot-password/reset",
  "/public/otp/request",
  "/public/otp/verify",
  "/public/otp/resend",
  "/public/session/start",
  "/public/session/start-by-token",
  "/public/contact",
  "/public/restaurants/resolve",
  "/public/restaurants/",
  "/api/customer/menu",
  "/api/customer/session",
  "/api/customer/orders",
  "/api/customer/orders/items",
  "/api/customer/orders/apply-coupon",
  "/api/customer/recommendations",
  "/api/customer/orders/bill",
  "/api/customer/offers",
  "/api/customer/service-calls",
];

import { setTokenCookie, getTokenCookie } from "./clientCookies";

async function persistCsrfFromResponse(res: Response): Promise<void> {
  if (typeof window === "undefined") return;
  const token = res.headers.get("X-CSRF-Token");
  if (token) {
    await setTokenCookie("csrf_token", token);
  }
}

// Refresh tokens are single-use: the backend revokes each one as it issues the
// next. When several requests hit a 401 together, they must share one refresh;
// otherwise the second refresh presents the revoked token, fails, and the user
// is sent to /login at random.
let refreshInFlight: Promise<string | null> | null = null;

/**
 * Renews the staff tokens, sharing one request between all callers.
 * Resolves to the new access token, "" if renewed without one in the body,
 * or null when the refresh failed.
 */
export function refreshAccessToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = doRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function tryRefresh(): Promise<boolean> {
  return (await refreshAccessToken()) !== null;
}

async function doRefresh(): Promise<string | null> {
  try {
    const csrf = await getCsrfToken();
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(csrf ? { "X-CSRF-Token": csrf } : {}),
      },
      credentials: "include",
    });
    await persistCsrfFromResponse(res);
    if (!res.ok) return null;
    const body = await res.json().catch(() => ({}));
    return String(body?.access_token || "").trim();
  } catch {
    return null;
  }
}

async function getCsrfToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  return await getTokenCookie("csrf_token");
}

// ─── Client-side GET cache ───────────────────────────────────────────────────
// Why not Next.js fetch() cache tags?
//   All browser requests flow through the /api/proxy route handler, which runs
//   in a serverless Node context — not the persistent Next.js cache store.
//   next: { revalidate } / revalidateTag() only helps *server-rendered* pages
//   fetching directly inside RSCs or Server Actions. This cache is exclusively
//   client-side (guarded by `typeof window !== "undefined"`) and covers:
//     • Deduplicating concurrent in-flight GET calls from multiple components
//     • Short-lived TTL memoisation to avoid redundant polls (e.g. /api/admin/me)
//     • Automatic invalidation on mutations via autoBust()
//
// Improvements over a plain Map:
//   • Max size cap — evicts the oldest entry when the cap is exceeded to prevent
//     unbounded memory growth in long-running SPAs.
//   • Stale-while-revalidate — expired entries are returned immediately while a
//     background refetch updates the cache, so UI never blocks on a cold hit.

const CACHE_MAX_ENTRIES = 128;

type CacheEntry = { data: unknown; expiresAt: number; staleUntil: number };
const _cache = new Map<string, CacheEntry>();
const _inflight = new Map<string, Promise<unknown>>();

/** Evict the oldest entry when the cache exceeds CACHE_MAX_ENTRIES. */
function _evictIfFull() {
  if (_cache.size >= CACHE_MAX_ENTRIES) {
    // Map iteration order is insertion order — delete the first (oldest) key.
    const firstKey = _cache.keys().next().value;
    if (firstKey !== undefined) _cache.delete(firstKey);
  }
}

// TTL in ms for specific path prefixes (0 = no cache).
// staleMs — how long after expiry to still serve stale data while refetching.
const CACHE_TTLS: [string, ttl: number, staleMs?: number][] = [
  ["/api/admin/me", 90_000, 30_000],
  ["/api/admin/menu", 60_000, 30_000],
  ["/api/admin/categories", 60_000, 30_000],
  ["/api/admin/tables", 60_000, 15_000],
  ["/api/admin/orders/active", 3_000, 2_000],
  ["/api/admin/sessions/active", 3_000, 2_000],
  ["/api/admin/service-calls", 3_000, 2_000],
  ["/api/admin/takeaway/orders", 5_000, 3_000],
  ["/api/admin/takeaway/summary", 10_000, 5_000],
  ["/api/admin/sales/today", 10_000, 5_000],
  ["/api/admin/shifts/active", 5_000, 3_000],
  ["/api/admin/billing/status", 30_000, 10_000],
  ["/api/admin/delivery/zones", 60_000, 30_000],
  ["/api/admin/kitchen/capacity", 30_000, 10_000],
  ["/api/admin/branches", 60_000, 30_000],
  ["/api/admin/locations", 60_000, 30_000],
  ["/api/customer/session", 10_000, 5_000],
  ["/api/customer/menu", 60_000, 30_000],
  ["/api/customer/offers", 30_000, 15_000],
  ["/api/customer/recommendations", 30_000, 15_000],
];

function ttlFor(path: string): { ttl: number; staleMs: number } {
  for (const [prefix, ttl, staleMs = 0] of CACHE_TTLS) {
    if (path.startsWith(prefix)) return { ttl, staleMs };
  }
  return { ttl: 0, staleMs: 0 };
}

/** Invalidate all cache entries whose key starts with `prefix`. */
export function bustCache(prefix: string) {
  for (const key of _cache.keys()) {
    if (key.startsWith(prefix)) _cache.delete(key);
  }
}

// Auto-bust on mutations: derive the base path (strip trailing id segments / query strings)
function autoBust(path: string) {
  const base = path.split("?")[0].replace(/\/[0-9a-f-]{36}(\/.+)?$/, "").replace(/\/[0-9]+$/, "");
  bustCache(base);

  const relatedPrefixes: [string, string[]][] = [
    ["/api/admin/orders", ["/api/admin/orders/active", "/api/admin/sessions/active", "/api/admin/sales/today", "/api/admin/kitchen/capacity"]],
    ["/api/admin/sessions", ["/api/admin/sessions/active", "/api/admin/tables", "/api/admin/orders/active"]],
    ["/api/admin/tables", ["/api/admin/tables", "/api/admin/sessions/active"]],
    ["/api/admin/takeaway", ["/api/admin/takeaway/orders", "/api/admin/takeaway/summary", "/api/admin/sales/today"]],
    ["/api/admin/service-calls", ["/api/admin/service-calls"]],
    ["/api/admin/payments", ["/api/admin/orders/active", "/api/admin/sessions/active", "/api/admin/sales/today"]],
    ["/api/admin/billing", ["/api/admin/billing/status"]],
    ["/api/customer/orders", ["/api/customer/orders", "/api/customer/session"]],
    ["/api/customer/service-calls", ["/api/admin/service-calls"]],
  ];

  for (const [prefix, busts] of relatedPrefixes) {
    if (base.startsWith(prefix)) {
      busts.forEach(bustCache);
    }
  }
}

function canDedupeGet(
  method: string,
  options: RequestInit & { noCache?: boolean },
  didRetry: boolean,
  forcedBase?: string
): boolean {
  return (
    method === "GET" &&
    !options.noCache &&
    !didRetry &&
    !forcedBase &&
    typeof window !== "undefined" &&
    !options.signal
  );
}

function makeInflightKey(path: string, method: string): string {
  return `${API_BASE} ${method} ${path}`;
}

async function apiInner<T>(
  path: string,
  options: (RequestInit & { skipAuthRedirect?: boolean; suppressErrorLog?: boolean; noCache?: boolean }) = {},
  didRetry = false,
  forcedBase?: string
): Promise<T> {
  const { skipAuthRedirect = false, suppressErrorLog = false, noCache = false, ...requestOptions } = options;
  let resolvedPath = path;
  if (
    typeof window !== "undefined" &&
    resolvedPath.startsWith("/api/customer") &&
    !resolvedPath.includes("session_id=")
  ) {
    const sid = await getTokenCookie("session_id");
    if (sid) {
      resolvedPath += resolvedPath.includes("?") ? `&session_id=${sid}` : `?session_id=${sid}`;
    }
  }

  const isPublic = PUBLIC_ROUTES.some((route) =>
    resolvedPath.startsWith(route)
  );

  const method = (requestOptions.method || "GET").toUpperCase();

  // ── Cache read for GET requests ──────────────────────────────────────────
  if (method === "GET" && !noCache && typeof window !== "undefined") {
    const cached = _cache.get(resolvedPath);
    if (cached) {
      const now = Date.now();
      if (cached.expiresAt > now) {
        // Fresh — return immediately.
        return cached.data as T;
      }
      if (cached.staleUntil > now) {
        // Stale-while-revalidate: return cached data now, kick off background refresh.
        apiInner<T>(path, { ...options, noCache: true }, didRetry, forcedBase).catch(() => {/* ignore background errors */});
        return cached.data as T;
      }
    }
  }

  // ── Auto-bust cache on mutations ─────────────────────────────────────────
  if (method !== "GET" && method !== "HEAD" && typeof window !== "undefined") {
    autoBust(resolvedPath);
  }

  const headerInit: Record<string, string> = {
    ...(requestOptions.headers as Record<string, string>),
  };
  if (!(requestOptions.body instanceof FormData) && !headerInit["Content-Type"]) {
    headerInit["Content-Type"] = "application/json";
  }
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const csrf = await getCsrfToken();
    if (csrf) headerInit["X-CSRF-Token"] = csrf;
  }

  let res: Response;

  try {
    const base = forcedBase || API_BASE;
    res = await fetch(`${base}${resolvedPath}`, {
      ...requestOptions,
      headers: new Headers(headerInit),
      credentials: "include",
    });
    await persistCsrfFromResponse(res);
    // A gateway error means the proxy is up but the API isn't.
    reportNetwork(res.status !== 502 && res.status !== 503 && res.status !== 504);
  } catch (err) {
    if ((err as { name?: string } | null)?.name === "AbortError") {
      throw err;
    }
    reportNetwork(false);
    if (!suppressErrorLog) {
      console.error("Network error:", err);
    } else {
      console.warn("Network error:", err);
    }
    throw new Error("Network error");
  }

  if (res.status === 401 && !isPublic && !skipAuthRedirect && typeof window !== "undefined") {
    if (!didRetry) {
      await tryRefresh();
      // Retry even when this refresh failed: another tab, or the page guard,
      // may have just renewed the tokens, and the retry uses the new cookies.
      return api<T>(path, options, true);
    }
    window.location.href = "/login";
    throw new Error("Session expired. Please login again.");
  }

  if (res.status === 402 && typeof window !== "undefined") {
    const isAdminPath = resolvedPath.startsWith("/api/admin");
    const isBillingPath = resolvedPath.startsWith("/api/admin/billing/");
    const isMePath = resolvedPath === "/api/admin/me";
    if (isAdminPath && !isBillingPath && !isMePath) {
      const isAlreadyOnSubscription =
        window.location.pathname === "/staff/settings/subscription";
      if (!isAlreadyOnSubscription) {
        window.location.href = "/staff/settings/subscription";
      }
      throw new Error("Subscription required. Please reactivate your plan.");
    }
  }

  if (!res.ok) {
    const raw = await res.text();
    let message = raw?.trim();

    try {
      const json = JSON.parse(raw);
      if (json?.message) message = String(json.message).trim();
    } catch { }

    if (!message) {
      message = res.statusText?.trim() || `Request failed (${res.status})`;
    }

    // Owners must enrol an authenticator app before using the dashboard.
    if (res.status === 403 && typeof window !== "undefined" && message.includes("Set up two-factor authentication")) {
      if (!window.location.pathname.startsWith("/staff/settings/security")) {
        window.location.href = "/staff/settings/security?setup=required";
      }
    }

    if (!forcedBase && shouldRetryViaLocalBackend(resolvedPath, res.status, message)) {
      return api<T>(path, options, didRetry, localBackendBase());
    }

    const isKnownError =
      (res.status === 400 &&
        (message.includes("order not found") ||
          message.includes("violates foreign key constraint") ||
          message.includes("session_id is required"))) ||
      (res.status === 404 && message.includes("feature is disabled"));
    const isExpectedUnauthorized = res.status === 401 && skipAuthRedirect;

    if (!suppressErrorLog && !isKnownError && !isExpectedUnauthorized) {
      console.error("API Error:", resolvedPath, res.status, message);
    } else if (!suppressErrorLog && isKnownError) {
      console.warn("API Note:", resolvedPath, res.status, message.trim());
    }

    const err = new Error(message || "Backend error") as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  if (res.status === 204) {
    return {} as T;
  }

  const text = await res.text();
  if (!text) {
    return {} as T;
  }

  try {
    const data = JSON.parse(text) as T;
    // Cache successful GET responses if TTL is configured
    if (method === "GET" && !noCache && typeof window !== "undefined") {
      const { ttl, staleMs } = ttlFor(resolvedPath);
      if (ttl > 0) {
        _evictIfFull();
        const now = Date.now();
        _cache.set(resolvedPath, { data, expiresAt: now + ttl, staleUntil: now + ttl + staleMs });
      }
    }
    return data;
  } catch {
    console.warn("Non-JSON response received:", text);
    return {} as T;
  }
}

export async function api<T>(
  path: string,
  options: (RequestInit & { skipAuthRedirect?: boolean; suppressErrorLog?: boolean; noCache?: boolean }) = {},
  didRetry = false,
  forcedBase?: string
): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  if (!canDedupeGet(method, options, didRetry, forcedBase)) {
    return apiInner<T>(path, options, didRetry, forcedBase);
  }

  const key = makeInflightKey(path, method);
  const existing = _inflight.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const request = apiInner<T>(path, options, didRetry, forcedBase).finally(() => {
    _inflight.delete(key);
  });
  _inflight.set(key, request);
  return request;
}

let pinPromiseResolver: ((pin: string | null) => void) | null = null;

export function requestManagerPin(): Promise<string | null> {
  return new Promise((resolve) => {
    pinPromiseResolver = resolve;
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("show-manager-pin-modal"));
    } else {
      resolve(null);
    }
  });
}

export function submitManagerPin(pin: string | null) {
  if (pinPromiseResolver) {
    pinPromiseResolver(pin);
    pinPromiseResolver = null;
  }
}
