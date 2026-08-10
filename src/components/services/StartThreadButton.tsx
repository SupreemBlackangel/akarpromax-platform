"use client";

import { useState } from "react";
import { apiFetch } from "@services-client";

/**
 * Entry point into the shared seven-context messaging core. Starts (or
 * attaches to) a conversation for the given context and deep-links into the
 * central inbox. Requires an authenticated session; unauthenticated users are
 * sent to the login flow with a return path.
 */
export default function StartThreadButton({
  threadType,
  threadId,
  title,
  contextLink,
  participantIds = [],
  label,
  className = "",
}: {
  threadType: string;
  threadId: string;
  title?: string | null;
  contextLink?: string | null;
  participantIds?: string[];
  label: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);

  const start = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const data = await apiFetch<{ thread: { thread_type: string; thread_id: string } }>("/api/service-messages/threads", {
        method: "POST",
        body: JSON.stringify({ threadType, threadId, title, contextLink, participantIds }),
      });
      window.location.href = `/dashboard/services/inbox?open=${encodeURIComponent(`${data.thread.thread_type}:${data.thread.thread_id}`)}`;
    } catch (error) {
      const isUnauthorized = error instanceof Error && /401/.test(error.message);
      if (isUnauthorized) {
        window.location.href = `/?next=${encodeURIComponent(`/dashboard/services/inbox?open=${encodeURIComponent(`${threadType}:${threadId}`)}`)}`;
        return;
      }
      window.location.href = `/dashboard/services/inbox?open=${encodeURIComponent(`${threadType}:${threadId}`)}`;
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" onClick={() => void start()} disabled={busy} className={className || "rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"}>
      {label}
    </button>
  );
}
