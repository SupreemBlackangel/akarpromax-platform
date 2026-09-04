import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Every table the application writes to must be created by the lineage that is
 * actually deployed.
 *
 * Two tables were queried by live, user-facing code and had never been created
 * in production. Found in the production log, not by reading the source:
 *
 *   Failed query: insert into "leads" (...)
 *   Failed query: select "thread_id" from "message_participants" where ...
 *
 * Both are defined in lib/db/schemas/ and both are created by migrations in
 * `drizzle-pg/` -- an abandoned lineage. The deployed truth is
 * `drizzle-pg-forward/`, and nothing in it created either one.
 *
 * The cost was not theoretical. app/api/contact/route.ts has no catch around
 * its insert, so every message a visitor sent through the contact form
 * answered 500 with an empty body and was lost. Reproduced against production
 * before it was fixed. /api/messages backs the inbox, "contact this office"
 * and "contact about this property" -- the two routes by which an interested
 * buyer reaches a seller -- and every one of them was failing.
 *
 * This test exists so the next table added to lib/db/schemas/ cannot reach
 * production without a forward migration to go with it.
 */

const FORWARD = "drizzle-pg-forward";

async function forwardSql() {
  const files = (await readdir(path.join(ROOT, FORWARD))).filter((f) => f.endsWith(".sql")).sort();
  const parts = await Promise.all(
    files.map((f) => readFile(path.join(ROOT, FORWARD, f), "utf8")),
  );
  return { files, sql: parts.join("\n") };
}

/**
 * Table names a `pgTable('name', ...)` call declares.
 *
 * lib/db/schema.ts is read alongside lib/db/schemas/. The first version of
 * this walked only the directory, and `user_oauth_accounts` -- declared in the
 * single file, queried by both social logins -- was invisible to it. It was
 * missing from production the whole time this test was passing.
 */
