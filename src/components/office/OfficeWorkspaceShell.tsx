"use client";
// Thin delegate — the real implementation is the unified org workspace.
import type { ReactNode } from "react";
import { OrgWorkspaceShell } from "@/src/components/organization/org-workspace";

type Props = { activeTab: string; children: ReactNode };

export function OfficeWorkspaceShell(props: Props) {
  return <OrgWorkspaceShell kind="office" {...props} />;
}

export default OfficeWorkspaceShell;
