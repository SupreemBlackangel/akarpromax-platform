import { cn } from "@/src/utils/cn";

/**
 * The AkarProMax mark, from the one file that defines it: /brand/logo.svg.
 *
 * Five places drew the brand as the letter "A" in a coloured square — each
 * with its own radius, colour and font. docs/brand-identity.md forbids
 * redrawing the logo as text; this is the component those places use instead.
 * Two sizes, both above the 24px minimum the identity sets.
 */
type BrandMarkProps = {
  size?: "sm" | "md";
  /** Render the brand name (and optional subtitle) beside the mark. */
  name?: string;
  subtitle?: string;
  className?: string;
};

const SIZES: Record<NonNullable<BrandMarkProps["size"]>, { px: number; className: string }> = {
  sm: { px: 24, className: "size-6" },
  md: { px: 36, className: "size-9" },
};

export default function BrandMark({ size = "md", name, subtitle, className }: BrandMarkProps) {
  const dims = SIZES[size];
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-[var(--space-3)]", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset */}
      <img src="/brand/logo.svg" alt="" aria-hidden="true" width={dims.px} height={dims.px} className={cn("shrink-0", dims.className)} />
      {name ? (
        <span className="flex min-w-0 flex-col leading-tight">
          <strong className="truncate font-[family-name:var(--font-heading-stack)] text-body font-extrabold text-[color:var(--color-text-primary)]">{name}</strong>
          {subtitle ? <small className="truncate text-label font-medium text-[color:var(--color-primary)]">{subtitle}</small> : null}
        </span>
      ) : null}
    </span>
  );
}
