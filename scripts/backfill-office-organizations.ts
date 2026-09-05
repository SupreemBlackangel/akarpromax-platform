import { sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { ensureOfficeOrganizationForUser } from "@/lib/integration/office-organization";

/**
 * Register every desktop office that already uploaded a profile as a platform
 * organization, and link the properties it has already published.
 *
 * The route change makes this happen going forward, on the next profile upload
 * or property publish. This catches the offices that connected BEFORE that
 * change — their listings are live but unlinked, and they do not show in the
 * offices directory. Idempotent: run it as often as you like.
 *
 *   node --env-file=.env --import tsx scripts/backfill-office-organizations.ts
 */
async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("DATABASE_URL is not set. Run through --env-file=.env.");
    process.exit(1);
  }
  const { db, end } = getDb();
  let userIds: string[];
  try {
    userIds = (
      (await db.execute(sql`SELECT user_id FROM office_profiles ORDER BY created_at ASC`)) as unknown as Array<{ user_id: string }>
    ).map((r) => String(r.user_id));
  } finally {
    await end();
  }

  console.log(`Found ${userIds.length} office profile(s).`);
  let registered = 0;
  let reused = 0;
  let linked = 0;
  for (const userId of userIds) {
    const result = await ensureOfficeOrganizationForUser(userId);
    if (!result) {
      console.log(`  ${userId}: no profile (skipped)`);
      continue;
    }
    if (result.created) registered++;
    else reused++;
    linked += result.linkedProperties;
    console.log(
      `  ${userId}: org ${result.organizationId} (${result.created ? "registered" : "existing"}), ` +
        `linked ${result.linkedProperties} listing(s)`,
    );
  }
  console.log(`\nDone. ${registered} newly registered, ${reused} already had an org, ${linked} listing(s) linked.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
