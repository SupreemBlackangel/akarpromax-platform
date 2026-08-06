import type { CSSProperties, ElementType, ReactNode } from "react";
import PageContainer from "./PageContainer";

type Spacing = "none" | "sm" | "md" | "lg" | "xl";

const SPACINGS: Record<Spacing, string> = {
  none: "",
  sm: "py-[var(--space-6)]",
  md: "py-[var(--space-12)]",
  lg: "py-[var(--space-16)]",
  xl: "py-[var(--space-24)]",
};

type SectionProps = {
  as?: ElementType;
  spacing?: Spacing;
  background?: "none" | "surface" | "muted" | "soft";
  bordered?: boolean;
  container?: boolean;
  containerSize?: "narrow" | "default" | "wide" | "full";
  "aria-labelledby"?: string;
  id?: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

const BACKGROUNDS: Record<NonNullable<SectionProps["background"]>, string> = {
  none: "",
  surface: "bg-[color:var(--color-surface)]",
  muted: "bg-[color:var(--color-surface-muted)]",
  soft: "bg-[color:var(--color-surface-soft)]",
};

export default function Section({
  as: Tag = "section",
  spacing = "md",
  background = "none",
  bordered = false,
  container = false,
  containerSize = "default",
  "aria-labelledby": ariaLabelledby,
  id,
  className = "",
  style,
  children,
}: SectionProps) {
  const inner = (
    <div className={`${SPACINGS[spacing]} ${BACKGROUNDS[background]} ${bordered ? "border-y border-[color:var(--color-border)]" : ""} ${className}`.trim()}>
      {container ? <PageContainer size={containerSize}>{children}</PageContainer> : children}
    </div>
  );

  return (
    <Tag id={id} aria-labelledby={ariaLabelledby} style={style}>
      {inner}
    </Tag>
  );
}
