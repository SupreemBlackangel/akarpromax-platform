/**
 * Shared messaging contract across AkarProMax.
 *
 * ONE messaging core (lib/services/marketplace.ts) serves all seven contexts:
 * GENERAL, PROPERTY, PROPERTY_REQUEST, SERVICE_REQUEST, SERVICE_JOB,
 * PROFESSIONAL and ORGANIZATION. `request` and `order` are the legacy storage
 * values for SERVICE_REQUEST / SERVICE_JOB — kept so existing Service
 * Marketplace history is preserved without migration.
 *
 * Contexts with an explicit participant list (general, property,
 * property_request, professional, organization) are seeded through
 * `startMessageThread` which writes into `service_message_threads` and
 * `service_message_participants`; server-side participant authorization for
 * those contexts resolves against the participants table (plus implicit
 * owner/contact derivation where the owning entity lives in the same runtime
 * DB, e.g. service_provider_profiles for `professional`).
 */

export const MESSAGE_CONTEXT = {
  GENERAL: "general",
  PROPERTY: "property",
  PROPERTY_REQUEST: "property_request",
  SERVICE_REQUEST: "request",
  SERVICE_JOB: "order",
  PROFESSIONAL: "professional",
  ORGANIZATION: "organization",
} as const;

export type MessageContext = (typeof MESSAGE_CONTEXT)[keyof typeof MESSAGE_CONTEXT];

export const MESSAGE_CONTEXTS: readonly MessageContext[] = Object.values(MESSAGE_CONTEXT);

const LEGACY_CONTEXTS = new Set<string>([MESSAGE_CONTEXT.SERVICE_REQUEST, MESSAGE_CONTEXT.SERVICE_JOB]);

export function isMessageContext(value: unknown): value is MessageContext {
  return typeof value === "string" && (MESSAGE_CONTEXTS as readonly string[]).includes(value);
}

export function isLegacyContext(threadType: string): boolean {
  return LEGACY_CONTEXTS.has(threadType);
}

export const MESSAGE_CONTEXT_LABELS: Record<MessageContext, { ar: string; en: string }> = {
  [MESSAGE_CONTEXT.GENERAL]: { ar: "محادثة عامة", en: "General conversation" },
  [MESSAGE_CONTEXT.PROPERTY]: { ar: "عقار", en: "Property" },
  [MESSAGE_CONTEXT.PROPERTY_REQUEST]: { ar: "طلب عقار", en: "Property request" },
  [MESSAGE_CONTEXT.SERVICE_REQUEST]: { ar: "طلب خدمة", en: "Service request" },
  [MESSAGE_CONTEXT.SERVICE_JOB]: { ar: "مهمة خدمة", en: "Service job" },
  [MESSAGE_CONTEXT.PROFESSIONAL]: { ar: "مختص", en: "Professional" },
  [MESSAGE_CONTEXT.ORGANIZATION]: { ar: "شركة / مكتب", en: "Company / Office" },
};

export function messageContextLabel(threadType: string, locale: "ar" | "en" = "ar"): string {
  if (!isMessageContext(threadType)) return threadType;
  const label = MESSAGE_CONTEXT_LABELS[threadType as MessageContext];
  return label[locale] ?? label.en;
}

/**
 * Canonical link for a conversation's related entity. Legacy request/order
 * keep their existing notification targets; participant contexts deep-link
 * into the shared inbox so the conversation itself is always reachable.
 */
export function contextLinkFor(threadType: string, threadId: string): string {
  switch (threadType) {
    case MESSAGE_CONTEXT.SERVICE_REQUEST:
      return `/service-requests/${threadId}`;
    case MESSAGE_CONTEXT.SERVICE_JOB:
      return `/dashboard/services/jobs/${threadId}`;
    case MESSAGE_CONTEXT.PROPERTY:
      return `/properties/${threadId}`;
    case MESSAGE_CONTEXT.PROPERTY_REQUEST:
      return `/property-requests/${threadId}`;
    case MESSAGE_CONTEXT.ORGANIZATION:
      return `/companies/${threadId}`;
    case MESSAGE_CONTEXT.GENERAL:
    case MESSAGE_CONTEXT.PROFESSIONAL:
    default:
      return `/dashboard/services/inbox?open=${encodeURIComponent(`${threadType}:${threadId}`)}`;
  }
}

export function entityTypeFor(threadType: string): string {
  switch (threadType) {
    case MESSAGE_CONTEXT.SERVICE_REQUEST:
      return "service_requests";
    case MESSAGE_CONTEXT.SERVICE_JOB:
      return "service_orders";
    case MESSAGE_CONTEXT.PROPERTY:
      return "property_listings";
    case MESSAGE_CONTEXT.PROPERTY_REQUEST:
      return "property_requests";
    case MESSAGE_CONTEXT.PROFESSIONAL:
      return "service_provider_profiles";
    case MESSAGE_CONTEXT.ORGANIZATION:
      return "organizations";
    case MESSAGE_CONTEXT.GENERAL:
    default:
      return "service_messages";
  }
}
