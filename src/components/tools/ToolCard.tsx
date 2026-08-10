"use client";

import Link from "next/link";
import {
  Layers,
  TriangleRight,
  Grid3x3,
  BrickWall,
  CircleDot,
  Paintbrush,
  TrendingDown,
  FlaskConical,
  Ruler,
  Calculator,
  Globe,
  FileOutput,
  FileText,
  Map,
  MapPin,
  type LucideIcon,
} from "lucide-react";
import type { ToolDefinition } from "@/src/data/toolsData";

const TOOL_ICONS: Record<string, LucideIcon> = {
  concrete: Layers,
  beam: TriangleRight,
  tile: Grid3x3,
  brick: BrickWall,
  rebar: CircleDot,
  paint: Paintbrush,
  slope: TrendingDown,
  mix: FlaskConical,
  area: Ruler,
  calculator: Calculator,
  coordinate: Globe,
  points2dxf: FileOutput,
  pdf2word: FileText,
  landmapper: Map,
  findmyland: MapPin,
};

const STATUS_LABELS: Record<string, Record<string, string>> = {
  available: { ar: "متاحة", en: "Available", tr: "Mevcut" },
  new: { ar: "جديدة", en: "New", tr: "Yeni" },
  beta: { ar: "تجريبية", en: "Beta", tr: "Beta" },
  coming_soon: { ar: "قريبًا", en: "Coming Soon", tr: "Yakında" },
};

const STATUS_CLASSES: Record<string, string> = {
  available: "tc-badge-success",
  new: "tc-badge-info",
  beta: "tc-badge-warning",
  coming_soon: "tc-badge-muted",
};

type Props = {
  tool: ToolDefinition;
  locale: string;
};

export function ToolCard({ tool, locale }: Props) {
  const label = locale === "ar" ? tool.ar : locale === "tr" ? tool.tr : tool.en;
  const desc = locale === "ar" ? tool.descAr : locale === "tr" ? tool.descTr : tool.descEn;
  const statusLabel = STATUS_LABELS[tool.status]?.[locale] ?? tool.status;
  const statusClass = STATUS_CLASSES[tool.status] ?? "tc-badge-muted";
  const Icon = TOOL_ICONS[tool.id] ?? Layers;

  return (
    <Link
      href={`/tools?tool=${tool.id}`}
      className="tc-card"
      aria-label={`${label} — ${statusLabel}`}
    >
      <div className="tc-card-header">
        <span className="tc-card-icon-wrap">
          <Icon size={22} strokeWidth={1.8} />
        </span>
        <span className={`tc-badge ${statusClass}`}>{statusLabel}</span>
      </div>
      <h3 className="tc-card-title">{label}</h3>
      <p className="tc-card-desc">{desc}</p>
      <div className="tc-card-footer">
        <span className="tc-card-action">
          {locale === "ar" ? "فتح الأداة" : locale === "tr" ? "Aracı aç" : "Open Tool"}
        </span>
      </div>
    </Link>
  );
}
