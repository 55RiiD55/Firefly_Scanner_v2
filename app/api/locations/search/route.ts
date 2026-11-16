import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.BACKEND_API_URL;

    if (!backendUrl) {
      return NextResponse.json(
        { message: "Backend API URL is not configured" },
        { status: 500 },
      );
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("radio_backend_token")?.value;

    if (!token) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 },
      );
    }

    const query = request.nextUrl.searchParams.get("q") ?? "";

    const apiUrl = new URL(
      `${backendUrl.replace(/\/+$/, "")}/api/locations/search`,
    );

    apiUrl.searchParams.set("q", query);

    const response = await fetch(apiUrl.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error) {
    console.error("Location search proxy failed:", error);

    return NextResponse.json(
      { message: "Unable to search locations" },
      { status: 500 },
    );
  }
}
