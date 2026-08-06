import { Search } from "lucide-react";
import { cn } from "@/src/utils/cn";

/**
 * Unified search entry point. Only rendered when a real search route exists
 * (SEARCH_ROUTE in src/config/public-navigation.ts); otherwise the header and
 * mobile menu omit it entirely. No new backend, no mock suggestions.
 */
type SearchTriggerProps = {
  href: string;
  label: string;
  className?: string;
};

export default function SearchTrigger({ href, label, className = "" }: SearchTriggerProps) {
  return (
    <a
      href={href}
      aria-label={label}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-[var(--radius-md)] text-[color:var(--color-text-muted)] transition-colors duration-[var(--motion-fast)] hover:bg-[color:var(--color-surface-muted)] hover:text-[color:var(--color-text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]",
        className,
      )}
    >
      <Search aria-hidden="true" className="size-4" />
    </a>
  );
}
