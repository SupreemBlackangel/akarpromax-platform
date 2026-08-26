import { NextResponse } from "next/server";
import { getOAuthInitiateUrl } from "@/lib/auth/oauth";
import { getRuntimeEnv } from "@/lib/config/runtime-env";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const url = getOAuthInitiateUrl("google");
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.redirect(new URL("/login?error=google_config_missing", getRuntimeEnv().appUrl));
  }
}
