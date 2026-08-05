import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export default function AccountLayout({ children }: Props) {
  return <>{children}</>;
}
