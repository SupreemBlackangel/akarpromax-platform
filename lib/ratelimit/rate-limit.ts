import { NextRequest, NextResponse } from 'next/server';

const store: { [key: string]: { count: number; reset: number } } = {};

export interface RateLimitConfig {
  windowSeconds: number;
  maxRequests: number;
  key?: string;
}

export async function withRateLimit(req: NextRequest, config: RateLimitConfig) {
  const key = config.key || req.headers.get('x-forwarded-for') || 'anonymous';
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const record = store[key];
  if (!record || record.reset < now) {
    store[key] = { count: 1, reset: now + windowMs };
    return { allowed: true };
  }
  if (record.count >= config.maxRequests) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((record.reset - now) / 1000)) } }
    );
  }
  record.count++;
  return { allowed: true };
}
