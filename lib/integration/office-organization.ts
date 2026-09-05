import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";

import { getDb } from "@/lib/db";

/**
 * Auto-register a desktop office as a platform organization, and link its
 * published properties to it.
 *
 * A desktop office authenticates through /api/program/login, uploads its
 * details to `office_profiles` and publishes properties — all keyed by its
 * user id. None of that made it an OFFICE the platform recognises: the public
 * directory (/api/offices) and the admin lists read `organizations` of type
 * `real_estate`, and the office had no such row. So a connected office with
 * five live listings was invisible as an office, and every one of those
 * listings had `office_id = NULL`.
 *
 * This closes the gap. Given a user that has an office profile, it ensures a
 * matching organization exists (created once, from the profile) and stamps the
 * user's still-unlinked properties with its id. It is idempotent: a user who
 * already owns a real_estate organization keeps it, and only properties that
 * are not yet linked are touched.
 */

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);
}

type Row = Record<string, unknown>;
const asRows = (r: unknown): Row[] => r as unknown as Row[];

export type OfficeOrganizationResult = {
  organizationId: string;
  created: boolean;
  linkedProperties: number;
};

/**
 * The status a freshly auto-registered office is given. A connected desktop
 * office is an authenticated, subscription-bearing account, not an anonymous
 * sign-up, so it goes live in the directory immediately. Change this one
 * constant to "pending_review" to gate auto-registered offices behind a
 * reviewer instead.
 */
const AUTO_OFFICE_STATUS = "active";

export async function ensureOfficeOrganizationForUser(
  userId: string,
): Promise<OfficeOrganizationResult | null> {
  if (!userId) return null;
  const { db, end } = getDb();
  try {
    const profile = asRows(
      await db.execute(sql`
        SELECT name, phone, email, website, country, city
        FROM office_profiles WHERE user_id = ${userId} LIMIT 1
      `),
    )[0];
    // No office profile means there is nothing to register an office from yet.
    if (!profile) return null;

    // Reuse an organization this user already owns rather than making a second.
    const existing = asRows(
      await db.execute(sql`
        SELECT o.id
        FROM organizations o
        JOIN organization_members m ON m.organization_id = o.id
        WHERE m.user_id = ${userId} AND o.type = 'real_estate'
        ORDER BY o.created_at ASC LIMIT 1
      `),
    )[0];

    let organizationId: string;
    let created = false;

    if (existing?.id) {
      organizationId = String(existing.id);
    } else {
      const name = String(profile.name || "مكتب عقاري").slice(0, 255);
      const base = slugify(String(profile.name || "")) || `office-${userId.slice(0, 8)}`;
      let slug = base;
      for (
        let attempt = 1;
        asRows(await db.execute(sql`SELECT 1 FROM organizations WHERE slug = ${slug} LIMIT 1`)).length > 0;
        attempt++
      ) {
        slug = `${base}-${attempt}`;
      }
      organizationId = randomUUID();
      const country = String(profile.country || "OM").toUpperCase().slice(0, 8);
      await db.execute(sql`
        INSERT INTO organizations
          (id, name_ar, name_en, slug, type, classification, country_code, city_id,
           contact_phone, contact_email, website_url, status, created_at, updated_at)
        VALUES
          (${organizationId}, ${name}, ${(profile.name as string) ?? null}, ${slug}, 'real_estate', 'sme',
           ${country}, ${(profile.city as string) ?? null},
           ${(profile.phone as string) ?? null}, ${(profile.email as string) ?? null},
           ${(profile.website as string) ?? null}, ${AUTO_OFFICE_STATUS}, now(), now())
      `);
      await db.execute(sql`
        INSERT INTO organization_members (id, organization_id, user_id, role, status, joined_at)
        VALUES (${randomUUID()}, ${organizationId}, ${userId}, 'owner', 'active', now())
        ON CONFLICT (organization_id, user_id) DO NOTHING
      `);
      created = true;
    }

    // Link every listing this office has published that is not already linked.
    const linked = asRows(
      await db.execute(sql`
        UPDATE properties SET office_id = ${organizationId}, updated_at = now()
        WHERE user_id = ${userId} AND office_id IS NULL
        RETURNING id
      `),
    ).length;

    return { organizationId, created, linkedProperties: linked };
  } finally {
    await end();
  }
}
