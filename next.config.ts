import type { NextConfig } from "next";

if (!process.env.NEXT_PUBLIC_API_URL) {
  throw new Error("NEXT_PUBLIC_API_URL environment variable is required");
}

const apiUrl = process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, "");

const nextConfig: NextConfig = {
  devIndicators: false,
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: `${apiUrl}/uploads/:path*`,
      },
      // 3D models: one prefix per storage host (see app/lib/modelUrl.ts).
      // The more specific prefixes must come first.
      {
        source: "/api/proxy-model/_cdn2/:path*",
        destination: "https://dx3134t9l37qj.cloudfront.net/:path*",
      },
      {
        source: "/api/proxy-model/_s3/:path*",
        destination: "https://qrave-restaurant-profile.s3.amazonaws.com/:path*",
      },
      {
        source: "/api/proxy-model/:path*",
        destination: "https://dzsxi8qe0pwwl.cloudfront.net/:path*",
      },
    ];
  },
  async headers() {
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self' https://api.razorpay.com https://checkout.razorpay.com",
      "frame-ancestors 'self'",
      "img-src 'self' data: blob: https: http:",
      "media-src 'self' blob: https:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://unpkg.com https://accounts.google.com https://checkout.razorpay.com https://api.razorpay.com",
      "frame-src 'self' https://accounts.google.com https://checkout.razorpay.com https://api.razorpay.com",
      "connect-src 'self' blob: https: http: ws: wss:",
      "worker-src 'self' blob:",
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
