import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isFoodCourtStallPath } from "@/app/lib/plans";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "qravetech.in";


type AdminSession = {
  authenticated: boolean;
  mfaSetupRequired: boolean;
  menuOnly: boolean;
  /** Set-Cookie headers from a token refresh, to pass on to the browser. */
  setCookies: string[];
};

const signedOut = (): AdminSession => ({
  authenticated: false,
  mfaSetupRequired: false,
  menuOnly: false,
  setCookies: [],
});

/** Overlays the name=value pairs from Set-Cookie headers onto a Cookie header. */
function mergeCookies(cookieHeader: string, setCookies: string[]): string {
  const jar = new Map<string, string>();
  for (const part of cookieHeader.split(";")) {
    const i = part.indexOf("=");
    if (i > 0) jar.set(part.slice(0, i).trim(), part.slice(i + 1).trim());
  }
  for (const sc of setCookies) {
    const pair = sc.split(";")[0];
    const i = pair.indexOf("=");
    if (i > 0) jar.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
  }
  return Array.from(jar, ([k, v]) => `${k}=${v}`).join("; ");
}

// Access tokens last 15 minutes. Without renewing here, opening any staff
// page after 15 idle minutes sent the user to /login even though their
// 30-day refresh token was still good.
async function getAdminSession(req: NextRequest): Promise<AdminSession> {
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
  if (!apiUrl) return signedOut();

  const fetchMe = (cookie: string) =>
    fetch(`${apiUrl}/api/admin/me`, {
      method: "GET",
      headers: { cookie },
      cache: "no-store",
    });

  try {
    let cookie = req.headers.get("cookie") ?? "";
    let setCookies: string[] = [];
    let res = await fetchMe(cookie);

    if (res.status === 401 && req.cookies.get("refresh_token")?.value !== undefined) {
      const csrf = req.cookies.get("csrf_token")?.value ?? "";
      const refreshed = await fetch(`${apiUrl}/auth/refresh`, {
        method: "POST",
        headers: { cookie, "Content-Type": "application/json", "X-CSRF-Token": csrf },
        cache: "no-store",
      });
      if (refreshed.ok) {
        setCookies = refreshed.headers.getSetCookie?.() ?? [];
        cookie = mergeCookies(cookie, setCookies);
        res = await fetchMe(cookie);
      }
    }

    if (res.status === 401) return signedOut();
    if (!res.ok) {
      // Backend busy, rate-limited or down: don't log the user out over it.
      // The staff APIs still check the session on every call.
      return { authenticated: true, mfaSetupRequired: false, menuOnly: false, setCookies };
    }
    const me = await res.json().catch(() => ({}));
    return {
      authenticated: true,
      mfaSetupRequired: me?.mfa?.setup_required === true,
      menuOnly: me?.plan_features?.menu_only === true,
      setCookies,
    };
  } catch {
    // Network error reaching the backend: let the page load; its API calls
    // send the user to /login if the session is really gone.
    return { authenticated: true, mfaSetupRequired: false, menuOnly: false, setCookies: [] };
  }
}

/** True when the backend accepts the request's food court operator cookie. */
async function hasFoodCourtSession(req: NextRequest): Promise<boolean> {
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
  if (!apiUrl) return false;
  try {
    const res = await fetch(`${apiUrl}/api/food-court/me`, {
      headers: { cookie: req.headers.get("cookie") ?? "" },
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false; // fail closed
  }
}

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get("host") || "";

  // ── /staff/* server-side auth guard ────────────────────────────────────────
  // This runs before any page HTML is generated, so unauthenticated users
  // never receive protected content — even as a flash before a client redirect.
  if (url.pathname.startsWith("/staff")) {
    const session = await getAdminSession(req);
    // Hand renewed tokens to the browser on whichever response goes out.
    const withCookies = (res: NextResponse) => {
      for (const c of session.setCookies) res.headers.append("set-cookie", c);
      return res;
    };
    if (!session.authenticated) {
      const loginUrl = new URL("/login", req.url);
      // Preserve the originally-requested URL so the login page can redirect back
      loginUrl.searchParams.set("next", url.pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Owners without two-factor can only reach the security page until it's set up.
    if (session.mfaSetupRequired && !url.pathname.startsWith("/staff/settings/security")) {
      return withCookies(NextResponse.redirect(new URL("/staff/settings/security?setup=required", req.url)));
    }
    // Food court stalls only manage their digital menu: no POS screens.
    if (session.menuOnly && !isFoodCourtStallPath(url.pathname)) {
      return withCookies(NextResponse.redirect(new URL("/staff/menu", req.url)));
    }
    if (session.setCookies.length > 0) return withCookies(NextResponse.next());
  }

  // ── /fc-admin/* food court operator guard ──────────────────────────────────
  if (url.pathname.startsWith("/fc-admin") && !url.pathname.startsWith("/fc-admin/login")) {
    if (!(await hasFoodCourtSession(req))) {
      const loginUrl = new URL("/fc-admin/login", req.url);
      loginUrl.searchParams.set("next", url.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ── Subdomain rewriting ────────────────────────────────────────────────────
  if (
    hostname.endsWith(`.${ROOT_DOMAIN}`) &&
    hostname !== `www.${ROOT_DOMAIN}` &&
    hostname !== ROOT_DOMAIN
  ) {
    // If the customer goes to the root of the subdomain, rewrite them to the menu!
    if (url.pathname === "/") {
      return NextResponse.rewrite(new URL(`/menu`, req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|media).*)"],
};
