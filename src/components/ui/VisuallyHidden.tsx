import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  as?: "span" | "div";
};

export default function VisuallyHidden({ children, className = "", as = "span" }: Props) {
  const Tag = as;
  return <Tag className={`sr-only ${className}`.trim()}>{children}</Tag>;
}
