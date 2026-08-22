import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "qravetech.in";

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get("host") || "";

  // Check if we are on a custom subdomain
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
