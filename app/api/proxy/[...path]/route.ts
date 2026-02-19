import { NextRequest, NextResponse } from "next/server";

function resolveBackendBase(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  if (process.env.NODE_ENV === "production") {
    return "https://qrave-backend.onrender.com";
  }

  const host = request.headers.get("host") || "localhost:3000";
  const hostname = host.split(":")[0] || "localhost";
  return `http://${hostname}:9090`;
}

async function proxy(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const backendBase = resolveBackendBase(request);
  const joinedPath = path.join("/");
  const target = `${backendBase}/${joinedPath}${request.nextUrl.search}`;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");
  headers.delete("accept-encoding");
  headers.set("x-forwarded-proto", request.nextUrl.protocol.replace(":", ""));

  try {
    const init: RequestInit = {
      method: request.method,
      headers,
      body:
        request.method === "GET" || request.method === "HEAD"
          ? undefined
          : await request.arrayBuffer(),
      redirect: "manual",
      cache: "no-store",
    };

    const upstream = await fetch(target, init);

    const responseHeaders = new Headers();
    upstream.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (
        lower === "content-encoding" ||
        lower === "content-length" ||
        lower === "transfer-encoding" ||
        lower === "connection" ||
        lower === "set-cookie"
      ) {
        return;
      }
      responseHeaders.append(key, value);
    });

    // Preserve multiple Set-Cookie headers correctly for auth flows.
    const getSetCookie = (upstream.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
    if (typeof getSetCookie === "function") {
      for (const cookie of getSetCookie.call(upstream.headers)) {
        responseHeaders.append("set-cookie", cookie);
      }
    } else {
      const single = upstream.headers.get("set-cookie");
      if (single) responseHeaders.append("set-cookie", single);
    }

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "proxy request failed";
    return NextResponse.json({ message }, { status: 502 });
  }
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(request, ctx);
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(request, ctx);
}

export async function PUT(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(request, ctx);
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(request, ctx);
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(request, ctx);
}

export async function OPTIONS(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(request, ctx);
}
