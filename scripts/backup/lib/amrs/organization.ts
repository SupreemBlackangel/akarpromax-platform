import { eq, and, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { organizations, organizationMembers, organizationBranches } from "@/lib/db/schema";
import type { OrganizationType, OrganizationClassification, OrganizationRole, OrganizationStatus } from "@/lib/amrs/contracts/common";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 255);
}

export interface CreateOrganizationInput {
  nameAr?: string;
  nameEn?: string;
  nameTr?: string;
  type: OrganizationType;
  classification: OrganizationClassification;
  countryCode: string;
  cityId?: string;
  districtId?: string;
  latitude?: number;
  longitude?: number;
  descriptionAr?: string;
  descriptionEn?: string;
  descriptionTr?: string;
  websiteUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface OrganizationRecord {
  id: string;
  nameAr: string | null;
  nameEn: string | null;
  nameTr: string | null;
  slug: string;
  type: string;
  classification: string;
  countryCode: string;
  cityId: string | null;
  districtId: string | null;
  latitude: number | null;
  longitude: number | null;
  logoUrl: string | null;
  coverUrl: string | null;
  descriptionAr: string | null;
  descriptionEn: string | null;
  descriptionTr: string | null;
  websiteUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  status: string;
  verifiedAt: Date | null;
  approvedAt: Date | null;
  suspendedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationMembershipRecord {
  id: string;
  organizationId: string;
  userId: string;
  role: string;
  status: string;
  joinedAt: Date;
  invitedBy: string | null;
}

export interface CreateOrganizationResult {
  organization: OrganizationRecord;
  membership: OrganizationMembershipRecord;
}

export async function createOrganization(
  input: CreateOrganizationInput,
  ownerId: string,
): Promise<CreateOrganizationResult> {
  const { db, end } = getDb();
  try {
    return await db.transaction(async (tx) => {
      const baseSlug = slugify(input.nameEn || input.nameAr || `org-${Date.now()}`);

      let slug = baseSlug;
      let attempt = 0;
      while (true) {
        const existing = await tx
          .select({ id: organizations.id })
          .from(organizations)
          .where(eq(organizations.slug, slug))
          .limit(1);
        if (existing.length === 0) break;
        attempt++;
        slug = `${baseSlug}-${attempt}`;
        if (attempt > 100) throw new Error("SLUG_GENERATION_FAILED");
      }

      const [org] = await tx
        .insert(organizations)
        .values({
          nameAr: input.nameAr ?? null,
          nameEn: input.nameEn ?? null,
          nameTr: input.nameTr ?? null,
          slug,
          type: input.type,
          classification: input.classification,
          countryCode: input.countryCode,
          cityId: input.cityId ?? null,
          districtId: input.districtId ?? null,
          latitude: input.latitude ?? null,
          longitude: input.longitude ?? null,
          descriptionAr: input.descriptionAr ?? null,
          descriptionEn: input.descriptionEn ?? null,
          descriptionTr: input.descriptionTr ?? null,
          websiteUrl: input.websiteUrl ?? null,
          contactEmail: input.contactEmail ?? null,
          contactPhone: input.contactPhone ?? null,
          status: "draft",
        })
        .returning();

      const [membership] = await tx
        .insert(organizationMembers)
        .values({
          organizationId: org.id,
          userId: ownerId,
          role: "owner",
          status: "active",
        })
        .returning();

      return {
        organization: org as OrganizationRecord,
        membership: membership as OrganizationMembershipRecord,
      };
    });
  } finally {
    await end();
  }
}

export async function getOrganizationBySlug(slug: string): Promise<OrganizationRecord | null> {
  const { db, end } = getDb();
  try {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, slug))
      .limit(1);
    return (org as OrganizationRecord) ?? null;
  } finally {
    await end();
  }
}

export async function getOrganizationById(id: string): Promise<OrganizationRecord | null> {
  const { db, end } = getDb();
  try {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id))
      .limit(1);
    return (org as OrganizationRecord) ?? null;
  } finally {
    await end();
  }
}

