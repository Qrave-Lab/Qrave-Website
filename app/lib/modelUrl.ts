// 3D models live on more than one host: two CloudFront distributions and the
// S3 bucket itself. None of them send CORS headers, so the browser can't load
// a .glb from them directly; next.config.ts proxies each host under its own
// /api/proxy-model prefix. Keep these in sync with the rewrites there.
const MODEL_HOSTS: Record<string, string> = {
  "dzsxi8qe0pwwl.cloudfront.net": "/api/proxy-model",
  "dx3134t9l37qj.cloudfront.net": "/api/proxy-model/_cdn2",
  "qrave-restaurant-profile.s3.amazonaws.com": "/api/proxy-model/_s3",
};

/** Same-origin URL for a model or media file, routed through our proxy. */
export function toProxiedMediaUrl(raw: string): string {
  let url = raw.trim();
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) {
    if (url.startsWith("//")) url = `https:${url}`;
    else if (/^[a-z0-9.-]+\.(cloudfront\.net|amazonaws\.com)\//i.test(url)) url = `https://${url}`;
    else return url; // already relative, e.g. /api/proxy-model/... or /uploads/...
  }
  try {
    const u = new URL(url);
    const prefix = MODEL_HOSTS[u.host.toLowerCase()];
    if (prefix) return `${prefix}${u.pathname}`;
  } catch {
    // not a URL we can parse; use it as given
  }
  return url;
}
