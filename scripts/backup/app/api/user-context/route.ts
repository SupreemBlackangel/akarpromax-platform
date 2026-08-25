import { NextResponse } from "next/server";
import { getSponsorIdentity } from "@/lib/sponsor-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getSponsorIdentity(), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json(
      {
        authenticated: false,
        email: null,
        displayName: "Guest",
        role: "guest",
        countryCode: null,
        permissions: [],
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
