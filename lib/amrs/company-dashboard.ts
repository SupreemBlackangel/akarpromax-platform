// ORGANIZATIONS_F3_WORKSPACE
import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { organizationBranches, organizationMembers, users } from "@/lib/db/schema";
import { getServicesDb } from "@/lib/services/db";

export type CompanyOverview = {
  memberCount: number;
  branchCount: number;
};

export async function getCompanyOverview(organizationId: string): Promise<CompanyOverview> {
  const { db, end } = getDb();
  try {
    const [m] = await db.select({ count: sql<number>`count(*)::int` }).from(organizationMembers).where(eq(organizationMembers.organizationId, organizationId));
    const [b] = await db.select({ count: sql<number>`count(*)::int` }).from(organizationBranches).where(eq(organizationBranches.organizationId, organizationId));
    return { memberCount: m?.count ?? 0, branchCount: b?.count ?? 0 };
  } finally {
    await end();
  }
}

export async function getCompanyMembers(organizationId: string) {
  const { db, end } = getDb();
  try {
    return await db
      .select({ member: organizationMembers, user: users })
      .from(organizationMembers)
      .innerJoin(users, eq(users.id, organizationMembers.userId))
      .where(eq(organizationMembers.organizationId, organizationId))
      .orderBy(desc(organizationMembers.joinedAt));
  } finally {
    await end();
  }
}

export async function getCompanyMemberUsers(organizationId: string) {
  const { db, end } = getDb();
  try {
    return await db
      .select({ email: users.email, name: users.name })
      .from(organizationMembers)
      .innerJoin(users, eq(users.id, organizationMembers.userId))
      .where(eq(organizationMembers.organizationId, organizationId));
  } finally {
    await end();
  }
}

export type CompanyServiceRow = {
  provider_id: string;
  category_name_ar: string | null;
  category_name_en: string | null;
  category_icon: string | null;
  price_from: number | null;
  price_to: number | null;
  pricing_unit: string | null;
  display_name_ar: string | null;
  display_name_en: string | null;
  business_name: string | null;
};

export async function getCompanyServicesByEmails(emails: string[]): Promise<CompanyServiceRow[]> {
  if (emails.length === 0) return [];
  const servicesDb = await getServicesDb();
  try {
    const result = await servicesDb
      .prepare(
        `SELECT pc.provider_id, c.name_ar AS category_name_ar, c.name_en AS category_name_en, c.icon AS category_icon,
                pc.price_from, pc.price_to, pc.pricing_unit,
                p.display_name_ar, p.display_name_en, p.business_name
         FROM service_provider_categories pc
         LEFT JOIN service_categories c ON c.id = pc.category_id
         LEFT JOIN service_provider_profiles p ON p.id = pc.provider_id
         WHERE pc.is_active = 1 AND p.user_id IN (${emails.map(() => "?").join(", ")})
         ORDER BY c.sort_order ASC, p.display_name_ar ASC`,
      )
      .bind(...emails)
      .all<CompanyServiceRow>();
    return result.results ?? [];
  } catch {
    return [];
  }
}
