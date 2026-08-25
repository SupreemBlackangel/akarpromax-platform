import { getDb } from "@/lib/db";
import { userOauthAccounts, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { createSession } from "@/lib/auth/session";
import { randomUUID } from "crypto";

// ─── Types ─────────────────────────────────────────────────────────────────

export type OAuthProvider = "google" | "facebook";

export interface OAuthUserInfo {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

// ─── Provider Configs ──────────────────────────────────────────────────────

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3010";

export function getOAuthConfig(provider: OAuthProvider): OAuthConfig {
  if (provider === "google") {
    return {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      redirectUri: `${BASE_URL}/api/auth/google/callback`,
      scopes: ["openid", "email", "profile"],
    };
  }
  if (provider === "facebook") {
    return {
      clientId: process.env.FACEBOOK_APP_ID || "",
      clientSecret: process.env.FACEBOOK_APP_SECRET || "",
      redirectUri: `${BASE_URL}/api/auth/facebook/callback`,
      scopes: ["email", "public_profile"],
    };
  }
  throw new Error(`Unknown provider: ${provider}`);
}

// ─── Authorization URLs ────────────────────────────────────────────────────

export function getGoogleAuthUrl(): string {
  const config = getOAuthConfig("google");
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: config.scopes.join(" "),
    access_type: "offline",
    prompt: "consent",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function getFacebookAuthUrl(): string {
  const config = getOAuthConfig("facebook");
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: config.scopes.join(","),
    display: "popup",
  });
  return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
}

// ─── Token Exchange ────────────────────────────────────────────────────────

export async function exchangeGoogleCode(code: string): Promise<{ accessToken: string; refreshToken?: string }> {
  const config = getOAuthConfig("google");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google token exchange failed: ${err}`);
  }
  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  };
}

export async function exchangeFacebookCode(code: string): Promise<{ accessToken: string }> {
  const config = getOAuthConfig("facebook");
  const res = await fetch(
    `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(config.redirectUri)}&client_secret=${config.clientSecret}&code=${code}`,
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Facebook token exchange failed: ${err}`);
  }
  const data = await res.json();
  return { accessToken: data.access_token };
}

// ─── User Info Fetch ───────────────────────────────────────────────────────

export async function fetchGoogleUserInfo(accessToken: string): Promise<OAuthUserInfo> {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to fetch Google user info");
  const data = await res.json();
  return {
    id: data.id,
    email: data.email,
    name: data.name || data.given_name || "",
    avatarUrl: data.picture,
  };
}

export async function fetchFacebookUserInfo(accessToken: string): Promise<OAuthUserInfo> {
  const res = await fetch(
    `https://graph.facebook.com/me?fields=id,email,name,picture.type(large)&access_token=${accessToken}`,
  );
  if (!res.ok) throw new Error("Failed to fetch Facebook user info");
  const data = await res.json();
  return {
    id: data.id,
    email: data.email || "",
    name: data.name || "",
    avatarUrl: data.picture?.data?.url,
  };
}

// ─── Account Linking / User Creation ───────────────────────────────────────

/**
 * Find or create a user for the given OAuth provider account.
 *
 * Flow:
 * 1. If an OAuth account row exists for this provider+providerUserId → return that user.
 * 2. If a user with the same email exists → link the OAuth account to that user.
 * 3. Otherwise → create a new user + OAuth account row.
 *
 * Returns { userId, isNewUser }.
 */
export async function findOrCreateOAuthUser(
  provider: OAuthProvider,
  info: OAuthUserInfo,
  tokens: { accessToken: string; refreshToken?: string },
): Promise<{ userId: string; role: string; isNewUser: boolean }> {
  const { db, end } = getDb();
  try {
    // 1. Existing OAuth link?
    const existingLink = await db
      .select()
      .from(userOauthAccounts)
      .where(
        and(
          eq(userOauthAccounts.provider, provider),
          eq(userOauthAccounts.providerUserId, info.id),
        ),
      )
      .limit(1);

    if (existingLink.length > 0) {
      // Update tokens
      await db
        .update(userOauthAccounts)
        .set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken || existingLink[0].refreshToken,
          updatedAt: new Date(),
        })
        .where(eq(userOauthAccounts.id, existingLink[0].id));
      // Fetch user role
      const userRow = await db.select().from(users).where(eq(users.id, existingLink[0].userId)).limit(1);
      return { userId: existingLink[0].userId, role: userRow[0]?.role || "user", isNewUser: false };
    }

    // 2. Existing user by email?
    let userId: string;
    let userRole = "user";
    let isNewUser = false;

    if (info.email) {
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, info.email))
        .limit(1);

      if (existingUser.length > 0) {
        userId = existingUser[0].id;
        userRole = existingUser[0].role;
        // Auto-verify email if it was pending
        if (!existingUser[0].emailVerifiedAt) {
          await db
            .update(users)
            .set({ emailVerifiedAt: new Date() })
            .where(eq(users.id, userId));
        }
      } else {
        // 3. Create new user
        userId = randomUUID();
        userRole = "user";
        await db.insert(users).values({
          id: userId,
          email: info.email,
          name: info.name,
          emailVerifiedAt: new Date(),
          passwordHash: "oauth_no_password",
          role: "user",
          status: "active",
          preferredLanguage: "ar",
        });
        isNewUser = true;
      }
    } else {
      // No email from provider — create user without email
      userId = randomUUID();
      userRole = "user";
      await db.insert(users).values({
        id: userId,
        name: info.name,
        passwordHash: "oauth_no_password",
        role: "user",
        status: "active",
        preferredLanguage: "ar",
      });
      isNewUser = true;
    }

    // Link OAuth account
    await db.insert(userOauthAccounts).values({
      userId,
      provider,
      providerUserId: info.id,
      email: info.email,
      name: info.name,
      avatarUrl: info.avatarUrl,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken || null,
    });

    return { userId, role: userRole, isNewUser };
  } finally {
    end();
  }
}

// ─── Initiate Login ────────────────────────────────────────────────────────

export function getOAuthInitiateUrl(provider: OAuthProvider): string {
  if (provider === "google") return getGoogleAuthUrl();
  if (provider === "facebook") return getFacebookAuthUrl();
  throw new Error(`Unknown provider: ${provider}`);
}
