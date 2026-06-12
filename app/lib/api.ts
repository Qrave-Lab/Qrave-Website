const API_BASE =
  typeof window !== "undefined"
    ? "/api/proxy"
    : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:9090");

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

function persistCsrfFromResponse(res: Response): void {
  if (typeof window === "undefined") return;
  const token = res.headers.get("X-CSRF-Token");
  if (token) {
    localStorage.setItem("csrf_token", token);
  }
}

async function tryRefresh(): Promise<boolean> {
  try {
    const csrf = getCsrfToken();
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(csrf ? { "X-CSRF-Token": csrf } : {}),
      },
      credentials: "include",
    });
    persistCsrfFromResponse(res);
    return res.ok;
  } catch {
    return false;
  }
}

function getCsrfToken(): string | null {
  if (typeof window === "undefined") return null;
  const local = localStorage.getItem("csrf_token");
  if (local) return local;
  const match = document.cookie.match(/(?:^|; )csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// ─── Lightweight GET cache ──────────────────────────────────────────────────
// Prevents duplicate network calls when navigating between pages or mounting
// multiple components that all call the same endpoint (e.g. /api/admin/me).

type CacheEntry = { data: unknown; expiresAt: number };
const _cache = new Map<string, CacheEntry>();
const _inflight = new Map<string, Promise<unknown>>();

// TTL in ms for specific path prefixes (0 = no cache)
const CACHE_TTLS: [string, number][] = [
  ["/api/admin/me", 90_000],
  ["/api/admin/menu", 60_000],
  ["/api/admin/categories", 60_000],
  ["/api/admin/tables", 60_000],
  ["/api/admin/orders/active", 3_000],
  ["/api/admin/sessions/active", 3_000],
  ["/api/admin/service-calls", 3_000],
  ["/api/admin/takeaway/orders", 5_000],
  ["/api/admin/takeaway/summary", 10_000],
  ["/api/admin/sales/today", 10_000],
  ["/api/admin/shifts/active", 5_000],
  ["/api/admin/billing/status", 30_000],
  ["/api/admin/delivery/zones", 60_000],
  ["/api/admin/kitchen/capacity", 30_000],
  ["/api/admin/branches", 60_000],
  ["/api/admin/locations", 60_000],
  ["/api/customer/session", 10_000],
  ["/api/customer/menu", 60_000],
  ["/api/customer/offers", 30_000],
  ["/api/customer/recommendations", 30_000],
];

function ttlFor(path: string): number {
  for (const [prefix, ttl] of CACHE_TTLS) {
    if (path.startsWith(prefix)) return ttl;
  }
  return 0;
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
    const sid = localStorage.getItem("session_id");
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
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data as T;
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
    const csrf = getCsrfToken();
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
    persistCsrfFromResponse(res);
  } catch (err) {
    if ((err as { name?: string } | null)?.name === "AbortError") {
      throw err;
    }
    if (!suppressErrorLog) {
      console.error("Network error:", err);
    } else {
      console.warn("Network error:", err);
    }
    throw new Error("Network error");
  }

  if (res.status === 401 && !isPublic && !skipAuthRedirect && typeof window !== "undefined") {
    if (!didRetry) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        return api<T>(path, options, true);
      }
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

    if (!forcedBase && shouldRetryViaLocalBackend(resolvedPath, res.status, message)) {
      return api<T>(path, options, didRetry, localBackendBase());
    }

    const isKnownError =
      res.status === 400 &&
      (message.includes("order not found") ||
        message.includes("violates foreign key constraint") ||
        message.includes("session_id is required"));
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
      const ttl = ttlFor(resolvedPath);
      if (ttl > 0) {
        _cache.set(resolvedPath, { data, expiresAt: Date.now() + ttl });
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
