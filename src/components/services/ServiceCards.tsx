"use client";

import Link from "next/link";
import Avatar from "@services-ui/Avatar";
import { RequestStatusPill, OfferStatusPill, OrderStatusPill, ProviderStatusPill } from "@services-ui/ServiceStatusBadges";
import { formatMoney, formatDate, nameFor, parseJsonArray, type StatusColor } from "@services-client";
import type { Locale } from "@/src/types/site";
import {
  Armchair, Axe, BadgeCheck, BriefcaseBusiness, Bug, Building2, Calculator,
  Camera, Construction, Cpu, Droplets, Grid3X3, Hammer, HardHat, Home, KeyRound, Landmark,
  LandPlot, Megaphone, Monitor, MonitorSmartphone, Paintbrush, Plane, Refrigerator, Ruler,
  Scale, SearchCheck, Shield, ShieldCheck, Snowflake, Sparkles, SunMedium, Trees, Truck,
  Umbrella, Waves, Wrench, Zap, type LucideIcon,
} from "lucide-react";

export type CategoryRow = Record<string, unknown> & {
  id: string;
  code: string;
  name_ar?: string | null;
  name_en?: string | null;
  name_tr?: string | null;
  description_ar?: string | null;
  description_en?: string | null;
  description_tr?: string | null;
  icon?: string | null;
  image_url?: string | null;
  requires_license?: number;
  requires_visit?: number;
  price_min?: number | null;
  price_max?: number | null;
  is_active?: number;
  parent_id?: string | null;
  is_featured?: number;
  booking_mode?: "instant" | "quotes" | "both";
  badge_ar?: string | null;
  badge_en?: string | null;
  provider_count?: number;
  open_request_count?: number;
  dynamic_fields_parsed?: Array<Record<string, unknown>>;
};

export type ProviderRow = Record<string, unknown> & {
  id: string;
  user_id: string;
  display_name_ar?: string | null;
  display_name_en?: string | null;
  bio_ar?: string | null;
  bio_en?: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
  business_name?: string | null;
  status: string;
  rating_avg?: number;
  rating_count?: number;
  jobs_completed?: number;
  completion_rate?: number;
  response_rate?: number;
  city_id?: string | null;
  is_business?: number;
  governorate?: string | null;
  is_featured?: number;
  is_accepting_requests?: number;
};

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Armchair, Axe, BriefcaseBusiness, Bug, Building2, BuildingCog: Building2, Calculator, Camera,
  Construction, Cpu, Droplets, Grid3X3, Hammer, HardHat, Home, KeyRound, Landmark,
  LandPlot, Megaphone, Monitor, MonitorSmartphone, Paintbrush, Plane, Refrigerator, Ruler,
  Scale, SearchCheck, Shield, ShieldCheck, Snowflake, Sparkles, SunMedium, Trees, Truck,
  Umbrella, Waves, Wrench, Zap,
};

/**
 * Icon names as the taxonomy stores them, where Lucide spells them otherwise.
 * Everything else converts by shape: "hard-hat" -> "HardHat".
 */
const ICON_ALIASES: Record<string, keyof typeof CATEGORY_ICONS> = {
  "paint-roller": "Paintbrush",
  building: "Building2",
  briefcase: "BriefcaseBusiness",
};

/**
 * The map above is keyed by Lucide's own PascalCase component names, and the
 * database stores kebab-case ("wrench", "hard-hat", "paint-roller"). Every
 * lookup therefore missed and every category on the services hub drew the same
 * fallback wrench. Both spellings resolve now.
 */
function iconFor(name?: string | null) {
  if (!name) return Wrench;
  const raw = name.trim();
  if (CATEGORY_ICONS[raw]) return CATEGORY_ICONS[raw];
  const aliased = ICON_ALIASES[raw.toLowerCase()];
  if (aliased) return CATEGORY_ICONS[aliased];
  const pascal = raw
    .toLowerCase()
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  return CATEGORY_ICONS[pascal] ?? Wrench;
}

export function ServiceCategoryIcon({ name, className = "h-6 w-6" }: { name?: string | null; className?: string }) {
  const Icon = iconFor(name);
  return <Icon aria-hidden="true" className={className} strokeWidth={1.9} />;
}

