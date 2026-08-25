import { NextRequest, NextResponse } from "next/server";
import {
  exchangeGoogleCode,
  fetchGoogleUserInfo,
  findOrCreateOAuthUser,
} from "@/lib/auth/oauth";
import { createSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL("/login?error=google_denied", "/"));
  }

  try {
    const { accessToken, refreshToken } = await exchangeGoogleCode(code);
    const userInfo = await fetchGoogleUserInfo(accessToken);
    const { userId, role } = await findOrCreateOAuthUser("google", userInfo, {
      accessToken,
      refreshToken,
    });

    await createSession({ userId, role });
    return NextResponse.redirect(new URL("/", "/"));
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    return NextResponse.redirect(new URL("/login?error=google_failed", "/"));
  }
}
