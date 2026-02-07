const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined"
    ? (window.location.hostname.includes("vercel.app")
        ? "https://qrave-backend.onrender.com"
        : `http://${window.location.hostname}:9090`)
    : "http://localhost:9090");

const PUBLIC_ROUTES = [
  "/auth/login",
  "/auth/signup",
  "/auth/refresh",
  "/auth/logout",
  "/auth/email_available",
  "/public/otp/request",
  "/public/otp/verify",
  "/public/otp/resend",
  "/public/session/start",
  "/api/customer/menu",
  "/api/customer/orders",
  "/api/customer/orders/items",
  "/api/customer/orders/bill",
  "/api/customer/service-calls",
];

async function tryRefresh(): Promise<boolean> {
  try {
    const csrf =
      typeof document !== "undefined"
        ? document.cookie.match(/(?:^|; )csrf_token=([^;]+)/)?.[1]
        : null;
    await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(csrf ? { "X-CSRF-Token": decodeURIComponent(csrf) } : {}),
      },
      credentials: "include",
    });
    return true;
  } catch {
    return false;
  }
}

function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
  didRetry = false
): Promise<T> {
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

  const headerInit: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  const method = (options.method || "GET").toUpperCase();
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const csrf = getCsrfToken();
    if (csrf) headerInit["X-CSRF-Token"] = csrf;
  }

  let res: Response;

  try {
    res = await fetch(`${API_BASE}${resolvedPath}`, {
      ...options,
      headers: new Headers(headerInit),
      credentials: "include",
    });
  } catch (err) {
    console.error("Network error:", err);
    throw new Error("Network error");
  }

  if (res.status === 401 && !isPublic && typeof window !== "undefined") {
    if (!didRetry) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        return api<T>(path, options, true);
      }
    }
    window.location.href = "/login";
    throw new Error("Session expired. Please login again.");
  }

  if (!res.ok) {
    const raw = await res.text();
    let message = raw;

    try {
      const json = JSON.parse(raw);
      if (json?.message) message = json.message;
    } catch { }

    const isKnownError =
      res.status === 400 &&
      (message.includes("order not found") ||
        message.includes("violates foreign key constraint"));

    if (!isKnownError) {
      console.error("API Error:", resolvedPath, res.status, message);
    } else {
      console.warn("API Note:", resolvedPath, res.status, message.trim());
    }

    throw {
      status: res.status,
      message: message || "Backend error",
    };
  }

  if (res.status === 204) {
    return {} as T;
  }

  const text = await res.text();
  if (!text) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    console.warn("Non-JSON response received:", text);
    return {} as T;
  }
}
