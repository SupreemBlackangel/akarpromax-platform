import type { Translation } from "@/src/types/site";
import BrandMark from "@/src/components/ui/BrandMark";

export default function Brand({ copy }: { copy: Translation }) {
  return (
    <a className="brand" href="#main-content" aria-label={copy.brandTitle}>
      <BrandMark size="md" name={copy.brandTitle} subtitle={copy.brandSubtitle} />
    </a>
  );
}
