import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }

  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const payload = {
    name: str(body.name),
    email: str(body.email),
    phone: str(body.phone),
    restaurantName: str(body.restaurantName),
    city: str(body.city),
    source: str(body.source),
    website: str(body.website), // honeypot
  };

  if (!payload.name || !payload.email || !payload.phone || !payload.restaurantName) {
    return NextResponse.json({ message: "Missing required contact fields" }, { status: 400 });
  }

  const backendBase = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
  if (!backendBase) {
    console.error("contact: NEXT_PUBLIC_API_URL is not configured");
    return NextResponse.json({ message: "Service unavailable, please try again shortly." }, { status: 503 });
  }

  try {
    const res = await fetch(`${backendBase}/public/contact`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": request.headers.get("x-forwarded-for") ?? "",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (res.ok) {
      return NextResponse.json(
        { success: true, message: "Thanks! A Qrave specialist will get in touch with you shortly." },
        { status: 200 },
      );
    }

    // Pass validation errors (4xx) back so the form can show them; hide 5xx details.
    const text = (await res.text()).trim();
    if (res.status >= 400 && res.status < 500) {
      return NextResponse.json(
        { message: res.status === 429 ? "Too many requests. Please wait a minute and try again." : text || "Invalid request" },
        { status: res.status },
      );
    }
    console.error("contact: backend error", res.status, text);
    return NextResponse.json({ message: "We couldn't save your request. Please try again." }, { status: 502 });
  } catch (err) {
    console.error("contact: backend unreachable", err);
    return NextResponse.json({ message: "We couldn't reach our servers. Please try again." }, { status: 502 });
  }
}
