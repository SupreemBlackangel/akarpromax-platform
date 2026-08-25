import type { Metadata } from "next";

import LegalCenterClient from "@/src/components/legal/LegalCenterClient";
import { LEGAL_DOCUMENT_MAP } from "@/src/content/legal-center";

type PageProps = { params: Promise<{ slug?: string[] }> };

function getDocument(slug: string[] | undefined) {
  return LEGAL_DOCUMENT_MAP.get((slug ?? []).join("/")) ?? LEGAL_DOCUMENT_MAP.get("")!;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolved = await params;
  const doc = getDocument(resolved.slug);
  return {
    title: `${doc.title} | AkarProMax`,
    description: doc.description,
  };
}

export default async function LegalCenterPage({ params }: PageProps) {
  const resolved = await params;
  return <LegalCenterClient slug={resolved.slug} />;
}
