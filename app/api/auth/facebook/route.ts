import { NextResponse } from "next/server";
import { getOAuthInitiateUrl } from "@/lib/auth/oauth";
import { getRuntimeEnv } from "@/lib/config/runtime-env";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const url = getOAuthInitiateUrl("facebook");
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.redirect(new URL("/login?error=facebook_config_missing", getRuntimeEnv().appUrl));
  }
}
