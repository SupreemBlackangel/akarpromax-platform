"use client";

import { useState } from "react";

type Props = {
  logoUrl: string | null;
  name: string;
  countryCode: string;
  compact?: boolean;
};

export default function SponsorIdentity({ logoUrl, name, countryCode, compact = false }: Props) {
  const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null);

  if (logoUrl && logoUrl !== failedLogoUrl) {
    return <img className={`sponsor-logo-image${compact ? " sponsor-logo-small" : ""}`} src={logoUrl} alt={name} decoding="async" onError={() => setFailedLogoUrl(logoUrl)} />;
  }

  const initial = Array.from(name.trim())[0] || "S";
  return (
    <div className={`sponsor-logo sponsor-logo-fallback${compact ? " sponsor-logo-small" : ""}`} role="img" aria-label={name}>
      <span>{initial}</span>
      {!compact && <strong>{name}</strong>}
      <small>{countryCode.toUpperCase()}</small>
    </div>
  );
}
