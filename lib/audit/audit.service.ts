import { db } from '@/lib/db';
import { auditEvents } from '@/lib/db/schema';
import { logger } from '@/lib/logging/logger';

export enum AuditAction {
  LOGIN = 'login',
  LOGOUT = 'logout',
  REGISTER = 'register',
  PROFILE_UPDATE = 'profile_update',
  PROPERTY_CREATE = 'property_create',
  PROPERTY_UPDATE = 'property_update',
  PROPERTY_DELETE = 'property_delete',
  SERVICE_REQUEST_CREATE = 'service_request_create',
  ORGANIZATION_CREATE = 'organization_create',
  ADMIN_ACTION = 'admin_action',
  SECURITY_EVENT = 'security_event',
}

export async function audit(log: { action: AuditAction; userId?: string; entityType?: string; entityId?: string; metadata?: Record<string, unknown>; ip?: string; userAgent?: string }) {
  try {
    await db.insert(auditEvents).values({
      userId: log.userId || null,
      eventType: log.action,
      ipAddress: log.ip || null,
      userAgent: log.userAgent || null,
      detail: log.metadata || {},
    });
    logger.info(`Audit: ${log.action}`, { userId: log.userId });
  } catch (error) {
    logger.error(error as Error, { message: 'Failed to write audit log' });
  }
}
