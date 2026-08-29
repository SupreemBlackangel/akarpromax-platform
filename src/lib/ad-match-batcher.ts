import type { AdMatchResult } from "@/lib/ads/types";

/**
 * Coalesces every AdSlot's per-mount match request into a single
 * POST /api/ads/match-batch call. A page typically mounts several AdSlot
 * instances in the same commit; their effects all run synchronously before
 * any microtask, so queuing the flush on a microtask reliably batches every
 * slot that asked in this tick with zero added latency.
 */

type MatchContext = Record<string, unknown> & { placement: string };

type PendingEntry = {
  context: MatchContext;
  resolve: (ads: AdMatchResult[]) => void;
  signal?: AbortSignal;
};

let queue: PendingEntry[] = [];
let scheduled = false;

function flush() {
  const batch = queue;
  queue = [];
  scheduled = false;

  fetch("/api/ads/match-batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contexts: batch.map((entry) => entry.context) }),
    cache: "no-store",
  })
    .then((res) => res.json())
    .then((data) => {
      const results = Array.isArray(data?.results) ? data.results : [];
      batch.forEach((entry, index) => {
        if (entry.signal?.aborted) return;
        const ads = results[index]?.ads;
        entry.resolve(Array.isArray(ads) ? ads : []);
      });
    })
    .catch(() => {
      batch.forEach((entry) => {
        if (!entry.signal?.aborted) entry.resolve([]);
      });
    });
}

export function requestAdMatch(context: MatchContext, signal?: AbortSignal): Promise<AdMatchResult[]> {
  return new Promise((resolve) => {
    queue.push({ context, resolve, signal });
    if (!scheduled) {
      scheduled = true;
      queueMicrotask(flush);
    }
  });
}
