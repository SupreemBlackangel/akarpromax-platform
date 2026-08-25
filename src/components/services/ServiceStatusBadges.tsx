"use client";

import type { StatusColor } from "@services-client";
import { requestStatusLabel, requestStatusColor, offerStatusLabel, offerStatusColor, orderStatusLabel, orderStatusColor, providerStatusLabel, providerStatusColor } from "@services-client";

const colorClasses: Record<StatusColor, string> = {
  default: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300",
  success: "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  warning: "bg-[var(--accent-soft)] dark:bg-amber-900/30 text-[var(--accent)] dark:text-[var(--accent)]",
  error: "bg-[var(--color-error-soft)] dark:bg-red-900/30 text-[var(--color-error)] dark:text-red-300",
  info: "bg-[var(--color-primary-soft)] dark:bg-blue-900/30 text-[var(--color-primary)] dark:text-[var(--color-primary)]",
};

export function StatusPill({ label, color, className = "" }: { label: string; color: StatusColor; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${colorClasses[color]} ${className}`}>
      {label}
    </span>
  );
}

export function RequestStatusPill({ status, locale, className }: { status: string; locale: "ar" | "en" | "tr"; className?: string }) {
  return <StatusPill label={requestStatusLabel(status, locale)} color={requestStatusColor(status)} className={className} />;
}

export function OfferStatusPill({ status, locale, className }: { status: string; locale: "ar" | "en" | "tr"; className?: string }) {
  return <StatusPill label={offerStatusLabel(status, locale)} color={offerStatusColor(status)} className={className} />;
}

export function OrderStatusPill({ status, locale, className }: { status: string; locale: "ar" | "en" | "tr"; className?: string }) {
  return <StatusPill label={orderStatusLabel(status, locale)} color={orderStatusColor(status)} className={className} />;
}

export function ProviderStatusPill({ status, locale, className }: { status: string; locale: "ar" | "en" | "tr"; className?: string }) {
  return <StatusPill label={providerStatusLabel(status, locale)} color={providerStatusColor(status)} className={className} />;
}
