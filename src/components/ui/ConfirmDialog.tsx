"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";

import Dialog from "./Dialog";

/**
 * What the operator is about to do, in their own words.
 *
 * `window.confirm` cannot say any of this. It renders one line of unstyled
 * browser chrome outside the page, it cannot show what is about to change, it
 * cannot distinguish archiving from deleting, and on a destructive action it
 * offers the same two buttons as on a harmless one. The admin console used it
 * thirteen times, including for "delete this campaign permanently — the ad, its
 * images and its statistics, and it cannot be undone" and for closing a user's
 * account for good.
 */
export type ConfirmRequest = {
  title: string;
  /** What will happen, naming the subject. One or two sentences. */
  body?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` for anything that destroys or takes something away. */
  tone?: "primary" | "danger";
};

type Pending = ConfirmRequest & { resolve: (confirmed: boolean) => void };

/**
 * `const [confirm, confirmDialog] = useConfirm()`, then `await confirm({...})`
 * where `window.confirm` used to be, and render `{confirmDialog}` once.
 *
 * The promise resolves false on cancel, on Escape and on a backdrop click, so a
 * caller reads exactly as it did before: `if (!(await confirm(...))) return;`.
 */
export function useConfirm(): [(request: ConfirmRequest) => Promise<boolean>, ReactNode] {
  const [pending, setPending] = useState<Pending | null>(null);
  // Held in a ref as well so settling twice — Escape landing with a click —
  // cannot leave a caller awaiting a promise that never resolves.
  const pendingRef = useRef<Pending | null>(null);

  const settle = useCallback((confirmed: boolean) => {
    const current = pendingRef.current;
    pendingRef.current = null;
    setPending(null);
    current?.resolve(confirmed);
  }, []);

  const confirm = useCallback(
    (request: ConfirmRequest) =>
      new Promise<boolean>((resolve) => {
        // A second request while one is open answers the first with "no"
        // rather than stranding it.
        pendingRef.current?.resolve(false);
        const next: Pending = { ...request, resolve };
        pendingRef.current = next;
        setPending(next);
      }),
    [],
  );

  const dialog = pending ? (
    <Dialog open onClose={() => settle(false)} title={pending.title} closeLabel={pending.cancelLabel ?? "إلغاء"} size="sm">
      {pending.body ? (
        <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{pending.body}</p>
      ) : null}
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => settle(false)}
          className="rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm font-bold text-[var(--color-text-secondary)]"
        >
          {pending.cancelLabel ?? "إلغاء"}
        </button>
        <button
          type="button"
          autoFocus
          onClick={() => settle(true)}
          className={`rounded-xl px-5 py-2.5 text-sm font-bold text-white ${
            pending.tone === "danger" ? "bg-[var(--color-danger)]" : "bg-[var(--color-primary)]"
          }`}
        >
          {pending.confirmLabel ?? "تأكيد"}
        </button>
      </div>
    </Dialog>
  ) : null;

  return [confirm, dialog];
}

export default useConfirm;
