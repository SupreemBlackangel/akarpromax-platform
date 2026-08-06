import type { CSSProperties, ElementType, ReactNode } from "react";

type Align = "start" | "center" | "end" | "stretch";
type Direction = "row" | "column";

type FlexBaseProps = {
  as?: ElementType;
  direction?: Direction;
  align?: Align;
  justify?: "start" | "center" | "end" | "between" | "around";
  wrap?: boolean;
  gap?: "none" | "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  style?: CSSProperties;
  id?: string;
  children: ReactNode;
};

const ALIGN: Record<Align, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
};

const JUSTIFY: Record<NonNullable<FlexBaseProps["justify"]>, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
};

const GAPS: Record<NonNullable<FlexBaseProps["gap"]>, string> = {
  none: "gap-0",
  xs: "gap-[var(--space-2)]",
  sm: "gap-[var(--space-3)]",
  md: "gap-[var(--space-5)]",
  lg: "gap-[var(--space-8)]",
  xl: "gap-[var(--space-12)]",
};

function Flex({
  as: Tag = "div",
  direction = "row",
  align = "stretch",
  justify = "start",
  wrap = false,
  gap = "md",
  className = "",
  style,
  id,
  children,
}: FlexBaseProps) {
  return (
    <Tag
      id={id}
      style={style}
      className={`flex ${direction === "column" ? "flex-col" : "flex-row"} ${ALIGN[align]} ${JUSTIFY[justify]} ${wrap ? "flex-wrap" : ""} ${GAPS[gap]} ${className}`.trim()}
    >
      {children}
    </Tag>
  );
}

export type StackProps = Omit<FlexBaseProps, "direction" | "align" | "justify" | "wrap"> & {
  align?: Align;
  justify?: "start" | "center" | "end" | "between" | "around";
  wrap?: boolean;
};

export function Stack(props: StackProps) {
  return <Flex direction="column" {...props} />;
}

export type InlineProps = Omit<FlexBaseProps, "direction" | "align" | "justify" | "wrap"> & {
  align?: Align;
  justify?: "start" | "center" | "end" | "between" | "around";
  wrap?: boolean;
};

export function Inline(props: InlineProps) {
  return <Flex direction="row" {...props} />;
}

export function StackSpacer({ as: Tag = "div", className = "", style, children }: { as?: ElementType; className?: string; style?: CSSProperties; children?: ReactNode }) {
  return (
    <Tag className={`grow ${className}`.trim()} style={style}>
      {children}
    </Tag>
  );
}

export default Flex;
