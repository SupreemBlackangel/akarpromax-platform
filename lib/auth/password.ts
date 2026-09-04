import bcrypt from "bcryptjs";

/** Work factor for every password this application stores. */
export const PASSWORD_COST = 12;

/**
 * A real bcrypt hash, at the same cost as every stored password, of a random
 * string nobody holds.
 *
 * It exists to be compared against and never to match. When a login names an
 * identifier that does not exist, the route still has to spend the time a real
 * comparison costs -- otherwise the clock answers a question the response body
 * deliberately refuses to:
 *
 *   POST /api/auth/login  admin@akarpromax.com      -> 401  0.97s, 1.10s
 *   POST /api/auth/login  <address nobody has>      -> 401  0.51s, 0.54s
 *
 * Measured against production, five attempts, all with a wrong password. Both
 * answered the same `invalid_credentials`, and the half-second told them apart
 * anyway: bcrypt only runs when the row was found. That is enough to walk a
 * list of addresses and learn which ones hold accounts on this platform.
 */
export const ABSENT_USER_PASSWORD_HASH =
  "$2b$12$Pv52yR3fZmCk/d5Egn4j7egsJdOVeMWebJDzelsby4Grz/8o3HTQG";

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, PASSWORD_COST);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Spend the same time a real verification costs, then fail.
 *
 * Call this on every path that rejects a login before it has a user row. The
 * return type is `false`, not void, so it reads as the verification result it
 * stands in for and cannot be mistaken for a successful check.
 */
export async function verifyAbsentUserPassword(plain: string): Promise<false> {
  await bcrypt.compare(plain, ABSENT_USER_PASSWORD_HASH);
  return false;
}
