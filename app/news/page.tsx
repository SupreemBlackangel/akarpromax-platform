import type { Metadata } from "next";

import NewsPageClient from "@/src/components/news/NewsPageClient";

export const metadata: Metadata = {
  title: "AkarProMax News | آخر الأخبار",
  description: "Latest AkarProMax platform and market news in a public feed.",
};

export default function NewsPage() {
  return <NewsPageClient />;
}
