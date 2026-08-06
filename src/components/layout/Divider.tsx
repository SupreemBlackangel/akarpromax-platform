import type { ElementType, ReactNode } from "react";

type DividerProps = {
  as?: ElementType;
  spacing?: "none" | "sm" | "md" | "lg";
  className?: string;
  children?: ReactNode;
};

const SPACINGS: Record<NonNullable<DividerProps["spacing"]>, string> = {
  none: "",
  sm: "my-[var(--space-3)]",
  md: "my-[var(--space-6)]",
  lg: "my-[var(--space-10)]",
};

export default function Divider({
  as: Tag = "hr",
  spacing = "md",
  className = "",
  children,
}: DividerProps) {
  if (children) {
    return (
      <div className={`flex items-center gap-[var(--space-3)] ${SPACINGS[spacing]} ${className}`.trim()} role="separator">
        <span className="h-px grow bg-[color:var(--color-border)]" aria-hidden="true" />
        {children}
        <span className="h-px grow bg-[color:var(--color-border)]" aria-hidden="true" />
      </div>
    );
  }

  return <Tag aria-hidden="true" className={`h-px border-0 bg-[color:var(--color-border)] ${SPACINGS[spacing]} ${className}`.trim()} />;
}
