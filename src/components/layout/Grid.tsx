import type { CSSProperties, ElementType, ReactNode } from "react";

const COLUMNS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
};

type GridProps = {
  as?: ElementType;
  columns?: 1 | 2 | 3 | 4;
  gap?: "none" | "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  style?: CSSProperties;
  id?: string;
  "aria-labelledby"?: string;
  children: ReactNode;
};

const GAPS: Record<NonNullable<GridProps["gap"]>, string> = {
  none: "gap-0",
  xs: "gap-[var(--space-2)]",
  sm: "gap-[var(--space-3)]",
  md: "gap-[var(--space-5)]",
  lg: "gap-[var(--space-8)]",
  xl: "gap-[var(--space-12)]",
};

export default function Grid({
  as: Tag = "div",
  columns = 1,
  gap = "md",
  className = "",
  style,
  id,
  "aria-labelledby": ariaLabelledby,
  children,
}: GridProps) {
  return (
    <Tag
      id={id}
      style={style}
      aria-labelledby={ariaLabelledby}
      className={`grid ${COLUMNS[columns]} ${GAPS[gap]} ${className}`.trim()}
    >
      {children}
    </Tag>
  );
}
