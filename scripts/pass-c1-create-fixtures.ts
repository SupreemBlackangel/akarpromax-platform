import bcrypt from "bcryptjs";
import postgres from "postgres";

const url = String(process.env.DATABASE_URL ?? "");
if (!url.includes("127.0.0.1") || !url.includes("passc1_clean_")) {
  throw new Error("PASS C.1 fixtures are restricted to the isolated local passc1_clean_* databases");
}

const sql = postgres(url, { ssl: "require", prepare: false });
try {
  const passwordHash = await bcrypt.hash("PassC1-Test-Only!", 10);
  const adminId = "11111111-1111-4111-8111-111111111111";
  const viewerId = "22222222-2222-4222-8222-222222222222";
  await sql`
    INSERT INTO users (id, email, password_hash, name, role, status, is_active, email_verified_at)
    VALUES
      (${adminId}, 'passc1-admin@example.test', ${passwordHash}, 'PASS C1 Admin', 'super_admin', 'active', true, now()),
      (${viewerId}, 'passc1-viewer@example.test', ${passwordHash}, 'PASS C1 Viewer', 'user', 'active', true, now())
    ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role,
      status = EXCLUDED.status, is_active = EXCLUDED.is_active, email_verified_at = EXCLUDED.email_verified_at
  `;
  await sql`
    INSERT INTO sponsor_access (id, email, display_name, role, status)
    VALUES (${adminId}, 'passc1-admin@example.test', 'PASS C1 Admin', 'super_admin', 'active')
    ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, status = EXCLUDED.status
  `;
  console.log(JSON.stringify({ adminId, viewerId, fixture: true }));
} finally {
  await sql.end();
}
