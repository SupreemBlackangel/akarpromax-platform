"use client";

import type { ToolDefinition } from "@/src/data/toolsData";

type Props = {
  tool: ToolDefinition;
  locale: string;
  isActive: boolean;
  onSelect: (id: string) => void;
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

export function ToolCard({ tool, locale, isActive, onSelect }: Props) {
  const label = locale === "ar" ? tool.ar : locale === "tr" ? tool.tr : tool.en;
  const desc = locale === "ar" ? tool.descAr : locale === "tr" ? tool.descTr : tool.descEn;
  const statusLabel = STATUS_LABELS[tool.status]?.[locale] ?? tool.status;
  const statusClass = STATUS_CLASSES[tool.status] ?? "tc-badge-muted";

  return (
    <button
      type="button"
      onClick={() => onSelect(tool.id)}
      className={`tc-card${isActive ? " tc-card--active" : ""}`}
      aria-pressed={isActive}
      aria-label={`${label} — ${statusLabel}`}
    >
      <div className="tc-card-header">
        <span className="tc-card-icon" aria-hidden="true">{tool.icon}</span>
        <span className={`tc-badge ${statusClass}`}>{statusLabel}</span>
      </div>
      <h3 className="tc-card-title">{label}</h3>
      <p className="tc-card-desc">{desc}</p>
      <div className="tc-card-footer">
        <span className={`tc-card-action${isActive ? " tc-card-action--active" : ""}`}>
          {isActive
            ? (locale === "ar" ? "جاري الاستخدام" : locale === "tr" ? "Kullanılıyor" : "Active")
            : (locale === "ar" ? "فتح الأداة" : locale === "tr" ? "Aracı aç" : "Open Tool")}
        </span>
      </div>
    </button>
  );
}