async function declaredTables() {
  const dir = path.join(ROOT, "lib/db/schemas");
  const sources = [
    ...(await readdir(dir)).filter((f) => f.endsWith(".ts")).map((f) => ["schemas/" + f, path.join(dir, f)]),
    ["schema.ts", path.join(ROOT, "lib/db/schema.ts")],
  ];
  const found = new Map();
  for (const [label, file] of sources) {
    const source = await readFile(file, "utf8");
    for (const match of source.matchAll(/pgTable\(\s*['"]([a-z0-9_]+)['"]/g)) {
      if (!found.has(match[1])) found.set(match[1], label);
    }
  }
  return found;
}

/**
 * Tables declared in a schema file but created by no forward migration.
 *
 * A count, not zero. Twenty-seven declared tables have no forward migration
 * today -- auctions, the forum, knowledge items, ad analytics -- and demanding
 * zero on day one produces a test that gets deleted rather than fixed.
 *
 * The baseline is the ACTUAL number, not a round one above it. A threshold of
 * forty passing at twenty-seven guards nothing: it would let thirteen more
 * through in silence, and thirteen more is exactly how `leads` and
 * `message_participants` came to be queried in production by code that could
 * never work. This fails on the twenty-eighth, which is when somebody should
 * look.
 *
 * Being on this list is not itself a defect. It becomes one the moment
 * something calls the table -- which is what happened, twice, and cost every
 * message the contact form ever received.
 */
const UNMIGRATED_BASELINE = 23;

/**
 * Tables the IDENTITY lineage owns, not this one.
 *
 * lib/db/pg-identity-schema.ts creates these and /api/health/ready asserts all
 * eleven on every probe, so they are covered -- by a different mechanism, on
 * purpose. They are excluded here rather than counted as gaps.
 *
 * The exclusion is this narrow list and nothing wider. `user_oauth_accounts`
 * sits in the same schema file as `users` and looked, to a reader, equally
 * covered. It was not: no lineage created it, the identity probe never asked
 * for it, and both social logins failed on it in production.
 */
async function identityOwnedTables() {
  // Read out of the source rather than imported: pg-identity-schema.ts resolves
  // `@/` aliases that this plain .mjs test has no loader for, and reading the
  // text keeps the list coupled to the one definition either way.
  const source = await readFile(path.join(ROOT, "lib/db/pg-identity-schema.ts"), "utf8");
  const block = source.slice(
    source.indexOf("PG_IDENTITY_REQUIRED_TABLES = ["),
    source.indexOf("] as const;"),
  );
  return new Set([...block.matchAll(/"([a-z0-9_]+)"/g)].map((m) => m[1]));
}

test("the deployed migration lineage is drizzle-pg-forward", async () => {
  const migrations = await readFile(path.join(ROOT, "lib/db/forward-migrations.ts"), "utf8");
  assert.match(migrations, /FORWARD_MIGRATIONS_FOLDER = "drizzle-pg-forward"/);
});

test("leads is created by a forward migration, not only by the abandoned lineage", async () => {
  // The contact form. Its absence cost every submission the site ever received.
  const { sql } = await forwardSql();
  assert.match(sql, /CREATE TABLE IF NOT EXISTS leads\b/);
});

test("the direct messaging tables are created by a forward migration", async () => {
  const { sql } = await forwardSql();
  for (const table of ["message_threads", "message_participants", "messages", "message_attachments"]) {
    assert.match(
      sql,
      new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\b`),
      `${table} is queried by /api/messages and must exist`,
    );
  }
});

test("the query that was failing in production has an index that fits it", async () => {
  // select thread_id from message_participants where user_id = $1 and is_active = $2
  const { sql } = await forwardSql();
  assert.match(sql, /ON message_participants \(user_id, is_active\)/);
});

test("the new migrations create and never destroy", async () => {
  // They run against a database holding real data. A DROP or a TRUNCATE in a
  // forward migration is not a thing to discover afterwards.
  const added = (await readdir(path.join(ROOT, FORWARD)))
    .filter((f) => f.endsWith(".sql") && Number(f.slice(0, 4)) >= 8)
    .sort();
  for (const file of added) {
    const sql = (await readFile(path.join(ROOT, FORWARD, file), "utf8"))
      .split(/\r?\n/)
      .filter((line) => !line.trimStart().startsWith("--"))
      .join("\n");

    assert.doesNotMatch(sql, /\bDROP\b/i, `${file} must not drop anything`);
    assert.doesNotMatch(sql, /\bTRUNCATE\b/i, `${file} must not truncate anything`);
    assert.doesNotMatch(sql, /\bUPDATE\b/i, `${file} must not rewrite existing rows`);
    // DELETE appears legitimately inside ON DELETE CASCADE, so it is matched
    // as a statement rather than as a word -- an earlier version of this check
    // counted fifteen "dangerous statements" that were all foreign keys.
    assert.doesNotMatch(sql, /^\s*DELETE\s+FROM/im, `${file} must not delete rows`);
  }
});

test("no new table reaches a schema file without a forward migration", async () => {
  const declared = await declaredTables();
  const identityOwned = await identityOwnedTables();
  const { sql } = await forwardSql();

  const missing = [];
  for (const [table, file] of declared) {
    if (identityOwned.has(table)) continue;
    const created = new RegExp(`CREATE TABLE (?:IF NOT EXISTS )?"?${table}"?\\b`, "i");
    if (!created.test(sql)) missing.push(`${table} (${file})`);
  }

  assert.ok(
    missing.length <= UNMIGRATED_BASELINE,
    `${missing.length} declared tables have no forward migration, above the baseline of ` +
      `${UNMIGRATED_BASELINE}:\n  ${missing.slice(0, 15).join("\n  ")}`,
  );
});

// ---- a lost enquiry must not be silent --------------------------------------

test("the contact route explains a failure instead of returning an empty 500", async () => {
  const route = await readFile(path.join(ROOT, "app/api/contact/route.ts"), "utf8");

  // There was no catch at all. Every submission threw on the missing table and
  // Next answered 500 with an empty body: the visitor saw a failure with no
  // explanation, the message was lost, and the only trace was a log line
  // nobody was reading.
  assert.match(route, /catch \(error\)/, "the insert must be caught");
  assert.match(route, /console\.error\('\[contact\]/, "and the reason recorded");
  assert.match(route, /info@akarpromax\.com/, "with somewhere for the visitor to go");

  // Not swallowed into a false success. Telling someone their message was sent
  // when it was not is worse than the empty 500 it replaces.
  const catchBlock = route.slice(route.indexOf("catch (error)"), route.indexOf("} finally {"));
  assert.doesNotMatch(catchBlock, /success: true/);
  assert.match(catchBlock, /status: 500/);
});

// ---- the ledger, not the folder, is what actually runs ----------------------

/**
 * drizzle-orm's migrator does not read the folder. It reads
 * meta/_journal.json and opens exactly the files listed there:
 *
 *   for (const journalEntry of journal.entries) {
 *     readFileSync(`${migrationFolderTo}/${journalEntry.tag}.sql`)
 *
 * A .sql file the journal does not name is never executed, never recorded,
 * and never reported -- `npm run db:migrate:forward` exits 0 having done
 * nothing. 0008 and 0009 were written, reviewed, committed and deployed in
 * that state: the journal stopped at 0007, so the two migrations that were
 * supposed to fix the lost contact-form submissions never ran.
 *
 * Being absent from the journal is indistinguishable, from the outside, from
 * having been applied. That is why this test exists.
 */
test("every forward migration file is listed in the journal", async () => {
  const files = (await readdir(path.join(ROOT, FORWARD)))
    .filter((f) => f.endsWith(".sql"))
    .map((f) => f.replace(/\.sql$/, ""))
    .sort();
  const journal = JSON.parse(
    await readFile(path.join(ROOT, FORWARD, "meta/_journal.json"), "utf8"),
  );
  const listed = new Set(journal.entries.map((e) => e.tag));

  const unlisted = files.filter((f) => !listed.has(f));
  assert.deepEqual(
    unlisted,
    [],
    "these migrations exist on disk and will never run:\n  " + unlisted.join("\n  "),
  );
});

test("every journal entry has a file, in order, with no gaps", async () => {
  const journal = JSON.parse(
    await readFile(path.join(ROOT, FORWARD, "meta/_journal.json"), "utf8"),
  );
  const files = new Set(await readdir(path.join(ROOT, FORWARD)));

  journal.entries.forEach((entry, i) => {
    // The migrator throws on a missing file, taking the whole deploy with it.
    assert.ok(files.has(`${entry.tag}.sql`), `journal names ${entry.tag}.sql, which does not exist`);
    assert.equal(entry.idx, i, `journal idx must be sequential; entry ${i} says ${entry.idx}`);
  });

  // `when` orders execution. Two migrations sharing a timestamp apply in an
  // order nothing guarantees, and 0010 creates the table 0011 would reference.
  const whens = journal.entries.map((e) => e.when);
  for (let i = 1; i < whens.length; i++) {
    assert.ok(whens[i] > whens[i - 1], `${journal.entries[i].tag} does not sort after its predecessor`);
  }
});

// ---- the two features that were failing in production ----------------------

test("the land registry tables are created by a forward migration", async () => {
  // GET /api/land/search answered 500 on every call, filtered or not:
  //   Failed query: select count(*)::int from "land_parcels" ...
  const { sql } = await forwardSql();
  for (const table of ["land_parcels", "land_documents", "land_valuations", "land_favorites"]) {
    assert.ok(
      sql.includes(`CREATE TABLE IF NOT EXISTS ${table} (`),
      `${table} is queried by /land and must exist`,
    );
  }
  // The column the failing query filtered on, and the one every search uses.
  assert.match(sql, /ON land_parcels \(status\)/);
  assert.match(sql, /ON land_parcels \(country, governorate, city\)/);
});

test("user_oauth_accounts is created by a forward migration, not a hand-run script", async () => {
  // Signing in with Facebook redirected to /login?error=facebook_failed. The
  // provider handshake was fine; findOrCreateOAuthUser threw on this table.
  // Its only creator was scripts/apply-oauth-schema.ts, run by hand.
  const { sql } = await forwardSql();
  assert.match(sql, /CREATE TABLE IF NOT EXISTS user_oauth_accounts\b/);
  assert.match(sql, /ON user_oauth_accounts \(provider, provider_user_id\)/);
});

test("the identity lineage is excluded by name, not by which file declares a table", async () => {
  // The exclusion must stay the eleven tables /api/health/ready actually
  // probes. Widening it to "anything in lib/db/schema.ts" is how
  // user_oauth_accounts would go missing a second time.
  const identityOwned = await identityOwnedTables();
  assert.equal(identityOwned.size, 11);
  assert.ok(identityOwned.has("users"));
  assert.ok(!identityOwned.has("user_oauth_accounts"));
});
