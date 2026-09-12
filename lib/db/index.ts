import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const url = process.env.DATABASE_URL ?? "";

const client = postgres(url, { ssl: "require", prepare: false });

export const db = drizzle(client);

/**
 * Which runtime this process is.
 *
 * `vinext dev` runs route code inside the Vite/Workers runtime, where a
 * postgres-js pool cannot be reused across requests — it throws "Cannot perform
 * I/O on behalf of a different request". `vinext start` is plain Node, where a
 * shared pool is not only safe but the whole point: without it every request
 * pays a fresh TLS handshake to Neon before it can read a row.
 *
 * The same probe lib/pg-runtime.ts uses, kicked off once at module load. It
 * cannot be awaited here because `getDb()` is synchronous and has 178 call
 * sites; until it settles the answer is `null`, and `null` takes the
 * per-request client — which is exactly today's behaviour, so the uncertain
 * window behaves as it always has rather than guessing.
 */
let workersRuntime: boolean | null = null;
void import("cloudflare:workers")
  .then(() => {
    workersRuntime = true;
  })
  .catch(() => {
    workersRuntime = false;
  });

/**
 * A connection for one request, and the way to give it back.
 *
 * The contract AGENTS.md fixes — `const { db, end } = getDb()` and `await end()`
 * in a `finally` — is unchanged, and every caller keeps working without being
 * touched. What changed is what `end()` means: in Node it returns a pooled
 * connection to the pool this module already holds, rather than tearing down a
 * TLS session that the next request will immediately rebuild. /api/offices and
 * /api/companies opened and closed one per request, on the two endpoints the
 * home page calls on every visit.
 */
export function getDb() {
  if (workersRuntime === false) {
    // Node: reuse the module pool. `end()` must NOT close it — it is shared
    // with the `db` export above and with every other in-flight request.
    return { db, end: async () => {} };
  }
  const freshClient = postgres(url, { ssl: "require", prepare: false });
  return { db: drizzle(freshClient), end: () => freshClient.end() };
}
