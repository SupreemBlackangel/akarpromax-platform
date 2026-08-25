import { getDb } from "@/lib/db";
import { verificationChallenges } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
async function main() {
  const { db: client, end } = getDb();
  try {
    const rows = await client.select({ id: verificationChallenges.id, purpose: verificationChallenges.purpose, expiresAt: verificationChallenges.expiresAt, consumedAt: verificationChallenges.consumedAt, revokedAt: verificationChallenges.revokedAt, createdAt: verificationChallenges.createdAt }).from(verificationChallenges).where(eq(verificationChallenges.purpose, "password_reset")).orderBy(verificationChallenges.createdAt);
    for (const r of rows) {
      console.log(JSON.stringify({ purpose: r.purpose, createdAtISO: r.createdAt?.toISOString?.(), expiresAtISO: r.expiresAt?.toISOString?.(), diffMin: Math.round(((r.expiresAt instanceof Date ? r.expiresAt.getTime() : 0) - Date.now())/60000), consumedAt: r.consumedAt?.toISOString?.(), revokedAt: r.revokedAt?.toISOString?.() }));
    }
  } finally { await end(); }
}
main().catch(e => { console.error(e); process.exit(1); });
