export interface RateLimitEntry {
  readonly key: string;
  readonly count: number;
  readonly windowStart: number;
}

export interface RateLimitConfig {
  readonly maxRequests: number;
  readonly windowMs: number;
}

export interface RateLimitResult {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly resetAt: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 60,
  windowMs: 60 * 1000,
};

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  "api:auth": { maxRequests: 10, windowMs: 15 * 60 * 1000 },
  "api:amrs:organizations:create": { maxRequests: 5, windowMs: 60 * 60 * 1000 },
  "api:amrs:verification:submit": { maxRequests: 3, windowMs: 60 * 60 * 1000 },
  "api:amrs:admin:bulk": { maxRequests: 10, windowMs: 60 * 1000 },
  "api:amrs:directory:search": { maxRequests: 60, windowMs: 60 * 1000 },
  "api:amrs:reputation:evaluate": { maxRequests: 10, windowMs: 60 * 1000 },
};

const store: Map<string, RateLimitEntry> = new Map();

export function checkRateLimit(
  key: string,
  config?: RateLimitConfig,
): RateLimitResult {
  const effectiveConfig = config ?? RATE_LIMITS[key] ?? DEFAULT_CONFIG;
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now - entry.windowStart > effectiveConfig.windowMs) {
    store.set(key, { key, count: 1, windowStart: now });
    return {
      allowed: true,
      remaining: effectiveConfig.maxRequests - 1,
      resetAt: now + effectiveConfig.windowMs,
    };
  }

  if (entry.count >= effectiveConfig.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.windowStart + effectiveConfig.windowMs,
    };
  }

  store.set(key, { key, count: entry.count + 1, windowStart: entry.windowStart });
  return {
    allowed: true,
    remaining: effectiveConfig.maxRequests - entry.count - 1,
    resetAt: entry.windowStart + effectiveConfig.windowMs,
  };
}

export function resetRateLimit(key: string): void {
  store.delete(key);
}

export function clearAllRateLimits(): void {
  store.clear();
}

const DANGEROUS_PATTERNS: RegExp[] = [
  /<script\b[^>]*>/i,
  /javascript:/i,
  /on\w+\s*=/i,
  /union\s+select/i,
  /;\s*drop\s+table/i,
  /\/etc\/passwd/i,
  /\.\.\/\.\.\//,
  /eval\s*\(/i,
  /exec\s*\(/i,
];

const SQL_INJECTION_PATTERNS: RegExp[] = [
  /'\s*or\s+'1'\s*=\s*'1/i,
  /'\s*or\s+1\s*=\s*1/i,
  /;\s*--/,
  /\/\*.*\*\//,
];

export function sanitizeInput(input: string): {
  clean: string;
  threats: string[];
} {
  const threats: string[] = [];
  let clean = input;

  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(input)) {
      threats.push(`XSS_OR_INJECTION: ${pattern.source}`);
    }
  }

  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      threats.push(`SQL_INJECTION: ${pattern.source}`);
    }
  }

  clean = clean
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");

  return { clean, threats };
}

export function isSafeInput(input: string): boolean {
  const { threats } = sanitizeInput(input);
  return threats.length === 0;
}

export interface AuditLogEntry {
  readonly timestamp: Date;
  readonly action: string;
  readonly actorId: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly details: Record<string, unknown>;
  readonly ipAddress?: string;
}

const auditLog: AuditLogEntry[] = [];

export function logAudit(entry: Omit<AuditLogEntry, "timestamp">): void {
  auditLog.push({ ...entry, timestamp: new Date() });
}

export function getAuditLog(filters?: {
  action?: string;
  actorId?: string;
  entityType?: string;
  limit?: number;
}): AuditLogEntry[] {
  let filtered = [...auditLog];

  if (filters?.action) {
    filtered = filtered.filter((e) => e.action === filters.action);
  }
  if (filters?.actorId) {
    filtered = filtered.filter((e) => e.actorId === filters.actorId);
  }
  if (filters?.entityType) {
    filtered = filtered.filter((e) => e.entityType === filters.entityType);
  }

  const limit = filters?.limit ?? 100;
  return filtered.slice(-limit);
}

export function clearAuditLog(): void {
  auditLog.length = 0;
}
