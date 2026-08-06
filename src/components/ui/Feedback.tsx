import type { ReactNode } from "react";
import { FileX2, LoaderCircle, TriangleAlert } from "lucide-react";
import { cn } from "@/src/utils/cn";
import Alert from "./Alert";
import Skeleton from "./Skeleton";

type FeedbackBaseProps = {
  className?: string;
  children?: ReactNode;
};

export function EmptyState({
  title,
  description,
  icon,
  action,
  className = "",
}: FeedbackBaseProps & {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-[var(--space-3)] rounded-[var(--radius-lg)] border border-dashed border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-muted)]/50 p-[var(--space-12)] text-center", className)}>
      <span className="flex size-12 items-center justify-center rounded-[var(--radius-pill)] bg-[color:var(--color-surface)] text-[color:var(--color-text-muted)]" aria-hidden="true">
        {icon ?? <FileX2 className="size-6" />}
      </span>
      <h3 className="text-[var(--font-size-lg)] font-semibold text-[color:var(--color-text-primary)]">{title}</h3>
      {description && <p className="max-w-sm text-[var(--font-size-sm)] text-[color:var(--color-text-muted)]">{description}</p>}
      {action && <div className="mt-[var(--space-2)]">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title,
  description,
  retry,
  onRetry,
  className = "",
}: FeedbackBaseProps & {
  title?: string;
  description?: ReactNode;
  retry?: string;
  onRetry?: () => void;
}) {
  return (
    <div className={cn("w-full", className)}>
      <Alert variant="danger" title={title ?? "Something went wrong"} icon={<TriangleAlert className="size-4" />}>
        {description ?? "An unexpected error occurred. Please try again."}
      </Alert>
      {retry && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-[var(--space-3)] inline-flex h-8 items-center rounded-[var(--radius-md)] px-[var(--space-4)] text-[var(--font-size-sm)] font-medium text-[color:var(--color-primary)] transition-colors duration-[var(--motion-fast)] hover:bg-[color:var(--color-primary-soft)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
        >
          {retry}
        </button>
      )}
    </div>
  );
}

export function LoadingState({
  label,
  className = "",
}: FeedbackBaseProps & {
  label?: string;
}) {
  return (
    <div role="status" className={cn("flex items-center justify-center gap-[var(--space-3)] p-[var(--space-8)]", className)}>
      <LoaderCircle aria-hidden="true" className="size-5 animate-spin text-[color:var(--color-primary)]" />
      {label && <span className="text-[var(--font-size-sm)] text-[color:var(--color-text-muted)]">{label}</span>}
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export function SkeletonState({ className = "" }: FeedbackBaseProps) {
  return (
    <div className={cn("flex flex-col gap-[var(--space-4)]", className)} aria-hidden="true">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}
