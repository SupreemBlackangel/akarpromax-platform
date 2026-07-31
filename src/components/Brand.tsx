import type { Translation } from "@/src/types/site";

export default function Brand({ copy }: { copy: Translation }) {
  return (
    <a className="brand" href="#top" aria-label={copy.brandTitle}>
      <span className="brand-mark">A</span>
      <span className="brand-copy"><strong>{copy.brandTitle}</strong><small>{copy.brandSubtitle}</small></span>
    </a>
  );
}
