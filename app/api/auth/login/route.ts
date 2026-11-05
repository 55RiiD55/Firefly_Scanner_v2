import { NextResponse } from "next/server";
import { backendUrl, TOKEN_COOKIE } from "@/lib/backend";

export async function POST(request: Request) {
  let credentials: unknown;
  try {
    credentials = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON" },
      { status: 400 },
    );
  }
  try {
    const upstream = await fetch(`${backendUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
      cache: "no-store",
    });
    const data = await upstream.json();
    if (!upstream.ok)
      return NextResponse.json(
        { success: false, message: data.message ?? "Login failed" },
        { status: upstream.status },
      );
    if (data.requiresOtp && data.challengeToken) {
      return NextResponse.json({
        success: true,
        requiresOtp: true,
        challengeToken: data.challengeToken,
      });
    }
    if (!data.token)
      return NextResponse.json(
        { success: false, message: "Missing backend token" },
        { status: 502 },
      );
    const response = NextResponse.json({
      success: true,
      requiresOtp: false,
      role: data.user.role,
      name: data.user.name,
    });
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
      { success: false, message: "Backend unavailable" },
      { status: 502 },
    );
  }
}
