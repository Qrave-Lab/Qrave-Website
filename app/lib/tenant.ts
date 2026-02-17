import { api } from "@/app/lib/api";

const DEFAULT_ROOT_DOMAIN = "qrave-website.vercel.app";

type ResolveRestaurantPayload = {
  restaurant_id?: string;
  restaurant?: string;
};

const inFlightBySlug = new Map<string, Promise<string | null>>();

export function slugifyRestaurantName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getRootDomain(): string {
  return (process.env.NEXT_PUBLIC_ROOT_DOMAIN || DEFAULT_ROOT_DOMAIN).toLowerCase();
}

export function getTenantSlugFromHostname(hostname: string): string | null {
  const host = hostname.trim().toLowerCase();
  const rootDomain = getRootDomain();

  if (!host || host === "localhost" || host === "127.0.0.1") return null;
  if (host === rootDomain || host === `www.${rootDomain}`) return null;
  if (!host.endsWith(`.${rootDomain}`)) return null;

  const subdomain = host.slice(0, -(rootDomain.length + 1));
  if (!subdomain || subdomain.includes(".")) return null;
  if (subdomain === "www") return null;
  return subdomain;
}

export function getTenantSlugFromWindow(): string | null {
  if (typeof window === "undefined") return null;
  return getTenantSlugFromHostname(window.location.hostname);
}

export async function resolveRestaurantIdFromTenantSlug(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  const slug = getTenantSlugFromWindow();
  if (!slug) return null;

  const cachedSlug = localStorage.getItem("tenant_slug");
  const cachedRestaurantId = localStorage.getItem("restaurant_id");
  if (cachedSlug === slug && cachedRestaurantId) {
    return cachedRestaurantId;
  }

  if (inFlightBySlug.has(slug)) {
    return inFlightBySlug.get(slug)!;
  }

  const lookupPromise = (async () => {
    try {
      const res = await api<ResolveRestaurantPayload>(
        `/public/restaurants/resolve?slug=${encodeURIComponent(slug)}`,
        { skipAuthRedirect: true }
      );
      const restaurantId = res?.restaurant_id || null;
      if (restaurantId) {
        localStorage.setItem("restaurant_id", restaurantId);
        localStorage.setItem("tenant_slug", slug);
      }
      if (res?.restaurant) {
        localStorage.setItem("restaurant_name", res.restaurant);
      }
      return restaurantId;
    } catch {
      return null;
    } finally {
      inFlightBySlug.delete(slug);
    }
  })();

  inFlightBySlug.set(slug, lookupPromise);
  return lookupPromise;
}

