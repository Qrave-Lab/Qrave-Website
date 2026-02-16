import { NextRequest } from "next/server";

const ANALYTICS_UPSTREAM =
  process.env.ANALYTICS_SERVICE_URL?.trim() ||
  process.env.NEXT_PUBLIC_ANALYTICS_URL?.trim() ||
  "http://localhost:9092";

function buildUpstreamURL(req: NextRequest, path: string[] | undefined): string {
  const base = ANALYTICS_UPSTREAM.replace(/\/+$/, "");
  const joined = (path || []).join("/");
  const search = req.nextUrl.search || "";
  return `${base}/${joined}${search}`;
}

function cloneHeaders(req: NextRequest): Headers {
  const headers = new Headers();
  for (const [key, value] of req.headers.entries()) {
    if (key.toLowerCase() === "host") continue;
    if (key.toLowerCase() === "content-length") continue;
    headers.set(key, value);
  }
  return headers;
}

async function proxy(req: NextRequest, path: string[] | undefined): Promise<Response> {
  const url = buildUpstreamURL(req, path);
  let body: BodyInit | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    const raw = await req.arrayBuffer();
    body = raw.byteLength ? raw : undefined;
  }

  const res = await fetch(url, {
    method: req.method,
    headers: cloneHeaders(req),
    body,
    cache: "no-store",
  });

  const outHeaders = new Headers();
  for (const [key, value] of res.headers.entries()) {
    if (key.toLowerCase() === "content-length") continue;
    outHeaders.set(key, value);
  }

  const responseBody = await res.arrayBuffer();
  return new Response(responseBody, {
    status: res.status,
    statusText: res.statusText,
    headers: outHeaders,
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const p = await params;
  return proxy(req, p.path);
}

export async function OPTIONS(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const p = await params;
  return proxy(req, p.path);
}