export type RequestRow = Record<string, unknown> & {
  id: string;
  reference_number?: string | null;
  customer_user_id: string;
  category_id: string;
  title?: string | null;
  description?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
  currency?: string;
  status: string;
  city_id?: string | null;
  short_address?: string | null;
  urgency?: string | null;
  preferred_period?: string | null;
  needs_visit?: number;
  answers?: string | null;
  created_at?: string;
  category?: Record<string, unknown> | null;
};

export type OfferRow = Record<string, unknown> & {
  id: string;
  request_id: string;
  provider_user_id: string;
  price?: number | null;
  currency?: string;
  total_price?: number;
  status: string;
  duration_text?: string | null;
  offer_notes?: string | null;
  terms?: string | null;
  nearest_date?: string | null;
  materials_included?: number;
  material_cost?: number | null;
  labor_cost?: number | null;
  visit_fee?: number | null;
  tax_amount?: number | null;
  created_at?: string;
  display_name_ar?: string | null;
  display_name_en?: string | null;
  rating_avg?: number | null;
  rating_count?: number | null;
  logo_url?: string | null;
  business_name?: string | null;
  revisions?: Array<Record<string, unknown>>;
};

export type JobRow = Record<string, unknown> & {
  id: string;
  request_id?: string | null;
  offer_id?: string | null;
  customer_user_id?: string;
  provider_user_id?: string;
  source_type?: string;
  viewer_role?: string;
  service_title_snapshot?: string | null;
  status: string;
  total_price?: number;
  price?: number;
  price_snapshot?: number;
  currency?: string;
  currency_snapshot?: string;
  scheduled_date?: string | null;
  scheduled_at?: string | null;
  address?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
};

export function RatingStars({ value, count }: { value?: number | null; count?: number | null; locale: Locale }) {
  const v = Number(value ?? 0);
  const filled = Math.round(v);
  const stars = Array.from({ length: 5 }, (_, i) => (i < filled ? "★" : "☆"));
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span className="text-[var(--accent)] tracking-tight" dir="ltr">{stars.join("")}</span>
      <span className="text-xs font-semibold text-[var(--color-text-primary)]">{v.toFixed(1)}</span>
      {count != null && <span className="text-xs text-[var(--color-text-secondary)]">({count})</span>}
    </span>
  );
}

export function CategoryCard({ category, locale }: { category: CategoryRow; locale: Locale }) {
  const name = nameFor(locale, category.name_ar, category.name_en, category.name_tr, category.code);
  const description = nameFor(locale, category.description_ar, category.description_en, category.description_tr, "");
  return (
    <Link
      href={`/services/catalog/${category.code}`}
      className="group relative block overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[var(--color-primary)]/30 hover:shadow-lg hover:shadow-blue-950/5 dark:border-[var(--color-border)] dark:bg-[var(--color-surface)]"
    >
      <div className="flex items-center justify-between">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] transition group-hover:bg-[var(--color-primary)] group-hover:text-white">
          <ServiceCategoryIcon name={category.icon} />
        </span>
        <span className="rounded-full bg-[var(--color-background)] px-2.5 py-1 text-[11px] font-bold text-[var(--color-text-secondary)] dark:bg-[var(--color-surface)] dark:text-[var(--color-text-muted)]">
          {category.booking_mode === "both" || category.booking_mode === "instant" ? "حجز مباشر" : "طلب عروض"}
        </span>
      </div>
      <h3 className="mt-4 font-black text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)] dark:text-white dark:group-hover:text-[var(--color-primary)]">{name}</h3>
      {description && <p className="mt-1.5 min-h-10 text-sm leading-5 text-[var(--color-text-muted)] line-clamp-2 dark:text-[var(--color-text-muted)]">{description}</p>}
      {/* CURRENCY POLICY: service_categories carries price_min/price_max but NO
          currency column, so an indicative price here could only be rendered by
          inventing a platform currency. The monetary display is removed until
          taxonomy/pricing semantics are explicitly designed; non-monetary
          metadata stays. Do not re-add a category currency in this phase. */}
      <div className="mt-4 flex items-center justify-between border-t border-[var(--color-border)] pt-3 text-xs dark:border-[var(--color-border)]">
        <p className="text-[var(--color-text-muted)]">{Number(category.provider_count ?? 0)} محترف</p>
      </div>
    </Link>
  );
}

