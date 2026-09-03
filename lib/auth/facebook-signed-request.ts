import crypto from "node:crypto";

/**
 * Verifying a Facebook `signed_request`.
 *
 * Facebook posts one of these to the data-deletion callback when somebody
 * removes the app from their Facebook account. It is the only thing identifying
 * whose data to delete, and it arrives on an endpoint that has to be public and
 * unauthenticated, so the signature is the entire security of the mechanism.
 *
 * Without verification the endpoint would delete any account named by anyone
 * who could send it a POST.
 *
 * The format is two base64url segments separated by a dot:
 *
 *     base64url(HMAC-SHA256(payload_segment, app_secret)) . base64url(payload)
 *
 * Note that the signature covers the ENCODED payload string, not the decoded
 * JSON — re-encoding the parsed object and hashing that produces a different
 * digest for the same request.
 */

export type FacebookSignedRequest = {
  /** The Facebook user id whose data is to be removed. */
  user_id?: string;
  algorithm?: string;
  issued_at?: number;
  [key: string]: unknown;
};

export type VerifyResult =
  | { ok: true; payload: FacebookSignedRequest }
  | { ok: false; reason: string };

/** Decode one base64url segment. */
function decodeSegment(segment: string): Buffer {
  return Buffer.from(segment.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

/**
 * Check a signed request against the app secret.
 *
 * @param signedRequest The raw value Facebook posted.
 * @param appSecret The application secret, read from the environment.
 */
export function verifyFacebookSignedRequest(
  signedRequest: string | null | undefined,
  appSecret: string | null | undefined,
): VerifyResult {
  if (!signedRequest) return { ok: false, reason: "missing_signed_request" };

  // A missing secret must fail closed. Treating it as "nothing to check
  // against" would turn a misconfigured deployment into an open deletion
  // endpoint, which is the worst possible way for this to break.
  if (!appSecret) return { ok: false, reason: "missing_app_secret" };

  const parts = signedRequest.split(".");
  if (parts.length !== 2) return { ok: false, reason: "malformed" };

  const [signatureSegment, payloadSegment] = parts;
  if (!signatureSegment || !payloadSegment) return { ok: false, reason: "malformed" };

  let expected: Buffer;
  let provided: Buffer;
  try {
    provided = decodeSegment(signatureSegment);
    // The payload SEGMENT is what is signed, not the decoded JSON.
    expected = crypto.createHmac("sha256", appSecret).update(payloadSegment).digest();
  } catch {
    return { ok: false, reason: "malformed" };
  }

  // Lengths must match before timingSafeEqual, which throws on a mismatch —
  // and a thrown exception is itself a timing signal.
  if (provided.length !== expected.length) return { ok: false, reason: "bad_signature" };
  if (!crypto.timingSafeEqual(provided, expected)) return { ok: false, reason: "bad_signature" };

  let payload: FacebookSignedRequest;
  try {
    payload = JSON.parse(decodeSegment(payloadSegment).toString("utf8")) as FacebookSignedRequest;
  } catch {
    return { ok: false, reason: "bad_payload" };
  }

  // An array also satisfies `typeof x === "object"`, so it has to be excluded
  // explicitly or a JSON array would be accepted as a payload.
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return { ok: false, reason: "bad_payload" };
  }

  // Facebook signs these with HMAC-SHA256. Anything else is either a format
  // change to look at deliberately or an attempt to talk this endpoint into a
  // weaker check.
  const algorithm = String(payload.algorithm ?? "").toUpperCase();
  if (algorithm && algorithm !== "HMAC-SHA256") {
    return { ok: false, reason: "unexpected_algorithm" };
  }

  return { ok: true, payload };
}

/**
 * A confirmation code for a deletion request.
 *
 * Facebook shows this to the user and it is quoted back on the status page, so
 * it must be unguessable: it is the only thing standing between a status page
 * and anyone who wants to know whether a given person had an account here.
 */
export function newDeletionConfirmationCode(): string {
  return crypto.randomBytes(16).toString("hex");
}
