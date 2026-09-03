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
    links: [
      { key: "apply", labelKey: "navApply", href: "/providers/apply" },
      { key: "advertise", labelKey: "navAdvertise", href: "/advertise" },
      { key: "about", labelKey: "navAbout", href: "/about" },
      { key: "contact", labelKey: "navContact", href: "/contact" },
    ],
  },
  {
    key: "legal",
    titleKey: "footerLegalTitle",
    links: [
      { key: "terms", labelKey: "navTerms", href: "/terms" },
      { key: "privacy", labelKey: "navPrivacy", href: "/privacy" },
      // Facebook's App Review checks that a deletion route is reachable by a
      // user, not merely that the page exists, so it is linked here rather than
      // only registered in the app's settings.
      { key: "data-deletion", labelKey: "navDataDeletion", href: "/data-deletion" },
    ],
  },
];

export const FOOTER_CONTACT = {
  email: "info@akarpromax.com",
  mailto: "mailto:info@akarpromax.com",
  locationLabelKey: "contactLocation",
} as const;

/** Populated only when verified external social profiles exist. */
export const FOOTER_SOCIAL: FooterLink[] = [];
