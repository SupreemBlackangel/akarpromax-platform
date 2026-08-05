import type { ReactNode } from "react";

type CardVariant = "default" | "elevated" | "outlined";

type Props = {
  variant?: CardVariant;
  className?: string;
  children: ReactNode;
};

const variantClasses: Record<CardVariant, string> = {
  default: "card-default",
  elevated: "card-elevated",
  outlined: "card-outlined",
};

export default function Card({
  variant = "default",
  className,
  children,
}: Props) {
  const classes = ["shared-card", variantClasses[variant], className]
    .filter(Boolean)
    .join(" ");

  return <div className={classes}>{children}</div>;
}
