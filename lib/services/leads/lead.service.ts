import { db } from '@/lib/db';
import { leads, leadActivities, leadAssignments } from '@/lib/db/schemas/leads-schema';
import { eq, and, desc, sql, type SQL } from 'drizzle-orm';
import { logger } from '@/lib/logging/logger';

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
export type LeadPriority = 'low' | 'normal' | 'high' | 'urgent';

export async function createLead(data: {
  source: string;
  type: string;
  subject: string;
  description?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  contactWhatsapp?: string;
  userId?: string;
  propertyId?: string;
  serviceRequestId?: string;
  country?: string;
  governorate?: string;
  city?: string;
  budget?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
}) {
  const results = await db.insert(leads).values({
    source: data.source,
    type: data.type,
    subject: data.subject,
    description: data.description,
    contactName: data.contactName,
    contactPhone: data.contactPhone,
    contactEmail: data.contactEmail,
    contactWhatsapp: data.contactWhatsapp,
    userId: data.userId ?? null,
    propertyId: data.propertyId ?? null,
    serviceRequestId: data.serviceRequestId ?? null,
    country: data.country,
    governorate: data.governorate,
    city: data.city,
    budget: data.budget ? String(data.budget) : null,
    tags: data.tags ?? [],
    metadata: data.metadata ?? {},
  }).returning();

  const lead = results[0];
  logger.info('Lead created', { leadId: lead.id, source: data.source, type: data.type });
  return lead;
}

export async function getLead(id: string) {
  const results = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  return results[0] ?? null;
}

export async function updateLeadStatus(id: string, status: LeadStatus, userId?: string) {
  const updates: Partial<typeof leads.$inferInsert> = { status, updatedAt: new Date() };
  if (status === 'contacted') updates.respondedAt = new Date();
  if (status === 'won') updates.convertedAt = new Date();
  if (status === 'lost') updates.lostAt = new Date();

  const results = await db.update(leads).set(updates).where(eq(leads.id, id)).returning();

  if (results[0] && userId) {
    await db.insert(leadActivities).values({
      leadId: id,
      userId,
      action: `status_changed_to_${status}`,
      description: `Status changed to ${status}`,
    });
  }

  return results[0] ?? null;
}

export async function assignLead(leadId: string, assignedTo: string, assignedBy: string, notes?: string) {
  await db.update(leads).set({
    assignedTo,
    assignedAt: new Date(),
    status: 'contacted',
    updatedAt: new Date(),
  }).where(eq(leads.id, leadId));

  await db.insert(leadAssignments).values({
    leadId,
    assignedTo,
    assignedBy,
    notes,
  });

  await db.insert(leadActivities).values({
    leadId,
    userId: assignedBy,
    action: 'assigned',
    description: `Lead assigned to ${assignedTo}`,
    metadata: { assignedTo, notes },
  });

  return true;
}

export async function addLeadActivity(leadId: string, data: {
  userId?: string;
  action: string;
  description?: string;
  metadata?: Record<string, unknown>;
}) {
  const results = await db.insert(leadActivities).values({
    leadId,
    userId: data.userId ?? null,
    action: data.action,
    description: data.description,
    metadata: data.metadata ?? {},
  }).returning();
  return results[0];
}

export async function getLeadActivities(leadId: string) {
  return db.select().from(leadActivities)
    .where(eq(leadActivities.leadId, leadId))
    .orderBy(desc(leadActivities.createdAt));
}

export async function searchLeads(filters: {
  status?: LeadStatus;
  source?: string;
  assignedTo?: string;
  userId?: string;
  page?: number;
  limit?: number;
}) {
  const page = filters.page ?? 1;
  const limit = Math.min(filters.limit ?? 20, 100);
  const offset = (page - 1) * limit;

  const conditions: SQL[] = [];
  if (filters.status) conditions.push(eq(leads.status, filters.status));
  if (filters.source) conditions.push(eq(leads.source, filters.source));
  if (filters.assignedTo) conditions.push(eq(leads.assignedTo, filters.assignedTo));
  if (filters.userId) conditions.push(eq(leads.userId, filters.userId));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, countResult] = await Promise.all([
    db.select().from(leads).where(whereClause)
      .orderBy(desc(leads.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(leads).where(whereClause),
  ]);

  return {
    leads: items,
    total: countResult[0]?.count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((countResult[0]?.count ?? 0) / limit),
  };
}

export function calculateLeadScore(lead: {
  source?: string;
  budget?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  description?: string | null;
}): number {
  let score = 0;
  if (lead.source === 'website') score += 10;
  else if (lead.source === 'referral') score += 20;
  else if (lead.source === 'whatsapp') score += 15;

  if (lead.budget && Number(lead.budget) > 50000) score += 20;
  else if (lead.budget && Number(lead.budget) > 10000) score += 10;

  if (lead.contactPhone) score += 5;
  if (lead.contactEmail) score += 5;
  if (lead.description && lead.description.length > 50) score += 10;

  return Math.min(score, 100);
}
