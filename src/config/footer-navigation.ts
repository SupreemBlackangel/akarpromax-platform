import type { TranslationStringKey } from "@/src/types/site";

/**
 * Single source of truth for the public footer.
 * Only routes that actually exist are rendered; legal/social entries are
 * populated once verified targets exist (no placeholder links).
 */
export type FooterLink = {
  key: string;
  labelKey: TranslationStringKey;
  href: string;
  external?: boolean;
};

export type FooterColumn = {
  key: string;
  titleKey: TranslationStringKey;
  links: FooterLink[];
  /** Legal links render automatically once legal pages exist. */
  deferred?: boolean;
};

export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    key: "quick",
    titleKey: "quickTitle",
    links: [
      { key: "home", labelKey: "navHome", href: "/" },
      { key: "services", labelKey: "navServices", href: "/services" },
      { key: "catalog", labelKey: "navCatalog", href: "/services/catalog" },
      { key: "requests", labelKey: "navRequests", href: "/service-requests" },
      { key: "tools", labelKey: "navTools", href: "/tools" },
    ],
  },
  {
    key: "useful",
    titleKey: "usefulTitle",
    links: [{ key: "apply", labelKey: "navApply", href: "/providers/apply" }],
  },
  {
    key: "legal",
    titleKey: "footerLegalTitle",
    links: [],
    deferred: true,
  },
];

export const FOOTER_CONTACT = {
  email: "info@akarpromax.om",
  mailto: "mailto:info@akarpromax.om",
  locationLabelKey: "contactLocation",
} as const;

/** Populated only when verified external social profiles exist. */
export const FOOTER_SOCIAL: FooterLink[] = [];
