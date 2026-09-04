import { oauthFailureStage, type OAuthFailureStage, type OAuthProvider } from "@/lib/auth/oauth";
import { logSecurityEvent } from "@/lib/security/audit";

/**
 * What a failed social sign-in tells the operator, and what it tells the visitor.
 *
 * The callbacks previously answered every failure with one code --
 * `?error=facebook_failed` -- and sent the reason to console.error. In
 * production that redirect was the whole of the evidence, and it could not
 * distinguish the two failures that matter:
 *
 *   - the PROVIDER refused (app not live, bad secret, revoked token). Nothing
 *     the visitor does differently will help, and nothing on our side is broken.
 *   - OUR side broke. That is what actually happened: findOrCreateOAuthUser
 *     queries user_oauth_accounts, and no migration had ever created it.
 *
 * Telling a visitor "try again" when the second one is true is telling them to
 * repeat something that cannot succeed.
 */

/** Codes the login page maps to a message. Stable: they appear in a URL. */
export type OAuthErrorCode =
  | `${OAuthProvider}_denied`
  | `${OAuthProvider}_provider_error`
  | `${OAuthProvider}_account_error`;

const STAGE_CODE: Record<OAuthFailureStage, "provider_error" | "account_error"> = {
  token_exchange: "provider_error",
  user_info: "provider_error",
  account_link: "account_error",
};

export function oauthCallbackErrorCode(provider: OAuthProvider, error: unknown): OAuthErrorCode {
  return `${provider}_${STAGE_CODE[oauthFailureStage(error)]}` as OAuthErrorCode;
}

/**
 * The reason, capped.
 *
 * A provider's error body is quoted verbatim into the log line, so it is
 * truncated: an unbounded remote string should not decide how long a log entry
 * is. Field keys are redacted by logSecurityEvent; values are not, which is why
 * this never carries the request URL -- that one holds the client secret.
 */
function reasonOf(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, 300);
}

export function recordOAuthCallbackFailure(provider: OAuthProvider, error: unknown): void {
  const stage = oauthFailureStage(error);
  logSecurityEvent("AUTH_OAUTH_CALLBACK_FAILED", {
    provider,
    stage,
    // account_link is ours to fix; the log line should say so without anyone
    // having to know which stage names are which.
    ours: stage === "account_link",
    reason: reasonOf(error),
  });
}
