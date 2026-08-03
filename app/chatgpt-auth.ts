import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { getSession, getSessionUser } from "@/lib/auth/session";
import { users as pgUsers } from "@/lib/db/schema";
import { getDb } from "@/lib/db";

export type ChatGPTUser = {
  displayName: string;
  email: string;
  fullName: string | null;
};

const USER_EMAIL_HEADER = "oai-authenticated-user-email";
const USER_FULL_NAME_HEADER = "oai-authenticated-user-full-name";
const USER_FULL_NAME_ENCODING_HEADER =
  "oai-authenticated-user-full-name-encoding";
const PERCENT_ENCODED_UTF8 = "percent-encoded-utf-8";
const SIGN_IN_PATH = "/signin-with-chatgpt";
const SIGN_OUT_PATH = "/signout-with-chatgpt";
const CALLBACK_PATH = "/callback";

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const sessionUser = await userFromSession();
  if (sessionUser) return sessionUser;

  const requestHeaders = await headers();
  const authorization = requestHeaders.get("authorization");
  if (authorization?.toLowerCase().startsWith("bearer ")) {
    const token = authorization.slice(7).trim();
    if (token) {
      try {
        const sessionUser = await getSessionUser(token);
        if (sessionUser?.email) {
          return {
            displayName: sessionUser.fullName || sessionUser.email,
            email: sessionUser.email,
            fullName: sessionUser.fullName || null,
          };
        }
      } catch {
        // MySQL unreachable: fall through to header-based identity.
      }
    }
  }

  const email = requestHeaders.get(USER_EMAIL_HEADER);
  if (!email) {
    const host = requestHeaders.get("host")?.split(":")[0]?.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") {
      return {
        displayName: "Local Administrator",
        email: "admin@localhost.akarpromax",
        fullName: "Local Administrator",
      };
    }
    return null;
  }

  const encodedFullName = requestHeaders.get(USER_FULL_NAME_HEADER);
  const fullName =
    encodedFullName &&
    requestHeaders.get(USER_FULL_NAME_ENCODING_HEADER) === PERCENT_ENCODED_UTF8
      ? safeDecodeURIComponent(encodedFullName)
      : null;

  return {
    displayName: fullName ?? email,
    email,
    fullName,
  };
}

async function userFromSession(): Promise<ChatGPTUser | null> {
  let session;
  try {
    session = await getSession();
  } catch {
    return null;
  }
  if (!session?.userId) return null;

  try {
    const { db, end } = getDb();
    let user: { email: string | null; name: string | null } | undefined;
    try {
      const rows = await db
        .select({ email: pgUsers.email, name: pgUsers.name })
        .from(pgUsers)
        .where(eq(pgUsers.id, session.userId))
        .limit(1);
      user = rows[0];
    } finally {
      await end();
    }
    if (!user?.email) return null;
    return {
      displayName: user.name || user.email,
      email: user.email,
      fullName: user.name || null,
    };
  } catch {
    return null;
  }
}

export async function requireChatGPTUser(
  returnTo: string,
): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;

  redirect(chatGPTSignInPath(returnTo));
}

export function chatGPTSignInPath(returnTo: string): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SIGN_IN_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

export function chatGPTSignOutPath(returnTo = "/"): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SIGN_OUT_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

function safeRelativeReturnPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";

  let url: URL;
  try {
    url = new URL(value, "https://app.local");
  } catch {
    return "/";
  }
  if (url.origin !== "https://app.local") return "/";
  if (isReservedAuthPath(url.pathname)) return "/";

  return `${url.pathname}${url.search}${url.hash}`;
}

function isReservedAuthPath(pathname: string): boolean {
  return (
    pathname === SIGN_IN_PATH ||
    pathname === SIGN_OUT_PATH ||
    pathname === CALLBACK_PATH
  );
}

function safeDecodeURIComponent(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
