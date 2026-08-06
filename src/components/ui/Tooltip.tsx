"use client";

import { useId, type ReactNode } from "react";

type TooltipProps = {
  content: string;
  children: ReactNode;
  side?: "top" | "bottom" | "start" | "end";
  className?: string;
};

const SIDES: Record<NonNullable<TooltipProps["side"]>, string> = {
  top: "bottom-full start-1/2 mb-[var(--space-2)] -translate-x-1/2 rtl:translate-x-1/2",
  bottom: "top-full start-1/2 mt-[var(--space-2)] -translate-x-1/2 rtl:translate-x-1/2",
  start: "end-full top-1/2 me-[var(--space-2)] -translate-y-1/2",
  end: "start-full top-1/2 ms-[var(--space-2)] -translate-y-1/2",
};

export default function Tooltip({
  content,
  children,
  side = "top",
  className = "",
}: TooltipProps) {
  const id = useId();
  return (
    <span className={`group/tt relative inline-flex ${className}`.trim()}>
      <span
        aria-describedby={id}
        tabIndex={0}
        className="inline-flex focus-visible:outline-none focus-visible:rounded-[var(--radius-sm)] focus-visible:shadow-[var(--shadow-focus)]"
      >
        {children}
      </span>
      <span
        id={id}
        role="tooltip"
        className={`pointer-events-none absolute z-[var(--layer-tooltip)] hidden rounded-[var(--radius-md)] bg-[color:var(--color-text-primary)] px-[var(--space-3)] py-[var(--space-2)] text-[var(--font-size-xs)] font-medium text-[color:var(--color-text-inverse)] shadow-[var(--shadow-md)] whitespace-nowrap group-hover/tt:block group-focus-within/tt:block ${SIDES[side]}`.trim()}
      >
        {content}
      </span>
    </span>
  );
}
