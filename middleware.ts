import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isFoodCourtStallPath } from "@/app/lib/plans";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "qravetech.in";


type AdminSession = { authenticated: boolean; mfaSetupRequired: boolean; menuOnly: boolean };

async function getAdminSession(req: NextRequest): Promise<AdminSession> {
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
  if (!apiUrl) return { authenticated: false, mfaSetupRequired: false, menuOnly: false };

  try {
    const res = await fetch(`${apiUrl}/api/admin/me`, {
      method: "GET",
      headers: {
        // Forward the browser's cookies so the backend can validate the session
        cookie: req.headers.get("cookie") ?? "",
      },
      // Never cache auth checks
      cache: "no-store",
    });
    if (!res.ok) return { authenticated: false, mfaSetupRequired: false, menuOnly: false }; // 401/403 = not
    const me = await res.json().catch(() => ({}));
    return {
      authenticated: true,
      mfaSetupRequired: me?.mfa?.setup_required === true,
      menuOnly: me?.plan_features?.menu_only === true,
    };
  } catch {
    // Network error — fail closed (deny access)
    return { authenticated: false, mfaSetupRequired: false, menuOnly: false };
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
    if (!session.authenticated) {
      const loginUrl = new URL("/login", req.url);
      // Preserve the originally-requested URL so the login page can redirect back
      loginUrl.searchParams.set("next", url.pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Owners without two-factor can only reach the security page until it's set up.
    if (session.mfaSetupRequired && !url.pathname.startsWith("/staff/settings/security")) {
      return NextResponse.redirect(new URL("/staff/settings/security?setup=required", req.url));
    }
    // Food court stalls only manage their digital menu: no POS screens.
    if (session.menuOnly && !isFoodCourtStallPath(url.pathname)) {
      return NextResponse.redirect(new URL("/staff/menu", req.url));
    }
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
