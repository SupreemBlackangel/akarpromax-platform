import { NextResponse } from "next/server";

import { destroySession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST() {
  await destroySession();
  return NextResponse.json({ signedOut: true });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: { Allow: "POST, OPTIONS" },
  });
}
