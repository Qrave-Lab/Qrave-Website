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

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;

  const token = localStorage.getItem("access_token");
  if (!token || token === "undefined" || token === "null") {
    return null;
  }
  return token;
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
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

  const token = !isPublic ? getAccessToken() : null;

  const headerInit: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    const cleanToken = token.trim();
    if (/^[a-zA-Z0-9\-_.]+$/.test(cleanToken)) {
      headerInit["Authorization"] = `Bearer ${cleanToken}`;
    }
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
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
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
