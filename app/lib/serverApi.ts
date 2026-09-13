import { cookies } from "next/headers";

export async function serverApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ');
  const csrfToken = cookieStore.get("csrf_token")?.value;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9090";

  const headers = new Headers(options.headers || {});
  if (allCookies) {
    headers.set("Cookie", allCookies);
  }
  if (csrfToken) {
    headers.set("X-CSRF-Token", csrfToken);
  }
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${path}: ${res.statusText}`);
  }

  if (res.status === 204) return {} as T;
  const text = await res.text();
  if (!text) return {} as T;
  return JSON.parse(text);
}
