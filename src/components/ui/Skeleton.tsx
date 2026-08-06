import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/src/utils/cn";

type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  className?: string;
};

export default function Skeleton({ className = "", ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-[var(--radius-md)] bg-[color:var(--color-surface-muted)]", className)}
      {...props}
    />
  );
}

export function SkeletonText({ lines = 3, className = "", ...props }: { lines?: number } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col gap-[var(--space-2)]", className)} aria-hidden="true" {...props}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} className={cn("h-[var(--font-size-sm)]", index === lines - 1 && "w-2/3")} />
      ))}
    </div>
  );
}

export type SkeletonPropsWithChildren = SkeletonProps & { children?: ReactNode };
