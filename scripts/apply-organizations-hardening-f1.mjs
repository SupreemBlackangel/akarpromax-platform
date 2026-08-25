import fs from "node:fs";
import postgres from "postgres";

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("ORGANIZATIONS F1 DATABASE: FAIL - DATABASE_URL missing");
  process.exit(2);
}

const sql = postgres(url, { max: 1, prepare: false });

try {
  const duplicateMemberships = await sql`
    select organization_id, user_id, count(*)::int as count
    from organization_members
    group by organization_id, user_id
    having count(*) > 1
    limit 10
  `;
  if (duplicateMemberships.length) {
    throw new Error("DUPLICATE_MEMBERSHIPS_EXIST");
  }

  const duplicatePending = await sql`
    select entity_type, entity_id, type, count(*)::int as count
    from verification_records
    where status = 'pending'
    group by entity_type, entity_id, type
    having count(*) > 1
    limit 10
  `;
  if (duplicatePending.length) {
    throw new Error("DUPLICATE_PENDING_VERIFICATIONS_EXIST");
  }

  const migration = fs.readFileSync("drizzle-pg/0013_organizations_hardening_f1.sql", "utf8");
  await sql.unsafe(migration);

  const indexes = await sql`
    select indexname
    from pg_indexes
    where schemaname = current_schema()
      and indexname in (
        'org_member_org_user_unique',
        'org_member_user_active_idx',
        'verif_one_pending_subject_type',
        'verif_subject_type_status_idx',
        'organizations_directory_idx'
      )
  `;
  const names = new Set(indexes.map((row) => row.indexname));
  const required = [
    "org_member_org_user_unique",
    "org_member_user_active_idx",
    "verif_one_pending_subject_type",
    "verif_subject_type_status_idx",
    "organizations_directory_idx",
  ];
  for (const name of required) {
    if (!names.has(name)) throw new Error(`MISSING_INDEX:${name}`);
  }

  console.log("ORGANIZATIONS F1 DATABASE: PASS");
  console.log(`INDEXES: ${required.length}/${required.length}`);
} catch (error) {
  console.error("ORGANIZATIONS F1 DATABASE: FAIL");
  console.error(error?.stack || error);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
