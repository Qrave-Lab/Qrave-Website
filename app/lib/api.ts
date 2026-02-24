const API_BASE =
  typeof window !== "undefined"
    ? "/api/proxy"
    : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:9090");

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

// TTL in ms for specific path prefixes (0 = no cache)
const CACHE_TTLS: [string, number][] = [
  ["/api/admin/me", 90_000],
  ["/api/admin/menu", 60_000],
  ["/api/admin/categories", 60_000],
  ["/api/admin/tables", 60_000],
  ["/api/admin/delivery/zones", 60_000],
  ["/api/admin/kitchen/capacity", 30_000],
  ["/api/admin/locations", 60_000],
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
}

export async function api<T>(
  path: string,
  options: (RequestInit & { skipAuthRedirect?: boolean; suppressErrorLog?: boolean; noCache?: boolean }) = {},
  didRetry = false
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
    res = await fetch(`${API_BASE}${resolvedPath}`, {
      ...requestOptions,
      headers: new Headers(headerInit),
      credentials: "include",
    });
    persistCsrfFromResponse(res);
  } catch (err) {
    if ((err as { name?: string } | null)?.name === "AbortError") {
      throw err;
    }
    console.error("Network error:", err);
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
      window.location.href = "/staff/settings/subscription";
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

    const isKnownError =
      res.status === 400 &&
      (message.includes("order not found") ||
        message.includes("violates foreign key constraint"));
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
