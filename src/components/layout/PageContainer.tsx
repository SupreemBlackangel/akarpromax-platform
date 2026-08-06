import type { CSSProperties, ElementType, ReactNode } from "react";

type Size = "narrow" | "default" | "wide" | "full";

const SIZES: Record<Size, string> = {
  narrow: "max-w-[640px]",
  default: "max-w-[1140px]",
  wide: "max-w-[1400px]",
  full: "max-w-none",
};

type PageContainerProps = {
  size?: Size;
  as?: ElementType;
  padding?: boolean;
  className?: string;
  id?: string;
  style?: CSSProperties;
  children: ReactNode;
};

export default function PageContainer({
  size = "default",
  as: Tag = "div",
  padding = true,
  className = "",
  id,
  style,
  children,
}: PageContainerProps) {
  return (
    <Tag
      id={id}
      style={style}
      className={`mx-auto w-full ${SIZES[size]} ${padding ? "px-[var(--space-5)] sm:px-[var(--space-8)]" : ""} ${className}`.trim()}
    >
      {children}
    </Tag>
  );
}
