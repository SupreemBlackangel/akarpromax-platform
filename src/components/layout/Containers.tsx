import type { ReactNode } from "react";
import PageContainer from "./PageContainer";

type ContainerAliasProps = {
  className?: string;
  id?: string;
  children: ReactNode;
};

export function ContentContainer({ className = "", id, children }: ContainerAliasProps) {
  return (
    <PageContainer size="default" className={className} id={id}>
      {children}
    </PageContainer>
  );
}

export function WideContainer({ className = "", id, children }: ContainerAliasProps) {
  return (
    <PageContainer size="wide" className={className} id={id}>
      {children}
    </PageContainer>
  );
}

export function NarrowContainer({ className = "", id, children }: ContainerAliasProps) {
  return (
    <PageContainer size="narrow" className={className} id={id}>
      {children}
    </PageContainer>
  );
}
