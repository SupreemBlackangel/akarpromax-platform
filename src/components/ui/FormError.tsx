import type { ReactNode } from "react";

type Props = {
  id?: string;
  children: ReactNode;
  className?: string;
};

export default function FormError({ id, children, className = "" }: Props) {
  return (
    <span id={id} role="alert" className={`input-error-text ${className}`.trim()}>
      {children}
    </span>
  );
}
