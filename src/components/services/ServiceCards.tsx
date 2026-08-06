"use client";

import Link from "next/link";
import Avatar from "@services-ui/Avatar";
import { RequestStatusPill, OfferStatusPill, OrderStatusPill, ProviderStatusPill } from "@services-ui/ServiceStatusBadges";
import { formatMoney, formatDate, nameFor, parseJsonArray, type StatusColor } from "@services-client";
import type { Locale } from "@/src/types/site";

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
};

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
  request_id: string;
  offer_id: string;
  customer_user_id: string;
  provider_user_id: string;
  status: string;
  total_price?: number;
  currency?: string;
  scheduled_date?: string | null;
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
      <span className="text-amber-400 tracking-tight" dir="ltr">{stars.join("")}</span>
      <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{v.toFixed(1)}</span>
      {count != null && <span className="text-xs text-gray-500 dark:text-gray-400">({count})</span>}
    </span>
  );
}

export function CategoryCard({ category, locale }: { category: CategoryRow; locale: Locale }) {
  const name = nameFor(locale, category.name_ar, category.name_en, category.name_tr, category.code);
  const description = nameFor(locale, category.description_ar, category.description_en, category.description_tr, "");
  return (
    <Link
      href={`/services/catalog/${category.code}`}
      className="group block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 transition hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700"
    >
      <div className="flex items-center justify-between">
        <span className="h-11 w-11 grid place-items-center rounded-xl bg-blue-50 dark:bg-blue-900/30 text-2xl">
          {category.icon ?? "🛠"}
        </span>
        <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
          {category.requires_license ? "مرخّص" : "عمومي"}
        </span>
      </div>
      <h3 className="mt-3 font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">{name}</h3>
      {description && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{description}</p>}
      {category.price_min != null && (
        <p className="mt-2 text-sm font-semibold text-blue-600 dark:text-blue-400">
          {formatMoney(category.price_min)} – {formatMoney(category.price_max)}
        </p>
      )}
    </Link>
  );
}

export function ProviderCard({ provider, locale, index = 0 }: { provider: ProviderRow; locale: Locale; index?: number }) {
  const name = provider.business_name || nameFor(locale, provider.display_name_ar, provider.display_name_en, null, "مقدم خدمة");
  const bio = nameFor(locale, provider.bio_ar, provider.bio_en, null, "");
  return (
    <Link
      href={`/providers/${provider.id}`}
      className="block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 transition hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700"
    >
      <div className="flex items-center gap-3">
        <Avatar name={name} src={provider.logo_url} index={index} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-bold text-gray-900 dark:text-white">{name}</h3>
          <RatingStars value={provider.rating_avg} count={provider.rating_count} locale={locale} />
        </div>
        <ProviderStatusPill status={provider.status} locale={locale} />
      </div>
      {bio && <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{bio}</p>}
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800">{provider.jobs_completed ?? 0} أعمال</span>
        <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800">{provider.completion_rate ?? 100}% إنجاز</span>
        <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800">{provider.response_rate ?? 100}% استجابة</span>
      </div>
    </Link>
  );
}

export function RequestCard({ request, locale, categoryMap }: { request: RequestRow; locale: Locale; categoryMap?: Map<string, CategoryRow> }) {
  const category = request.category ?? (categoryMap ? categoryMap.get(request.category_id) : undefined);
  const categoryName = category ? nameFor(locale, (category as CategoryRow).name_ar, (category as CategoryRow).name_en, (category as CategoryRow).name_tr, String(request.category_id).slice(0, 6)) : String(request.category_id).slice(0, 6);
  const answers = parseJsonArray(request.answers);
  const answersSummary = answers.slice(0, 2).map((a) => `${String(a.label ?? a.key)}: ${String(a.value ?? "")}`).join(" • ");
  return (
    <Link
      href={`/service-requests/${request.id}`}
      className="block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 transition hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-bold text-gray-900 dark:text-white">{request.title || request.reference_number || "طلب خدمة"}</h3>
        <RequestStatusPill status={request.status} locale={locale} />
      </div>
      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{request.reference_number} • {formatDate(request.created_at)}</p>
      {request.description && <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{request.description}</p>}
      {answersSummary && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{answersSummary}</p>}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
          {formatMoney(request.budget_min, request.currency)} – {formatMoney(request.budget_max, request.currency)}
        </span>
        <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-300">{categoryName}</span>
      </div>
    </Link>
  );
}

export function OfferCard({ offer, locale, customer = false }: { offer: OfferRow; locale: Locale; customer?: boolean }) {
  const name = offer.business_name || nameFor(locale, offer.display_name_ar, offer.display_name_en, null, "مقدم خدمة");
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {customer ? (
            <>
              <Avatar name={name} src={offer.logo_url} />
              <div className="min-w-0">
                <p className="truncate font-semibold text-gray-900 dark:text-white">{name}</p>
                <RatingStars value={offer.rating_avg} count={offer.rating_count} locale={locale} />
              </div>
            </>
          ) : (
            <p className="font-semibold text-gray-700 dark:text-gray-200">عرض #{String(offer.id).slice(0, 8)}</p>
          )}
        </div>
        <OfferStatusPill status={offer.status} locale={locale} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="block text-xs text-gray-500 dark:text-gray-400">السعر</span>
          <span className="font-bold text-blue-600 dark:text-blue-400">{formatMoney(offer.price, offer.currency)}</span>
        </div>
        <div>
          <span className="block text-xs text-gray-500 dark:text-gray-400">الإجمالي</span>
          <span className="font-bold text-gray-900 dark:text-white">{formatMoney(offer.total_price, offer.currency)}</span>
        </div>
        {offer.duration_text && (
          <div>
            <span className="block text-xs text-gray-500 dark:text-gray-400">المدة</span>
            <span className="text-gray-800 dark:text-gray-100">{offer.duration_text}</span>
          </div>
        )}
        {offer.nearest_date && (
          <div>
            <span className="block text-xs text-gray-500 dark:text-gray-400">أقرب موعد</span>
            <span className="text-gray-800 dark:text-gray-100">{formatDate(offer.nearest_date)}</span>
          </div>
        )}
      </div>
      {offer.offer_notes && <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{offer.offer_notes}</p>}
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
        {Boolean(offer.materials_included) && <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">المواد متضمنة</span>}
        {Boolean(offer.needs_visit) && <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">يتطلب معاينة</span>}
      </div>
    </div>
  );
}

export function JobCard({ job, locale, viewerEmail }: { job: JobRow; locale: Locale; viewerEmail: string | null }) {
  const role = viewerEmail === job.provider_user_id ? "provider" : "customer";
  return (
    <Link
      href={`/dashboard/services/jobs/${job.id}`}
      className="block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 transition hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-bold text-gray-900 dark:text-white">مهمة #{String(job.id).slice(0, 8)}</h3>
        <OrderStatusPill status={job.status} locale={locale} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="block text-xs text-gray-500 dark:text-gray-400">القيمة</span>
          <span className="font-semibold text-blue-600 dark:text-blue-400">{formatMoney(job.total_price, job.currency)}</span>
        </div>
        <div>
          <span className="block text-xs text-gray-500 dark:text-gray-400">الموعد</span>
          <span className="text-gray-800 dark:text-gray-100">{formatDate(job.scheduled_date)}</span>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{role === "provider" ? "عميل" : "مقدم خدمة"} • آخر تحديث {formatDate(job.updated_at)}</span>
        <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800">{job.status === "completed" ? "تم التسليم" : "قيد العمل"}</span>
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
