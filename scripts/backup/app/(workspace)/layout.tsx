import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export default function WorkspaceLayout({ children }: Props) {
  return <>{children}</>;
}
