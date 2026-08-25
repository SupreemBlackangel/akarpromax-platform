import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export default function PublicLayout({ children }: Props) {
  return <>{children}</>;
}
