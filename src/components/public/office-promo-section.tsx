"use client";

import { Download, Monitor, Shield, Zap, Radio, FileText, HardDrive } from "lucide-react";
import { getOfficePromoConfig } from "@/src/config/office-promo";
import type { Locale, Translation } from "@/src/types/site";

const FEATURE_ICONS = [Zap, Radio, FileText, Monitor, HardDrive, Shield];

type Props = {
  locale: Locale;
  copy: Translation;
};

export default function OfficePromoSection({ locale, copy }: Props) {
  const config = getOfficePromoConfig();
  if (!config.enabled) return null;

  return (
    <section className="office-promo" id="office-app">
      <div className="container office-promo-grid">
        <div className="office-promo-copy">
          <p className="section-kicker">{config.tagline[locale]}</p>
          <h2>{config.productName[locale]}</h2>
          <p className="office-promo-desc">{config.description[locale]}</p>
          <div className="office-promo-features">
            {config.features.map((feature, index) => {
              const Icon = FEATURE_ICONS[index] ?? Zap;
              return (
                <div className="office-promo-feature" key={feature.label[locale]}>
                  <Icon size={16} strokeWidth={2.2} aria-hidden="true" />
                  <span>{feature.label[locale]}</span>
                </div>
              );
            })}
          </div>
          <div className="office-promo-actions">
            <a className="button-primary office-promo-cta" href={config.downloadUrl}>
              <Download size={16} strokeWidth={2.2} aria-hidden="true" />
              {config.ctaLabel[locale]}
            </a>
            <a className="button-quiet office-promo-secondary" href={config.releaseNotesUrl}>
              {config.secondaryCtaLabel[locale]}
            </a>
          </div>
          <div className="office-promo-meta">
            <span>{config.version}</span>
            <span>•</span>
            <span>{config.fileSize}</span>
            <span>•</span>
            <span>{config.supportedWindows}</span>
          </div>
        </div>
        <div className="office-promo-panel">
          <div className="office-promo-orbit orbit-one" />
          <div className="office-promo-orbit orbit-two" />
          <div className="office-promo-panel-content">
            <div className="office-promo-panel-label">{config.productName[locale]}</div>
            <div className="office-promo-panel-version">v{config.version}</div>
            <div className="office-promo-panel-sync">
              <Zap size={20} strokeWidth={2.5} aria-hidden="true" />
              <span>{copy.officeSync}</span>
            </div>
            <div className="office-promo-panel-value">24<span>/</span>7</div>
            <div className="office-promo-panel-tags">
              {config.features.slice(0, 3).map((f) => (
                <span key={f.label[locale]} className="office-promo-tag">{f.icon} {f.label[locale]}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
