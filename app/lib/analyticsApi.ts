const ANALYTICS_BASE =
  process.env.NEXT_PUBLIC_ANALYTICS_URL?.trim() || "/api/analytics";

export async function analyticsApi<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${ANALYTICS_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    credentials: "include",
  });

  if (res.status === 401 && typeof window !== "undefined") {
    window.location.href = "/login";
    throw new Error("Session expired");
  }

  if (!res.ok) {
    const raw = await res.text();
    let msg = raw;
    try {
      const parsed = JSON.parse(raw);
      msg = parsed?.detail || parsed?.error || parsed?.message || raw;
    } catch {
      // ignore parse error
    }
    throw new Error(msg || "Analytics error");
  }

  if (res.status === 204) return {} as T;
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : ({} as T);
}
