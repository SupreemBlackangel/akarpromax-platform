import type { Translation } from "@/src/types/site";
import Button from "@/src/components/ui/Button";
import PageContainer from "@/src/components/layout/PageContainer";

/**
 * Cookie consent notice. Presentation only; visibility + persistence live in
 * the shell wrapper (localStorage key `akarpromax-cookie-consent`). Render
 * only when visible so SR users and crawlers never see a dead banner.
 */
type CookieNoticeProps = {
  labels: Translation;
  visible: boolean;
  onAccept: () => void;
  onReject: () => void;
  onManage: () => void;
};

export default function CookieNotice({ labels, visible, onAccept, onReject, onManage }: CookieNoticeProps) {
  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label={labels.cookieTitle}
      className="fixed inset-x-0 bottom-0 z-[var(--layer-toast)] border-t border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-[var(--space-5)] shadow-[var(--shadow-overlay)]"
    >
      <PageContainer className="flex flex-col gap-[var(--space-4)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-[var(--space-2)]">
          <h2 className="text-[var(--font-size-md)] font-semibold text-[color:var(--color-text-primary)]">
            {labels.cookieTitle}
          </h2>
          <p className="max-w-prose text-[var(--font-size-sm)] text-[color:var(--color-text-secondary)]">
            {labels.cookieDescription}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-[var(--space-3)]">
          <Button variant="outline" size="sm" onClick={onManage}>
            {labels.cookieManage}
          </Button>
          <Button variant="outline" size="sm" onClick={onReject}>
            {labels.cookieReject}
          </Button>
          <Button variant="primary" size="sm" onClick={onAccept}>
            {labels.cookieAccept}
          </Button>
        </div>
      </PageContainer>
    </div>
  );
}