export function ProviderCard({ provider, locale, index = 0 }: { provider: ProviderRow; locale: Locale; index?: number }) {
  const name = provider.business_name || nameFor(locale, provider.display_name_ar, provider.display_name_en, null, "مقدم خدمة");
  const bio = nameFor(locale, provider.bio_ar, provider.bio_en, null, "");
  return (
    <Link
      href={`/providers/${provider.id}`}
      className="block rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[var(--color-primary)]/30 hover:shadow-lg hover:shadow-blue-950/5 dark:border-[var(--color-border)] dark:bg-[var(--color-surface)]"
    >
      <div className="flex items-center gap-3">
        <Avatar name={name} src={provider.logo_url} index={index} />
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-1.5 truncate font-black text-[var(--color-text-primary)] dark:text-white">{name}{provider.status === "approved" && <BadgeCheck className="h-4 w-4 shrink-0 text-[var(--color-primary)]" aria-label="موثّق" />}</h3>
          <RatingStars value={provider.rating_avg} count={provider.rating_count} locale={locale} />
        </div>
        {provider.is_featured ? <span className="rounded-full bg-[var(--accent-soft)] px-2 py-1 text-[10px] font-black text-[var(--accent)] dark:bg-amber-950/40 dark:text-[var(--accent)]">مميّز</span> : <ProviderStatusPill status={provider.status} locale={locale} />}
      </div>
      {bio && <p className="mt-3 text-sm text-[var(--color-text-secondary)] line-clamp-2">{bio}</p>}
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--color-text-secondary)]">
        {provider.governorate && <span className="px-2 py-0.5 rounded-md bg-[var(--color-surface-muted)]">{provider.governorate}</span>}
        <span className="px-2 py-0.5 rounded-md bg-[var(--color-surface-muted)]">{provider.jobs_completed ?? 0} أعمال</span>
        <span className="px-2 py-0.5 rounded-md bg-[var(--color-surface-muted)]">{provider.completion_rate ?? 100}% إنجاز</span>
        <span className="px-2 py-0.5 rounded-md bg-[var(--color-surface-muted)]">{provider.response_rate ?? 100}% استجابة</span>
      </div>
    </Link>
  );
}

export function RequestCard({ request, locale, categoryMap }: { request: RequestRow; locale: Locale; categoryMap?: Map<string, CategoryRow> }) {
  const category = request.category ?? (categoryMap ? categoryMap.get(request.category_id) : undefined);
  // A caller that cannot resolve the category gets a word, not a database id.
  // The fallback used to be `category_id.slice(0, 6)`, which put "svc-SA" on
  // the card of every request on the services hub — the one page that had the
  // categories loaded and simply never passed the map.
  const unnamed = locale === "ar" ? "خدمة" : locale === "tr" ? "Hizmet" : "Service";
  const categoryName = category
    ? nameFor(locale, (category as CategoryRow).name_ar, (category as CategoryRow).name_en, (category as CategoryRow).name_tr, unnamed)
    : unnamed;
  const answers = parseJsonArray(request.answers);
  const answersSummary = answers.slice(0, 2).map((a) => `${String(a.label ?? a.key)}: ${String(a.value ?? "")}`).join(" • ");
  return (
    <Link
      href={`/service-requests/${request.id}`}
      className="block bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 transition hover:shadow-md hover:border-[var(--color-primary)]/30"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-bold text-[var(--color-text-primary)]">{request.title || request.reference_number || "طلب خدمة"}</h3>
        <RequestStatusPill status={request.status} locale={locale} />
      </div>
      <p className="mt-1 text-xs text-[var(--color-text-muted)]">{request.reference_number} • {formatDate(request.created_at)}</p>
      {request.description && <p className="mt-2 text-sm text-[var(--color-text-secondary)] line-clamp-2">{request.description}</p>}
      {answersSummary && <p className="mt-2 text-xs text-[var(--color-text-secondary)] line-clamp-1">{answersSummary}</p>}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-[var(--color-primary)] dark:text-blue-400">
          {formatMoney(request.budget_min, request.currency)} – {formatMoney(request.budget_max, request.currency)}
        </span>
        <span className="px-2 py-0.5 rounded-md bg-[var(--color-surface-muted)] text-xs text-[var(--color-text-secondary)]">{categoryName}</span>
      </div>
    </Link>
  );
}

