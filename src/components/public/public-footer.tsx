import type { Translation } from "@/src/types/site";
import PageContainer from "@/src/components/layout/PageContainer";
import { FOOTER_COLUMNS, FOOTER_CONTACT, FOOTER_SOCIAL } from "@/src/config/footer-navigation";

/**
 * Public footer, driven entirely by src/config/footer-navigation.ts.
 * Only verified routes are rendered; legal/social/social columns stay hidden
 * until their config entries are populated (no placeholder links).
 */
type PublicFooterProps = {
  labels: Translation;
};

export default function PublicFooter({ labels }: PublicFooterProps) {
  const visibleColumns = FOOTER_COLUMNS.filter((column) => column.links.length > 0);

  return (
    <footer className="border-t border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)]">
      <PageContainer className="py-[var(--space-8)]">
        <div className="grid gap-[var(--space-8)] sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-[var(--space-3)]">
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- presentational SSR-safe brand link */}
            <a href="/" aria-label={labels.brandTitle} className="inline-flex items-center gap-[var(--space-2)] focus-visible:outline-none focus-visible:rounded-[var(--radius-sm)] focus-visible:shadow-[var(--shadow-focus)]">
              <span className="flex size-8 items-center justify-center rounded-[var(--radius-md)] bg-[color:var(--color-primary)] font-bold text-[color:var(--color-primary-foreground)]" aria-hidden="true">
                A
              </span>
              <span className="flex flex-col leading-tight">
                <strong className="text-[var(--font-size-md)] font-semibold text-[color:var(--color-text-primary)]">{labels.brandTitle}</strong>
                <small className="text-[var(--font-size-xs)] text-[color:var(--color-text-muted)]">{labels.brandSubtitle}</small>
              </span>
            </a>
            <p className="max-w-prose text-[var(--font-size-sm)] text-[color:var(--color-text-secondary)]">
              {labels.footerDescription}
            </p>
          </div>

          {visibleColumns.map((column) => (
            <nav key={column.key} aria-label={labels[column.titleKey]}>
              <h3 className="mb-[var(--space-3)] text-[var(--font-size-sm)] font-semibold text-[color:var(--color-text-primary)]">
                {labels[column.titleKey]}
              </h3>
              <ul className="flex flex-col gap-[var(--space-2)]">
                {column.links.map((link) => (
                  <li key={link.key}>
                    <a
                      href={link.href}
                      className="text-[var(--font-size-sm)] text-[color:var(--color-text-secondary)] transition-colors duration-[var(--motion-fast)] hover:text-[color:var(--color-primary)] focus-visible:outline-none focus-visible:rounded-[var(--radius-sm)] focus-visible:shadow-[var(--shadow-focus)]"
                    >
                      {labels[link.labelKey]}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div className="flex flex-col gap-[var(--space-3)]">
            <h3 className="text-[var(--font-size-sm)] font-semibold text-[color:var(--color-text-primary)]">
              {labels.contactTitle}
            </h3>
            <address className="flex flex-col gap-[var(--space-2)] not-italic">
              <span className="text-[var(--font-size-sm)] text-[color:var(--color-text-secondary)]">
                {labels.contactLocation}
              </span>
              <a
                href={FOOTER_CONTACT.mailto}
                className="text-[var(--font-size-sm)] text-[color:var(--color-text-secondary)] transition-colors duration-[var(--motion-fast)] hover:text-[color:var(--color-primary)] focus-visible:outline-none focus-visible:rounded-[var(--radius-sm)] focus-visible:shadow-[var(--shadow-focus)]"
              >
                {labels.contactEmail}
              </a>
            </address>
          </div>
        </div>

        {FOOTER_SOCIAL.length > 0 && (
          <ul className="mt-[var(--space-8)] flex flex-wrap items-center gap-[var(--space-4)] border-t border-[color:var(--color-border)] pt-[var(--space-5)]">
            {FOOTER_SOCIAL.map((link) => (
              <li key={link.key}>
                <a
                  href={link.href}
                  className="text-[var(--font-size-sm)] text-[color:var(--color-text-secondary)] transition-colors duration-[var(--motion-fast)] hover:text-[color:var(--color-primary)] focus-visible:outline-none focus-visible:rounded-[var(--radius-sm)] focus-visible:shadow-[var(--shadow-focus)]"
                >
                  {labels[link.labelKey]}
                </a>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-[var(--space-8)] flex flex-col gap-[var(--space-2)] border-t border-[color:var(--color-border)] pt-[var(--space-5)] sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[var(--font-size-xs)] text-[color:var(--color-text-muted)]">{labels.footerRights}</p>
          <p className="text-[var(--font-size-xs)] text-[color:var(--color-text-muted)]">{labels.footerTagline}</p>
        </div>
      </PageContainer>
    </footer>
  );
}