export async function listOrganizations(params: {
  type?: OrganizationType;
  status?: OrganizationStatus;
  countryCode?: string;
  limit?: number;
  offset?: number;
}): Promise<{ organizations: OrganizationRecord[]; total: number }> {
  const { db, end } = getDb();
  try {
    const conditions = [];
    if (params.type) conditions.push(eq(organizations.type, params.type));
    if (params.status) conditions.push(eq(organizations.status, params.status));
    if (params.countryCode) conditions.push(eq(organizations.countryCode, params.countryCode));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(organizations)
      .where(where);

    const rows = await db
      .select()
      .from(organizations)
      .where(where)
      .limit(params.limit ?? 20)
      .offset(params.offset ?? 0);

    return {
      organizations: rows as OrganizationRecord[],
      total: countResult?.count ?? 0,
    };
  } finally {
    await end();
  }
}

export async function addOrganizationMember(
  organizationId: string,
  userId: string,
  role: OrganizationRole,
  invitedBy: string,
): Promise<OrganizationMembershipRecord> {
  const { db, end } = getDb();
  try {
    const [membership] = await db
      .insert(organizationMembers)
      .values({
        organizationId,
        userId,
        role,
        status: "active",
        invitedBy,
      })
      .returning();
    return membership as OrganizationMembershipRecord;
  } finally {
    await end();
  }
}

export async function getOrganizationMembers(
  organizationId: string,
): Promise<OrganizationMembershipRecord[]> {
  const { db, end } = getDb();
  try {
    const rows = await db
      .select()
      .from(organizationMembers)
      .where(eq(organizationMembers.organizationId, organizationId));
    return rows as OrganizationMembershipRecord[];
  } finally {
    await end();
  }
}

export async function isOrganizationMember(
  organizationId: string,
  userId: string,
): Promise<boolean> {
  const { db, end } = getDb();
  try {
    const [result] = await db
      .select({ id: organizationMembers.id })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.userId, userId),
          eq(organizationMembers.status, "active"),
        ),
      )
      .limit(1);
    return !!result;
  } finally {
    await end();
  }
}

export async function getOrganizationMemberRole(
  organizationId: string,
  userId: string,
): Promise<OrganizationRole | null> {
  const { db, end } = getDb();
  try {
    const [result] = await db
      .select({ role: organizationMembers.role })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.userId, userId),
          eq(organizationMembers.status, "active"),
        ),
      )
      .limit(1);
    return (result?.role as OrganizationRole) ?? null;
  } finally {
    await end();
  }
}

export async function updateOrganizationStatus(
  organizationId: string,
  status: OrganizationStatus,
): Promise<void> {
  const { db, end } = getDb();
  try {
    await db
      .update(organizations)
      .set({ status, updatedAt: new Date() })
      .where(eq(organizations.id, organizationId));
  } finally {
    await end();
  }
}

export async function addOrganizationBranch(
  organizationId: string,
  branch: {
    nameAr?: string;
    nameEn?: string;
    countryCode: string;
    cityId?: string;
    districtId?: string;
    latitude?: number;
    longitude?: number;
    phone?: string;
    email?: string;
  },
): Promise<{ id: string }> {
  const { db, end } = getDb();
  try {
    const [result] = await db
      .insert(organizationBranches)
      .values({
        organizationId,
        nameAr: branch.nameAr ?? null,
        nameEn: branch.nameEn ?? null,
        countryCode: branch.countryCode,
        cityId: branch.cityId ?? null,
        districtId: branch.districtId ?? null,
        latitude: branch.latitude ?? null,
        longitude: branch.longitude ?? null,
        phone: branch.phone ?? null,
        email: branch.email ?? null,
        status: "active",
      })
      .returning({ id: organizationBranches.id });
    return { id: result!.id };
  } finally {
    await end();
  }
}
