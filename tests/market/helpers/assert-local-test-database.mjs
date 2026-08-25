// L1A destructive-test safety barrier.
//
// Every destructive L1A PostgreSQL test (DROP SCHEMA / DROP TABLE / baseline
// re-creation) MUST call assertLocalTestDatabaseUrl(url) BEFORE opening any
// database connection. The guard validates the URL purely locally — it never
// dials the database — and throws unless the host is provably the loopback
// interface of the machine running the tests.
//
// Allowed hostnames, exactly:
//   localhost
//   127.0.0.1
//   ::1
//
// Everything else is rejected: *.neon.tech, any other DNS name, any remote or
// private-network IPv4/IPv6, malformed URLs, empty URLs, non-PostgreSQL URLs.
//
// THERE IS NO BYPASS. This module reads no environment variable of any kind
// and offers no override flag, and none may ever be added. A database is NOT
// considered safe because its name contains "test", "dev" or "local" — only
// the hostname matters.

export const REFUSAL = "REFUSING DESTRUCTIVE L1A TEST AGAINST NON-LOCAL DATABASE";

const ALLOWED_PROTOCOLS = new Set(["postgres:", "postgresql:"]);

// URL#hostname yields "127.0.0.1", "localhost", or "[::1]" (brackets kept for
// IPv6). Compare against the exact, full normalized form — never a substring —
// so "localhost.evil.com", "127.0.0.1.evil.com" and "0::1%eth0" cannot pass.
const ALLOWED_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

function refuse(url, reason) {
  const error = new Error(
    `${REFUSAL} — ${reason} (received: ${String(url ?? "").slice(0, 200) || "<empty>"})`,
  );
  error.name = "NonLocalTestDatabaseError";
  return error;
}

/**
 * Validates that `url` points at a local loopback PostgreSQL instance.
 *
 * Throws with a message containing the REFUSAL sentinel otherwise.
 * Performs no I/O and opens no connection. Returns the validated URL string
 * so call sites can write: `postgres(assertLocalTestDatabaseUrl(url), ...)`.
 */
export function assertLocalTestDatabaseUrl(url) {
  if (typeof url !== "string" || url.trim() === "") {
    throw refuse(url, "the database URL is empty or not a string");
  }

  let parsed;
  try {
    parsed = new URL(url.trim());
  } catch {
    throw refuse(url, "the database URL is malformed");
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    throw refuse(url, `protocol "${parsed.protocol}" is not a PostgreSQL URL`);
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!ALLOWED_HOSTNAMES.has(hostname)) {
    throw refuse(url, `host "${parsed.hostname}" is not a local loopback address`);
  }

  return url.trim();
}
