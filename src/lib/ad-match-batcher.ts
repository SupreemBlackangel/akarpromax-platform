import type { AdMatchResult } from "@/lib/ads/types";

/**
 * Coalesces every AdSlot's per-mount match request into a single
 * POST /api/ads/match-batch call. A page typically mounts several AdSlot
 * instances in the same commit; their effects all run synchronously before
 * any microtask, so queuing the flush on a microtask reliably batches every
 * slot that asked in this tick with zero added latency.
 *
 * Two lifecycle rules matter here:
 *
 *  - An aborted entry must still SETTLE. Previously an aborted slot's promise
 *    was simply never resolved, so the `await` inside AdSlot suspended forever,
 *    its `finally` never ran, and the async continuation was retained for the
 *    life of the page — one leaked coroutine per slot unmounted mid-flight.
 *  - The batch is only abandoned when EVERY entry in it has aborted. One slot
 *    unmounting must not cancel the request its siblings are still waiting on,
 *    which is why the fetch signal is derived from the batch, not from any
 *    single entry.
 */

type MatchContext = Record<string, unknown> & { placement: string };

type PendingEntry = {
  context: MatchContext;
  resolve: (ads: AdMatchResult[]) => void;
  signal?: AbortSignal;
};

let queue: PendingEntry[] = [];
let scheduled = false;

function settle(entry: PendingEntry, ads: AdMatchResult[]) {
  // Resolve regardless of abort: a caller that no longer cares simply ignores
  // the value, but the promise must never be left pending.
  entry.resolve(ads);
}

function flush() {
  const batch = queue;
  queue = [];
  scheduled = false;
  if (batch.length === 0) return;

  const live = () => batch.some((entry) => !entry.signal?.aborted);
  if (!live()) {
    batch.forEach((entry) => settle(entry, []));
    return;
  }

  // Abort the request only once every slot that asked for it has gone away.
  const controller = new AbortController();
  const onAbort = () => {
    if (!live()) controller.abort();
  };
  for (const entry of batch) entry.signal?.addEventListener("abort", onAbort);
  const cleanup = () => {
    for (const entry of batch) entry.signal?.removeEventListener("abort", onAbort);
  };

  fetch("/api/ads/match-batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contexts: batch.map((entry) => entry.context) }),
    cache: "no-store",
    // Cookies carry the signed ad session id, which is what keeps frequency
    // capping and unique-impression counting honest.
    credentials: "same-origin",
    signal: controller.signal,
  })
    .then((res) => res.json())
    .then((data) => {
      const results = Array.isArray(data?.results) ? data.results : [];
      batch.forEach((entry, index) => {
        const ads = results[index]?.ads;
        settle(entry, Array.isArray(ads) ? ads : []);
      });
    })
    .catch(() => {
      batch.forEach((entry) => settle(entry, []));
    })
    .finally(cleanup);
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
