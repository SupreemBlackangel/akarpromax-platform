// ORGANIZATIONS_F3_WORKSPACE
import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { organizationMembers, organizations } from "@/lib/db/schema";

export type OrganizationWorkspaceKind = "office" | "company";
export type OrganizationWorkspace = {
  organization: typeof organizations.$inferSelect;
  membership: typeof organizationMembers.$inferSelect;
};

const TYPES: Record<OrganizationWorkspaceKind, string[]> = {
  office: ["real_estate", "law_office"],
  company: ["business", "other"],
};

function isUuid(value?: string | null): value is string {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

export function canManageOrganization(role?: string | null): boolean {
  return role === "owner" || role === "admin";
}

export async function listUserOrganizationWorkspaces(
  userId: string,
  kind: OrganizationWorkspaceKind,
): Promise<OrganizationWorkspace[]> {
  const { db, end } = getDb();
  try {
    return await db
      .select({ organization: organizations, membership: organizationMembers })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
      .where(and(
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.status, "active"),
        inArray(organizations.type, TYPES[kind]),
        ne(organizations.status, "deleted"),
      ))
      .orderBy(asc(organizations.createdAt));
  } finally {
    await end();
  }
}

export async function resolveUserOrganizationWorkspace(
  userId: string,
  kind: OrganizationWorkspaceKind,
  requestedOrganizationId?: string | null,
): Promise<OrganizationWorkspace | null> {
  if (requestedOrganizationId && !isUuid(requestedOrganizationId)) return null;

  const { db, end } = getDb();
  try {
    const conditions = [
      eq(organizationMembers.userId, userId),
      eq(organizationMembers.status, "active"),
      inArray(organizations.type, TYPES[kind]),
      ne(organizations.status, "deleted"),
    ];
    if (requestedOrganizationId) conditions.push(eq(organizations.id, requestedOrganizationId));

    const [row] = await db
      .select({ organization: organizations, membership: organizationMembers })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
      .where(and(...conditions))
      .orderBy(asc(organizations.createdAt))
      .limit(1);

    return row ?? null;
  } finally {
    await end();
  }
}
