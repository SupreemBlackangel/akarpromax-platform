import type { ReactNode } from "react";

import { cn } from "@/src/utils/cn";

/**
 * A heading whose LEVEL and whose SIZE are the same decision.
 *
 * They were two decisions, made separately, and they disagreed: a page would
 * mark a section `<h2>` for the document outline and then style it two steps
 * larger and heavier because that looked right, so a screen reader announced a level
 * the eye could not see and the eye saw a rank the outline did not have.
 *
 * Here the level picks the tag and the type role together — `<Heading level={2}>`
 * is an `<h2>` at `--type-h2`, always. When a heading genuinely has to look
 * like a different rank, `className` overrides the type and the outline stays
 * correct, which is the right way round.
 *
 * For NEW work. Existing headings are on the scale through the base rules in
 * globals.css and are not worth rewriting to reach the same result.
 */
type HeadingProps = {
  level: 1 | 2 | 3 | 4;
  children: ReactNode;
  /** `display` for a hero line — larger than h1 and never part of the outline. */
  display?: boolean;
  className?: string;
  id?: string;
};

const TYPE: Record<HeadingProps["level"], string> = {
  1: "text-h1",
  2: "text-h2",
  3: "text-h3",
  4: "text-h4",
};

export default function Heading({ level, children, display = false, className, id }: HeadingProps) {
  const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4";
  return (
    <Tag
      id={id}
      className={cn(
        "font-heading text-[color:var(--color-text-primary)]",
        display ? "text-display" : TYPE[level],
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/**
 * A price, with its currency beside it rather than inside it.
 *
 * The amount is the thing being compared down a column of listings, so it is
 * the loud half and it is `tabular-nums` — proportional digits make a column
 * of prices ripple, and the eye reads the ripple as a difference in value that
 * is not there. The currency is a label: same size as the running text, not
 * bold, not shouting the word "ريال" at the size of the number.
 */
type PriceProps = {
  value: number | string;
  currency?: string;
  /** A rent period or "starting from" — sits after the currency, quietly. */
  note?: string;
  className?: string;
};

export function Price({ value, currency, note, className }: PriceProps) {
  const amount = typeof value === "number" ? value.toLocaleString("en-US") : value;
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-[var(--space-2)]", className)}>
      <bdi className="text-price tabular-nums text-[color:var(--color-text-primary)]">{amount}</bdi>
      {currency ? (
        <span className="text-body font-medium text-[color:var(--color-text-muted)]">{currency}</span>
      ) : null}
      {note ? <span className="text-label text-[color:var(--color-text-muted)]">{note}</span> : null}
    </span>
  );
}
