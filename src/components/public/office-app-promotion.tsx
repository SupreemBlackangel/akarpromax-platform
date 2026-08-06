import type { Translation } from "@/src/types/site";
import Button from "@/src/components/ui/Button";
import PageContainer from "@/src/components/layout/PageContainer";

/**
 * Optional office-app promotion band. Off by default; only rendered when the
 * shell receives an `officePromotion` prop. CTA only navigates when a real
 * destination exists (never a placeholder link, never a dead button).
 */
type OfficeAppPromotionProps = {
  labels: Translation;
  cta: string;
  description: string;
  href?: string;
  onCta?: () => void;
};

export default function OfficeAppPromotion({ labels, cta, description, href, onCta }: OfficeAppPromotionProps) {
  const hasAction = Boolean(href || onCta);
  const action = href ? (
    <a
      href={href}
      className="inline-flex h-12 select-none items-center justify-center gap-[var(--space-2)] whitespace-nowrap rounded-[var(--radius-md)] bg-[color:var(--color-primary)] px-[var(--space-8)] text-[var(--font-size-md)] font-medium leading-none text-[color:var(--color-primary-foreground)] transition-[background-color,box-shadow] duration-[var(--motion-fast)] ease-[var(--easing-standard)] hover:bg-[color:var(--color-primary-hover)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
    >
      {cta}
    </a>
  ) : (
    <Button variant="primary" size="lg" onClick={onCta}>
      {cta}
    </Button>
  );

  return (
    <section aria-label={labels.officeAppAria} className="border-y border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
      <PageContainer className="flex flex-col gap-[var(--space-5)] py-[var(--space-6)] sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-prose text-[var(--font-size-md)] text-[color:var(--color-text-secondary)]">{description}</p>
        {hasAction && action}
      </PageContainer>
    </section>
  );
}
