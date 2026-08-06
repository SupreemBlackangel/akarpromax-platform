export class ServiceError extends Error {
  code: string;
  status: number;

  constructor(code: string, status: number) {
    super(code);
    this.name = "ServiceError";
    this.code = code;
    this.status = status;
  }
}

export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const code = data && typeof data === "object" && "error" in data && typeof (data as { error?: unknown }).error === "string"
      ? (data as { error: string }).error
      : `http_${res.status}`;
    throw new ServiceError(code, res.status);
  }
  return data as T;
}

export type StatusColor = "default" | "success" | "warning" | "error" | "info";

export function requestStatusLabel(status: string, locale: "ar" | "en" | "tr"): string {
  const labels: Record<string, Record<string, string>> = {
    draft: { ar: "مسودة", en: "Draft", tr: "Taslak" },
    published: { ar: "منشور", en: "Published", tr: "Yayınlandı" },
    receiving_offers: { ar: "يستقبل عروضاً", en: "Receiving offers", tr: "Teklif alınıyor" },
    offer_selected: { ar: "تم اختيار عرض", en: "Offer selected", tr: "Teklif seçildi" },
    scheduled: { ar: "مجدد", en: "Scheduled", tr: "Programlandı" },
    in_progress: { ar: "قيد التنفيذ", en: "In progress", tr: "Devam ediyor" },
    waiting_customer_confirmation: { ar: "بانتظار تأكيد العميل", en: "Awaiting confirmation", tr: "Onay bekleniyor" },
    completed: { ar: "مكتمل", en: "Completed", tr: "Tamamlandı" },
    cancelled: { ar: "ملغي", en: "Cancelled", tr: "İptal edildi" },
    expired: { ar: "منتهي", en: "Expired", tr: "Süresi doldu" },
    disputed: { ar: "نزاع", en: "Disputed", tr: "Anlaşmazlık" },
    open: { ar: "مفتوح", en: "Open", tr: "Açık" },
    offered: { ar: "بعروض", en: "Offered", tr: "Teklifli" },
    ordered: { ar: "مطلوب", en: "Ordered", tr: "Sipariş edildi" },
  };
  return labels[status]?.[locale] ?? status;
}

export function requestStatusColor(status: string): StatusColor {
  const map: Record<string, StatusColor> = {
    published: "info",
    receiving_offers: "info",
    offer_selected: "warning",
    scheduled: "warning",
    in_progress: "info",
    waiting_customer_confirmation: "warning",
    completed: "success",
    cancelled: "error",
    expired: "default",
    disputed: "error",
    open: "success",
    offered: "warning",
    ordered: "info",
  };
  return map[status] ?? "default";
}

export function offerStatusLabel(status: string, locale: "ar" | "en" | "tr"): string {
  const labels: Record<string, Record<string, string>> = {
    sent: { ar: "مُرسل", en: "Sent", tr: "Gönderildi" },
    withdrawn: { ar: "مسحوب", en: "Withdrawn", tr: "Geri çekildi" },
    accepted: { ar: "مقبول", en: "Accepted", tr: "Kabul edildi" },
    rejected: { ar: "مرفوض", en: "Rejected", tr: "Reddedildi" },
  };
  return labels[status]?.[locale] ?? status;
}

export function offerStatusColor(status: string): StatusColor {
  const map: Record<string, StatusColor> = { sent: "info", withdrawn: "default", accepted: "success", rejected: "error" };
  return map[status] ?? "default";
}

export function orderStatusLabel(status: string, locale: "ar" | "en" | "tr"): string {
  const labels: Record<string, Record<string, string>> = {
    created: { ar: "منشأ", en: "Created", tr: "Oluşturuldu" },
    accepted: { ar: "مقبول", en: "Accepted", tr: "Kabul edildi" },
    scheduled: { ar: "مجدد", en: "Scheduled", tr: "Programlandı" },
    in_progress: { ar: "قيد التنفيذ", en: "In progress", tr: "Devam ediyor" },
    waiting_customer_confirmation: { ar: "بانتظار تأكيد العميل", en: "Awaiting confirmation", tr: "Onay bekleniyor" },
    delivered: { ar: "تم التسليم", en: "Delivered", tr: "Teslim edildi" },
    completed: { ar: "مكتمل", en: "Completed", tr: "Tamamlandı" },
    cancelled: { ar: "ملغي", en: "Cancelled", tr: "İptal edildi" },
    disputed: { ar: "نزاع", en: "Disputed", tr: "Anlaşmazlık" },
  };
  return labels[status]?.[locale] ?? status;
}

export function orderStatusColor(status: string): StatusColor {
  const map: Record<string, StatusColor> = {
    created: "default",
    accepted: "success",
    scheduled: "warning",
    in_progress: "info",
    waiting_customer_confirmation: "warning",
    delivered: "info",
    completed: "success",
    cancelled: "error",
    disputed: "error",
  };
  return map[status] ?? "default";
}

export function providerStatusLabel(status: string, locale: "ar" | "en" | "tr"): string {
  const labels: Record<string, Record<string, string>> = {
    draft: { ar: "مسودة", en: "Draft", tr: "Taslak" },
    submitted: { ar: "قيد المراجعة", en: "Submitted", tr: "Gönderildi" },
    under_review: { ar: "قيد المراجعة", en: "Under review", tr: "İncelemede" },
    approved: { ar: "معتمد", en: "Approved", tr: "Onaylandı" },
    rejected: { ar: "مرفوض", en: "Rejected", tr: "Reddedildi" },
    suspended: { ar: "موقوف", en: "Suspended", tr: "Askıya alındı" },
  };
  return labels[status]?.[locale] ?? status;
}

export function providerStatusColor(status: string): StatusColor {
  const map: Record<string, StatusColor> = { draft: "default", submitted: "warning", under_review: "warning", approved: "success", rejected: "error", suspended: "error" };
  return map[status] ?? "default";
}

export function formatMoney(value: number | null | undefined, currency = "OMR"): string {
  const n = Number(value ?? 0);
  return `${n.toLocaleString("en-US", { maximumFractionDigits: 0 })} ${currency}`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "?";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function formatTime(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function parseJsonArray(value: unknown): Array<Record<string, unknown>> {
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function nameFor(locale: "ar" | "en" | "tr", valueAr: unknown, valueEn: unknown, valueTr: unknown, fallback = ""): string {
  const map: Record<string, unknown> = { ar: valueAr, en: valueEn, tr: valueTr };
  const value = map[locale];
  return typeof value === "string" && value.trim() ? value : fallback;
}

export function initialFor(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}
