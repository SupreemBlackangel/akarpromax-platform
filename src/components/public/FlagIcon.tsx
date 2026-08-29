import * as Flags from "country-flag-icons/react/3x2";
import { Globe } from "lucide-react";

type FlagIconProps = {
  code: string;
  className?: string;
};

/**
 * Renders a real SVG country flag instead of a regional-indicator emoji —
 * Windows has no built-in emoji flags, so 🇸🇦-style codepoints show as plain
 * "SA" text or a box there instead of a flag.
 */
export default function FlagIcon({ code, className = "h-3.5 w-5 rounded-[2px] object-cover" }: FlagIconProps) {
  const Flag = Flags[code.trim().toUpperCase() as keyof typeof Flags];
  if (!Flag) return <Globe aria-hidden="true" className="h-4 w-4 text-[var(--color-text-muted)]" />;
  return <Flag aria-hidden="true" className={className} />;
}
