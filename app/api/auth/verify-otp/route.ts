import { NextResponse } from "next/server";
import { backendUrl, TOKEN_COOKIE } from "@/lib/backend";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const upstream = await fetch(`${backendUrl}/api/auth/verify-otp`, {
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
    if (!data.token)
      return NextResponse.json(
        { success: false, message: "Missing authentication token" },
        { status: 502 },
      );
    const response = NextResponse.json({ success: true, role: data.user.role });
    response.cookies.set(TOKEN_COOKIE, data.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 8 * 60 * 60,
    });
    return response;
  } catch {
    return NextResponse.json(
      { success: false, message: "Backend unavailable or invalid request" },
      { status: 502 },
    );
  }
}
