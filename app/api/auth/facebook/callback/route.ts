import { NextRequest, NextResponse } from "next/server";
import {
  exchangeFacebookCode,
  fetchFacebookUserInfo,
  findOrCreateOAuthUser,
} from "@/lib/auth/oauth";
import { createSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL("/login?error=facebook_denied", "/"));
  }

  try {
    const { accessToken } = await exchangeFacebookCode(code);
    const userInfo = await fetchFacebookUserInfo(accessToken);
    const { userId, role } = await findOrCreateOAuthUser("facebook", userInfo, {
      accessToken,
    });

    await createSession({ userId, role });
    return NextResponse.redirect(new URL("/", "/"));
  } catch (err) {
    console.error("Facebook OAuth callback error:", err);
    return NextResponse.redirect(new URL("/login?error=facebook_failed", "/"));
  }
}
