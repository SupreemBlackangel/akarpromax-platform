import { db } from '@/lib/db';
import { landParcels, landDocuments } from '@/lib/db/schemas/land-schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '@/lib/logging/logger';

export type ProjectFile = {
  id: string;
  parcelId: string;
  type: string;
  title: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  isVerified: boolean;
  uploadedBy: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
};

export async function storeProjectFile(data: {
  parcelId: string;
  type: string;
  title: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedBy?: string;
  metadata?: Record<string, unknown>;
}): Promise<ProjectFile> {
  const results = await db.insert(landDocuments).values({
    parcelId: data.parcelId,
    type: data.type,
    title: data.title,
    fileUrl: data.fileUrl,
    fileSize: data.fileSize,
    mimeType: data.mimeType,
    uploadedBy: data.uploadedBy ?? null,
    metadata: data.metadata ?? {},
  }).returning();

  logger.info('Project file stored', { parcelId: data.parcelId, type: data.type });
  return results[0] as ProjectFile;
}

export async function getProjectFiles(parcelId: string, type?: string): Promise<ProjectFile[]> {
  const conditions = [eq(landDocuments.parcelId, parcelId)];
  if (type) conditions.push(eq(landDocuments.type, type));

  return db.select().from(landDocuments)
    .where(and(...conditions)) as Promise<ProjectFile[]>;
}

export async function deleteProjectFile(id: string): Promise<void> {
  await db.delete(landDocuments).where(eq(landDocuments.id, id));
  logger.info('Project file deleted', { id });
}

export async function verifyProjectFile(id: string, verifiedBy: string): Promise<ProjectFile | null> {
  const results = await db.update(landDocuments)
    .set({ isVerified: true })
    .where(eq(landDocuments.id, id))
    .returning();
  return (results[0] as ProjectFile) ?? null;
}

export function validateFileSize(size: number, mimeType: string): { valid: boolean; error?: string } {
  const limits: Record<string, number> = {
    'application/pdf': 50 * 1024 * 1024,
    'image/jpeg': 10 * 1024 * 1024,
    'image/png': 10 * 1024 * 1024,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 20 * 1024 * 1024,
  };
  const limit = limits[mimeType] ?? 10 * 1024 * 1024;
  if (size > limit) {
    return { valid: false, error: `File size exceeds limit of ${Math.round(limit / 1024 / 1024)}MB for ${mimeType}` };
  }
  return { valid: true };
}
