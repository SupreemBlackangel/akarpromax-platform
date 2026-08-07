import { sha256Hex } from "@/lib/auth/crypto";
import { isProduction } from "@/lib/config/runtime-env";
import { logSecurityEvent } from "@/lib/security/audit";

export type RateLimitOperation =
  | "login"
  | "register"
  | "verify_code"
  | "verify_email"
  | "otp_request"
  | "otp_resend"
  | "email_verification_resend"
  | "password_reset"
  | "password_reset_confirm"
  | "change_email"
  | "dev_login"
  | "office_pairing_complete"
  | "office_sync_push";

export type RateLimitConfig = {
  limit: number;
  windowMs: number;
  cooldownMs: number;
};

export const RATE_LIMIT_CONFIGS: Record<RateLimitOperation, RateLimitConfig> = {
  login: { limit: 10, windowMs: 60_000, cooldownMs: 60_000 },
  register: { limit: 5, windowMs: 60_000, cooldownMs: 300_000 },
  verify_code: { limit: 15, windowMs: 60_000, cooldownMs: 60_000 },
  verify_email: { limit: 5, windowMs: 60_000, cooldownMs: 60_000 },
  password_reset: { limit: 5, windowMs: 60_000, cooldownMs: 300_000 },
  password_reset_confirm: { limit: 5, windowMs: 60_000, cooldownMs: 60_000 },
  otp_resend: { limit: 5, windowMs: 60_000, cooldownMs: 300_000 },
  otp_request: { limit: 5, windowMs: 60_000, cooldownMs: 300_000 },
  email_verification_resend: { limit: 3, windowMs: 60_000, cooldownMs: 600_000 },
  change_email: { limit: 5, windowMs: 60_000, cooldownMs: 300_000 },
  dev_login: { limit: 10, windowMs: 60_000, cooldownMs: 60_000 },
  office_pairing_complete: { limit: 5, windowMs: 60_000, cooldownMs: 300_000 },
  office_sync_push: { limit: 120, windowMs: 60_000, cooldownMs: 60_000 },
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  reason: "allowed" | "rate_limited";
};

export type Bucket = { count: number; windowExpiresAt: number; cooldownUntil: number };

export interface RateLimitStore {
  increment(key: string, windowMs: number): Promise<Bucket>;
  setCooldown(key: string, until: number): Promise<void>;
  get(key: string): Promise<Bucket | undefined>;
  reset(): Promise<void>;
}

// Optional introspection for diagnostics and tests. In-memory store only;
// shared stores should expose an equivalent inspection API for audits.
export interface InspectableRateLimitStore extends RateLimitStore {
  keys(): string[];
}

export class MemoryRateLimitStore implements RateLimitStore, InspectableRateLimitStore {
  private buckets = new Map<string, Bucket>();

  async increment(key: string, windowMs: number): Promise<Bucket> {
    const now = Date.now();
    const existing = this.buckets.get(key);
    if (!existing || existing.windowExpiresAt <= now) {
      const bucket: Bucket = { count: 1, windowExpiresAt: now + windowMs, cooldownUntil: 0 };
      this.buckets.set(key, bucket);
      return bucket;
    }
    existing.count += 1;
    return existing;
  }

  async setCooldown(key: string, until: number): Promise<void> {
    const existing = this.buckets.get(key);
    if (existing) existing.cooldownUntil = Math.max(existing.cooldownUntil, until);
  }

  async get(key: string): Promise<Bucket | undefined> {
    return this.buckets.get(key);
  }

  keys(): string[] {
    return [...this.buckets.keys()];
  }

  async reset(): Promise<void> {
    this.buckets.clear();
  }
}

export class RateLimiter {
  constructor(
    private store: RateLimitStore,
    private configs: Record<RateLimitOperation, RateLimitConfig> = RATE_LIMIT_CONFIGS,
    private options: { disabled?: boolean } = {},
  ) {}

  async hit(operation: RateLimitOperation, dimensions: string[]): Promise<RateLimitResult> {
    if (this.options.disabled) {
      return { allowed: true, remaining: Number.MAX_SAFE_INTEGER, retryAfterSeconds: 0, reason: "allowed" };
    }
    const config = this.configs[operation];
    let remaining = config.limit;
    let blocked = false;
    let retryAfterMs = 0;

    for (const dimension of dimensions) {
      const key = `${operation}:${await sha256Hex(dimension)}`;
      const bucket = await this.store.increment(key, config.windowMs);
      const now = Date.now();

      if (bucket.cooldownUntil > now) {
        blocked = true;
        retryAfterMs = Math.max(retryAfterMs, bucket.cooldownUntil - now);
      } else if (bucket.count > config.limit) {
        await this.store.setCooldown(key, now + config.cooldownMs);
        blocked = true;
        retryAfterMs = Math.max(
          retryAfterMs,
          config.cooldownMs > 0 ? config.cooldownMs : bucket.windowExpiresAt - now,
        );
      } else {
        remaining = Math.min(remaining, config.limit - bucket.count);
      }
    }

    if (blocked) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
        reason: "rate_limited",
      };
    }
    return { allowed: true, remaining, retryAfterSeconds: 0, reason: "allowed" };
  }

  async reset(): Promise<void> {
    await this.store.reset();
  }
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizePhone(value: string): string {
  return value.trim().replace(/\s+/g, "").replace(/[^0-9]/g, "").slice(-12);
}

export function ipKey(ip: string): string {
  return `ip:${ip}`;
}

export function identifierKey(identifier: string): string {
  return `id:${identifier}`;
}

export type RequestLike = { headers: { get(name: string): string | null } };

export function clientIp(request: RequestLike): string {
  const cf = request.headers.get("cf-connecting-ip");
  if (cf && cf.trim()) return cf.trim();
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded && forwarded.trim()) return forwarded.split(",")[0].trim();
  const real = request.headers.get("x-real-ip");
  if (real && real.trim()) return real.trim();
  return "unknown";
}

let limiter: RateLimiter | null = null;
let storageWarningLogged = false;

export function getRateLimiter(): RateLimiter {
  if (!limiter) {
    limiter = new RateLimiter(new MemoryRateLimitStore());
    if (isProduction() && !storageWarningLogged) {
      storageWarningLogged = true;
      console.warn(
        "[security] rate limiter uses an in-memory store; a shared store is required before horizontal scaling (see docs/security/AUTH_RATE_LIMIT_POLICY.md)",
      );
    }
  }
  return limiter;
}

export async function enforceRateLimit(
  operation: RateLimitOperation,
  ip: string,
  identifier?: string,
): Promise<RateLimitResult> {
  const dimensions = [ipKey(ip)];
  if (identifier) dimensions.push(identifierKey(identifier));
  const result = await getRateLimiter().hit(operation, dimensions);
  if (!result.allowed) {
    logSecurityEvent("AUTH_RATE_LIMITED", { operation });
  }
  return result;
}

export async function resetRateLimiterForTests(): Promise<void> {
  if (limiter) await limiter.reset();
}

export function setRateLimitStoreForTests(store: RateLimitStore): void {
  limiter = new RateLimiter(store);
}
