import {
  LayoutDashboard, Users, ShieldCheck, Sparkles, Home, Building2, Megaphone,
  Gavel, Newspaper, Languages, Monitor, TrendingUp, Link2, ScrollText, Settings,
  BarChart3, Bell, Star, ClipboardList, Briefcase, Wrench, FileText, UsersRound,
  CheckCircle2, Scale, FolderTree, Plus, MapPin, MessageSquare, UserCog,
  Search, Inbox, Target, ListChecks, HardHat, ShoppingBag, type LucideIcon,
} from "lucide-react";

/**
 * Central icon registry — the platform's single sanctioned icon system.
 *
 * Config files (sidebars, nav tables) reference an icon by NAME instead of
 * embedding an emoji or a Unicode glyph, so every icon renders as an SVG that
 * inherits currentColor (works in both themes), keeps one stroke weight, and
 * uses a standard size scale. Emoji/dingbats were inconsistent across fonts,
 * couldn't inherit token colors, and misaligned with lucide icons beside them.
 */

export const ICONS = {
  dashboard: LayoutDashboard,
  users: Users,
  roles: ShieldCheck,
  services: Sparkles,
  property: Home,
  company: Building2,
  advertisers: Megaphone,
  auction: Gavel,
  news: Newspaper,
  i18n: Languages,
  ads: Monitor,
  reports: TrendingUp,
  integration: Link2,
  audit: ScrollText,
  settings: Settings,
  analytics: BarChart3,
  notifications: Bell,
  reviews: Star,
  requests: ClipboardList,
  offers: Briefcase,
  jobs: Wrench,
  documents: FileText,
  providers: UsersRound,
  completed: CheckCircle2,
  disputes: Scale,
  categories: FolderTree,
  add: Plus,
  nearby: MapPin,
  messages: MessageSquare,
  profile: UserCog,
  search: Search,
  inbox: Inbox,
  matched: Target,
  list: ListChecks,
  worker: HardHat,
  market: ShoppingBag,
} as const;

export type IconName = keyof typeof ICONS;

/** Standard sizes so icons never drift between contexts. */
const SIZES = { xs: 14, sm: 16, md: 18, lg: 20, xl: 24 } as const;

export type IconSize = keyof typeof SIZES;

export function isIconName(value: unknown): value is IconName {
  return typeof value === "string" && value in ICONS;
}

export default function Icon({
  name,
  size = "md",
  className = "",
  strokeWidth = 2,
  label,
}: {
  name: IconName;
  size?: IconSize;
  className?: string;
  strokeWidth?: number;
  /** Provide only for a standalone icon that carries meaning on its own. */
  label?: string;
}) {
  const Glyph: LucideIcon = ICONS[name];
  return (
    <Glyph
      size={SIZES[size]}
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
    />
  );
}
