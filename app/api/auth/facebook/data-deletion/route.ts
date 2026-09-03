import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { userOauthAccounts } from "@/lib/db/schema";
import {
  newDeletionConfirmationCode,
  verifyFacebookSignedRequest,
} from "@/lib/auth/facebook-signed-request";
import { getRuntimeEnv } from "@/lib/config/runtime-env";
import { limitOr429 } from "@/lib/services/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Facebook's data deletion callback.
 *
 * Facebook requires every app that reads user data to offer a way to delete it.
 * When somebody removes this app from their Facebook account, Facebook POSTs a
 * `signed_request` here, and expects JSON back:
 *
 *     { "url": "<where the user can check>", "confirmation_code": "<code>" }
 *
 * The endpoint has to be public and unauthenticated, because the request comes
 * from Facebook and not from a signed-in browser. The signature is therefore
 * the whole of its security, and it is verified before anything is touched.
 *
 * What is deleted is the LINK between this platform's account and the Facebook
 * identity, not the platform account itself. That is the honest reading of what
 * the user asked for -- they removed an app's access -- and deleting an office's
 * clients, properties and contracts because somebody detached a login would
 * destroy records the business is legally required to keep. Somebody who wants
 * the whole account removed asks for that separately, and the status page says
 * so.
 */
export async function POST(request: NextRequest) {
  const limited = await limitOr429(request, "services_report");
  if (limited) return limited;

  const base = getRuntimeEnv().appUrl;

  let signedRequest: string | null = null;
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = (await request.json().catch(() => null)) as { signed_request?: string } | null;
      signedRequest = body?.signed_request ?? null;
    } else {
      const form = await request.formData();
      const value = form.get("signed_request");
      signedRequest = typeof value === "string" ? value : null;
    }
  } catch {
    signedRequest = null;
  }

  const verified = verifyFacebookSignedRequest(signedRequest, process.env.FACEBOOK_APP_SECRET);
  if (!verified.ok) {
    // Deliberately vague to the caller and specific in the log. Telling an
    // unauthenticated caller which part of their forgery failed helps them fix
    // it.
    console.warn("[facebook-data-deletion] rejected:", verified.reason);
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const facebookUserId = String(verified.payload.user_id ?? "").trim();
  if (!facebookUserId) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const confirmationCode = newDeletionConfirmationCode();

  try {
    // Remove the link and the tokens that came with it. The tokens are the part
    // that grants continuing access, so they go even if nothing else did.
    await db
      .delete(userOauthAccounts)
      .where(
        and(
          eq(userOauthAccounts.provider, "facebook"),
          eq(userOauthAccounts.providerUserId, facebookUserId),
        ),
      );
  } catch (error) {
    console.error("[facebook-data-deletion] delete failed:", error);
    // Facebook retries on a 5xx, which is what should happen: reporting success
    // for a deletion that did not happen is the one answer that must never be
    // given.
    return NextResponse.json({ error: "temporary_failure" }, { status: 503 });
  }

  // Deleting a link that was not there is success, not an error: the outcome
  // the user asked for is that no link exists, and it does not.
  return NextResponse.json({
    url: `${base}/data-deletion?code=${confirmationCode}`,
    confirmation_code: confirmationCode,
  });
}

/**
 * A GET here is somebody following the URL by hand.
 *
 * Answered with a redirect to the page that explains the process, rather than
 * with a 405 that tells them nothing.
 */
export async function GET() {
  const base = getRuntimeEnv().appUrl;
  return NextResponse.redirect(new URL("/data-deletion", base));
}
