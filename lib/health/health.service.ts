import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  database: { status: 'up' | 'down'; latency?: number };
  memory: { used: number; total: number };
}

export async function checkHealth(): Promise<HealthStatus> {
  const start = Date.now();
  let dbStatus: 'up' | 'down' = 'down';
  let dbLatency: number | undefined;
  try {
    await db.execute(sql`SELECT 1`);
    dbStatus = 'up';
    dbLatency = Date.now() - start;
  } catch {
    dbStatus = 'down';
  }
  const mem = process.memoryUsage();
  return {
    status: dbStatus === 'up' ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    database: { status: dbStatus, latency: dbLatency },
    memory: { used: Math.round(mem.heapUsed / 1024 / 1024), total: Math.round(mem.heapTotal / 1024 / 1024) },
  };
}
