import type { Translation } from "@/src/types/site";

/**
 * Screen-reader live region for future toast messaging. Visually hidden to
 * avoid layout impact; the shell exposes no toast API yet, so the region sits
 * empty until a consumer (Phase 2 scope) wires it.
 */
type ToastRegionProps = {
  labels: Translation;
};

export default function ToastRegion({ labels }: ToastRegionProps) {
  return (
    <div aria-live="polite" role="region" aria-label={labels.toastAria} className="sr-only" />
  );
}
