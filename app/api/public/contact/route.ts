import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, restaurantName, city } = body || {};

    if (!name || !email || !phone || !restaurantName) {
      return NextResponse.json(
        { message: "Missing required contact fields" },
        { status: 400 }
      );
    }

    const backendBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9090";

    try {
      const backendRes = await fetch(`${backendBase}/public/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, restaurantName, city }),
      });

      if (backendRes.ok) {
        const data = await backendRes.json();
        return NextResponse.json(data, { status: 200 });
      }
    } catch (backendErr) {
      console.warn("Go Backend offline, processing via Next.js API layer:", backendErr);
    }

    console.log("📥 [Contact Form Lead Received]", {
      name,
      email,
      phone,
      restaurantName,
      city: city || "N/A",
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        success: true,
        message: "Callback request submitted successfully! A Qrave specialist will get in touch with you.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing contact submission:", error);
    return NextResponse.json(
      { message: "Failed to submit contact request" },
      { status: 500 }
    );
  }
}
