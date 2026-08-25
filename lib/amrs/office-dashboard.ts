// ORGANIZATIONS_F3_WORKSPACE
import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { organizationBranches, organizationMembers, users } from "@/lib/db/schema";
import { properties, propertyRequestOffers, propertyRequests } from "@/lib/db/schemas/properties-schema";

export type OfficeOverview = {
  memberCount: number;
  branchCount: number;
  propertyCount: number;
  requestOfferCount: number;
};

export async function getOfficeOverview(organizationId: string): Promise<OfficeOverview> {
  const { db, end } = getDb();
  try {
    const [m] = await db.select({ count: sql<number>`count(*)::int` }).from(organizationMembers).where(eq(organizationMembers.organizationId, organizationId));
    const [b] = await db.select({ count: sql<number>`count(*)::int` }).from(organizationBranches).where(eq(organizationBranches.organizationId, organizationId));
    const [p] = await db.select({ count: sql<number>`count(*)::int` }).from(properties).where(eq(properties.officeId, organizationId));
    const [r] = await db.select({ count: sql<number>`count(*)::int` }).from(propertyRequestOffers).where(eq(propertyRequestOffers.officeId, organizationId));
    return {
      memberCount: m?.count ?? 0,
      branchCount: b?.count ?? 0,
      propertyCount: p?.count ?? 0,
      requestOfferCount: r?.count ?? 0,
    };
  } finally {
    await end();
  }
}

export async function getOfficeMembers(organizationId: string) {
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

export async function getOfficeProperties(organizationId: string) {
  const { db, end } = getDb();
  try {
    return await db
      .select()
      .from(properties)
      .where(eq(properties.officeId, organizationId))
      .orderBy(desc(properties.createdAt));
  } finally {
    await end();
  }
}

export async function getOfficePropertyRequests(organizationId: string) {
  const { db, end } = getDb();
  try {
    return await db
      .select({ request: propertyRequests, offer: propertyRequestOffers })
      .from(propertyRequestOffers)
      .innerJoin(propertyRequests, eq(propertyRequestOffers.requestId, propertyRequests.id))
      .where(eq(propertyRequestOffers.officeId, organizationId))
      .orderBy(desc(propertyRequestOffers.createdAt));
  } finally {
    await end();
  }
}
