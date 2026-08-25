import { getDb } from '@/lib/db';
import { sql } from 'drizzle-orm';

async function check() {
  console.log('🔍 Checking database connection...');
  const { db, end } = getDb();
  try {
    const result = await db.execute(sql`SELECT 1 as connected`);
    console.log('✅ Database connected:', result);
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('❌ Database connection failed:', err.message?.substring(0, 300));
    const cause = err.cause instanceof Error ? err.cause.message : undefined;
    console.error('   cause:', cause?.substring(0, 200));
  } finally {
    await end();
  }
}
check();
