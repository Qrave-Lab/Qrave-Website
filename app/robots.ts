import type { MetadataRoute } from "next";
import { SITE_URL } from "./_lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/staff",
          "/api/",
          "/menu",
          "/checkout",
          "/bill/",
          "/waitlist/",
          "/preview/",
          "/login",
          "/onboarding",
          "/forgot-password",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
