import { NextRequest, NextResponse } from "next/server";
import {
  exchangeGoogleCode,
  fetchGoogleUserInfo,
  findOrCreateOAuthUser,
} from "@/lib/auth/oauth";
import { createSession } from "@/lib/auth/session";
import { getRuntimeEnv } from "@/lib/config/runtime-env";
import { oauthCallbackErrorCode, recordOAuthCallbackFailure } from "@/lib/auth/oauth-callback";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const base = getRuntimeEnv().appUrl;

  if (error || !code) {
    return NextResponse.redirect(new URL("/login?error=google_denied", base));
  }

  try {
    const { accessToken, refreshToken } = await exchangeGoogleCode(code);
    const userInfo = await fetchGoogleUserInfo(accessToken);
    const { userId, role } = await findOrCreateOAuthUser("google", userInfo, {
      accessToken,
      refreshToken,
    });

    await createSession({ userId, role });
    return NextResponse.redirect(new URL("/", base));
  } catch (err) {
    recordOAuthCallbackFailure("google", err);
    return NextResponse.redirect(
      new URL(`/login?error=${oauthCallbackErrorCode("google", err)}`, base),
    );
  }
}
