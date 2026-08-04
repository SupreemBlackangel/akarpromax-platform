import type { Metadata } from "next";
import { ToolsPageClient } from "@/src/components/tools/ToolsPageClient";

export const metadata: Metadata = {
  title: "الأدوات الهندسية — عقار بروماكس",
  description: "أدوات احترافية للمهندسين والمقاولين وشركات التشييد",
};

export default function ToolsPage() {
  return <ToolsPageClient />;
}