export function OfferCard({ offer, locale, customer = false }: { offer: OfferRow; locale: Locale; customer?: boolean }) {
  const name = offer.business_name || nameFor(locale, offer.display_name_ar, offer.display_name_en, null, "مقدم خدمة");
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {customer ? (
            <>
              <Avatar name={name} src={offer.logo_url} />
              <div className="min-w-0">
                <p className="truncate font-semibold text-[var(--color-text-primary)]">{name}</p>
                <RatingStars value={offer.rating_avg} count={offer.rating_count} locale={locale} />
              </div>
            </>
          ) : (
            <p className="font-semibold text-[var(--color-text-primary)]">عرض #{String(offer.id).slice(0, 8)}</p>
          )}
        </div>
        <OfferStatusPill status={offer.status} locale={locale} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="block text-xs text-[var(--color-text-secondary)]">السعر</span>
          <span className="font-bold text-[var(--color-primary)] dark:text-blue-400">{formatMoney(offer.price, offer.currency)}</span>
        </div>
        <div>
          <span className="block text-xs text-[var(--color-text-secondary)]">الإجمالي</span>
          <span className="font-bold text-[var(--color-text-primary)]">{formatMoney(offer.total_price, offer.currency)}</span>
        </div>
        {offer.duration_text && (
          <div>
            <span className="block text-xs text-[var(--color-text-secondary)]">المدة</span>
            <span className="text-[var(--color-text-primary)]">{offer.duration_text}</span>
          </div>
        )}
        {offer.nearest_date && (
          <div>
            <span className="block text-xs text-[var(--color-text-secondary)]">أقرب موعد</span>
            <span className="text-[var(--color-text-primary)]">{formatDate(offer.nearest_date)}</span>
          </div>
        )}
      </div>
      {offer.offer_notes && <p className="mt-3 text-sm text-[var(--color-text-secondary)]">{offer.offer_notes}</p>}
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--color-text-secondary)]">
        {Boolean(offer.materials_included) && <span className="px-2 py-0.5 rounded-md bg-[var(--color-success-soft)] dark:bg-emerald-900/30 text-[var(--color-success)] dark:text-emerald-300">المواد متضمنة</span>}
        {Boolean(offer.needs_visit) && <span className="px-2 py-0.5 rounded-md bg-[var(--accent-soft)] dark:bg-amber-900/30 text-[var(--accent)] dark:text-[var(--accent)]">يتطلب معاينة</span>}
      </div>
    </div>
  );
}

export function JobCard({ job, locale, viewerEmail }: { job: JobRow; locale: Locale; viewerEmail: string | null }) {
  const role = job.viewer_role === "provider" || viewerEmail === job.provider_user_id ? "provider" : "customer";
  return (
    <Link
      href={`/dashboard/services/jobs/${job.id}`}
      className="block bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 transition hover:shadow-md hover:border-[var(--color-primary)]/30"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-bold text-[var(--color-text-primary)]">{job.source_type === "direct_booking" ? job.service_title_snapshot || "حجز مباشر" : `مهمة #${String(job.id).slice(0, 8)}`}</h3>
        <OrderStatusPill status={job.status} locale={locale} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="block text-xs text-[var(--color-text-secondary)]">القيمة</span>
          <span className="font-semibold text-[var(--color-primary)] dark:text-blue-400">{formatMoney(job.price_snapshot ?? job.total_price ?? job.price, job.currency_snapshot ?? job.currency)}</span>
        </div>
        <div>
          <span className="block text-xs text-[var(--color-text-secondary)]">الموعد</span>
          <span className="text-[var(--color-text-primary)]">{formatDate(job.scheduled_at ?? job.scheduled_date)}</span>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
        <span>{role === "provider" ? "عميل" : "مقدم خدمة"} • آخر تحديث {formatDate(job.updated_at)}</span>
        <span className="px-2 py-0.5 rounded-md bg-[var(--color-surface-muted)]">{job.status === "completed" ? "تم التسليم" : "قيد العمل"}</span>
      </div>
    </Link>
  );
}

export function colorFromStatus(status: string): StatusColor {
  const map: Record<string, StatusColor> = {
    draft: "default", published: "info", receiving_offers: "info", offer_selected: "warning",
    scheduled: "warning", in_progress: "info", waiting_customer_confirmation: "warning",
    completed: "success", cancelled: "error", expired: "default", disputed: "error",
  };
  return map[status] ?? "default";
}
