import { NextResponse } from "next/server";
import { backendUrl, TOKEN_COOKIE } from "@/lib/backend";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const upstream = await fetch(`${backendUrl}/api/auth/resend-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify(payload),
    });
    const data = await upstream.json();
    if (!upstream.ok)
      return NextResponse.json(
        { success: false, message: data.message ?? "OTP request failed" },
        { status: upstream.status },
      );
    return NextResponse.json({
      success: true,
      challengeToken: data.challengeToken,
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Backend unavailable or invalid request" },
      { status: 502 },
    );
  }
}
