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
  headers.set("x-forwarded-proto", request.nextUrl.protocol.replace(":", ""));

  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    redirect: "manual",
    cache: "no-store",
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.duplex = "half";
  }

  const upstream = await fetch(target, init);

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    responseHeaders.append(key, value);
  });

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
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
