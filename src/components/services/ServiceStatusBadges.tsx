"use client";

import type { StatusColor } from "@services-client";
import { requestStatusLabel, requestStatusColor, offerStatusLabel, offerStatusColor, orderStatusLabel, orderStatusColor, providerStatusLabel, providerStatusColor } from "@services-client";

const colorClasses: Record<StatusColor, string> = {
  default: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300",
  success: "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  warning: "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
  error: "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300",
  info: "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
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
