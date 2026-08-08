import { LandLocationResult } from "./intelligence/contracts";

interface StoredResult {
  id: string;
  result: LandLocationResult;
  createdAt: number;
}

const store = new Map<string, StoredResult>();
const TTL_MS = 60 * 60 * 1000;
let counter = 0;

export function generateResolveId(): string {
  counter += 1;
  const rand = Math.random().toString(36).slice(2, 8);
  return `resolve_${Date.now().toString(36)}_${rand}_${counter}`;
}

export function storeResolveResult(result: LandLocationResult): { id: string; result: LandLocationResult } {
  pruneExpired();
  const id = generateResolveId();
  store.set(id, { id, result, createdAt: Date.now() });
  return { id, result };
}

export function getResolveResult(id: string): LandLocationResult | null {
  const entry = store.get(id);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > TTL_MS) {
    store.delete(id);
    return null;
  }
  return entry.result;
}

export function pruneExpired(): void {
  const now = Date.now();
  for (const [id, entry] of store) {
    if (now - entry.createdAt > TTL_MS) store.delete(id);
  }
}

export function clearResolveResults(): void {
  store.clear();
}

export function countResolveResults(): number {
  return store.size;
}
