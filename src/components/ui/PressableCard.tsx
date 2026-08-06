import type { ButtonHTMLAttributes, HTMLAttributes, KeyboardEvent, ReactNode } from "react";
import { cn } from "@/src/utils/cn";
import Card from "./Card";

type PressableCardProps = HTMLAttributes<HTMLDivElement> & {
  onPress?: () => void;
  href?: string;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
};

export default function PressableCard({
  onPress,
  href,
  disabled = false,
  className = "",
  children,
  onClick,
  onKeyDown,
  ...props
}: PressableCardProps) {
  const role = href ? undefined : "button";
  const tabIndex = disabled ? -1 : 0;
  const ariaDisabled = href ? undefined : disabled ? true : undefined;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onPress?.();
      onKeyDown?.(event);
      return;
    }
    onKeyDown?.(event);
  };

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    onClick?.(event);
    onPress?.();
  };

  return (
    <Card
      interactive
      role={role}
      tabIndex={tabIndex}
      aria-disabled={ariaDisabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(disabled && "pointer-events-none opacity-60", className)}
      {...props}
    >
      {href ? (
        <a href={href} className="absolute inset-0 z-[var(--layer-sticky)]" aria-label={typeof children === "string" ? children : "Open"} />
      ) : null}
      {children}
    </Card>
  );
}

export type PressableCardActionProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
};

export function PressableCardAction({ label, className = "", ...props }: PressableCardActionProps) {
  return (
    <button
      className={cn(
        "relative z-[var(--layer-sticky)] rounded-[var(--radius-sm)] text-[var(--font-size-sm)] font-medium text-[color:var(--color-primary)] transition-colors duration-[var(--motion-fast)] hover:text-[color:var(--color-primary-hover)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]",
        className,
      )}
      {...props}
    >
      {label}
    </button>
  );
}
