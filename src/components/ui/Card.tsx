import type { CSSProperties, ElementType, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/src/utils/cn";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  as?: ElementType;
  padding?: "none" | "sm" | "md" | "lg";
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

const PADDINGS: Record<NonNullable<CardProps["padding"]>, string> = {
  none: "",
  sm: "p-[var(--space-4)]",
  md: "p-[var(--space-6)]",
  lg: "p-[var(--space-8)]",
};

export default function Card({
  as: Tag = "div",
  padding = "md",
  interactive = false,
  className = "",
  style,
  children,
  ...props
}: CardProps) {
  return (
    <Tag
      style={style}
      className={cn(
        "rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-[var(--shadow-sm)]",
        interactive &&
          "cursor-pointer transition-[box-shadow,transform,border-color] duration-[var(--motion-normal)] ease-[var(--easing-standard)] hover:shadow-[var(--shadow-md)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]",
        PADDINGS[padding],
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mb-[var(--space-4)] flex flex-col gap-[var(--space-2)]", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ as: Tag = "h3", className = "", children, ...props }: { as?: ElementType } & HTMLAttributes<HTMLElement>) {
  return (
    <Tag className={cn("text-[var(--font-size-lg)] font-semibold text-[color:var(--color-text-primary)]", className)} {...props}>
      {children}
    </Tag>
  );
}

export function CardDescription({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("text-[var(--font-size-sm)] text-[color:var(--color-text-muted)]", className)} {...props}>
      {children}
    </div>
  );
}

export function CardContent({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mt-[var(--space-4)] flex items-center gap-[var(--space-3)] border-t border-[color:var(--color-border)] pt-[var(--space-4)]", className)} {...props}>
      {children}
    </div>
  );
}

export function CardMedia({ ratio = "16/9", className = "", children, ...props }: { ratio?: string } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div style={{ aspectRatio: ratio }} className={cn("overflow-hidden rounded-t-[calc(var(--radius-lg)-1px)] bg-[color:var(--color-surface-muted)]", className)} {...props}>
      {children}
    </div>
  );
}
