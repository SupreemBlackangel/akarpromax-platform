"use client";

import { useEffect, useState } from "react";
import { cn } from "@/src/utils/cn";

/**
 * Toast system with a module-level store so any client component can call
 * `toast.success("...")` without threading a React context/provider through
 * server components. Mount <ToastViewport/> once (in the shell); it renders the
 * stack into an aria-live region and auto-dismisses. Token-styled, RTL-aware.
 */

export type ToastVariant = "success" | "error" | "warning" | "info";

export type ToastItem = {
  id: number;
  message: string;
  variant: ToastVariant;
  duration: number;
};

type Listener = (toasts: ToastItem[]) => void;

let toasts: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l(toasts);
}

function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

function push(message: string, variant: ToastVariant, duration = 4000): number {
  const id = nextId++;
  toasts = [...toasts, { id, message, variant, duration }];
  emit();
  return id;
}

export const toast = Object.assign(
  (message: string, opts?: { variant?: ToastVariant; duration?: number }) =>
    push(message, opts?.variant ?? "info", opts?.duration),
  {
    success: (m: string, duration?: number) => push(m, "success", duration),
    error: (m: string, duration?: number) => push(m, "error", duration),
    warning: (m: string, duration?: number) => push(m, "warning", duration),
    info: (m: string, duration?: number) => push(m, "info", duration),
    dismiss,
  },
);

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: "border-[var(--color-success)] bg-[var(--color-success-soft)] text-[var(--color-success)]",
  error: "border-[var(--color-danger)] bg-[var(--color-danger-soft)] text-[var(--color-danger)]",
  warning: "border-[var(--color-warning)] bg-[var(--color-warning-soft)] text-[var(--color-warning)]",
  info: "border-[var(--color-info)] bg-[var(--color-info-soft)] text-[var(--color-info)]",
};

const VARIANT_GLYPH: Record<ToastVariant, string> = {
  success: "✓",
  error: "✕",
  warning: "!",
  info: "i",
};

function ToastCard({ item }: { item: ToastItem }) {
  useEffect(() => {
    if (item.duration <= 0) return;
    const timer = window.setTimeout(() => dismiss(item.id), item.duration);
    return () => window.clearTimeout(timer);
  }, [item.id, item.duration]);

  return (
    <div
      className={cn(
        "pointer-events-auto flex items-center gap-[var(--space-3)] rounded-[var(--radius-md)] border px-[var(--space-4)] py-[var(--space-3)] text-[var(--font-size-sm)] font-bold shadow-[var(--shadow-lg)]",
        VARIANT_STYLES[item.variant],
      )}
    >
      <span aria-hidden className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-current text-[var(--font-size-xs)] leading-none">
        {VARIANT_GLYPH[item.variant]}
      </span>
      <span className="flex-1">{item.message}</span>
      <button
        type="button"
        onClick={() => dismiss(item.id)}
        aria-label="إغلاق"
        className="shrink-0 rounded-[var(--radius-sm)] px-1 text-current opacity-70 transition hover:opacity-100"
      >
        ✕
      </button>
    </div>
  );
}

export default function ToastViewport({ ariaLabel = "التنبيهات" }: { ariaLabel?: string }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const listener: Listener = (next) => setItems([...next]);
    listeners.add(listener);
    listener(toasts);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return (
    <div
      aria-live="polite"
      role="region"
      aria-label={ariaLabel}
      className="pointer-events-none fixed inset-inline-start-1/2 bottom-[var(--space-6)] z-[var(--layer-toast)] flex w-[min(420px,calc(100vw-32px))] -translate-x-1/2 flex-col gap-[var(--space-3)] rtl:translate-x-1/2"
    >
      {items.map((item) => (
        <ToastCard key={item.id} item={item} />
      ))}
    </div>
  );
}
