export const SERVICE_ERROR_CODES = {
  INVALID_BODY: "services.invalid_body",
  UNAUTHORIZED: "services.unauthorized",
  FORBIDDEN: "services.forbidden",
  NOT_FOUND: "services.not_found",
  CATEGORY_NOT_FOUND: "services.category_not_found",
  CATEGORY_CONFLICT: "services.category_code_conflict",
  CATEGORY_HAS_CHILDREN: "services.category_has_children",
  CATEGORY_IN_USE: "services.category_in_use",
  LISTING_NOT_FOUND: "services.listing_not_found",
  REQUEST_NOT_FOUND: "services.request_not_found",
  OFFER_NOT_FOUND: "services.offer_not_found",
  ORDER_NOT_FOUND: "services.order_not_found",
  REQUEST_NOT_OPEN: "services.request_not_open",
  OFFER_NOT_SENT: "services.offer_not_sent",
  OFFER_ALREADY_EXISTS: "services.offer_already_exists",
  SELF_OFFER_NOT_ALLOWED: "services.self_offer_not_allowed",
  PROVIDER_NOT_ELIGIBLE: "services.provider_not_eligible",
  DUPLICATE_OFFER: "services.duplicate_offer",
  ORDER_ALREADY_EXISTS: "services.order_already_exists",
  ORDER_STATUS_INVALID: "services.order_status_invalid",
  ONLY_CUSTOMER: "services.only_customer",
  ONLY_PROVIDER: "services.only_provider",
  NOT_PARTICIPANT: "services.not_participant",
  REVIEW_ALREADY_EXISTS: "services.review_already_exists",
  RATING_INVALID: "services.rating_invalid",
  DISPUTE_ALREADY_EXISTS: "services.dispute_already_exists",
  DISPUTE_NOT_FOUND: "services.dispute_not_found",
  INVALID_QUERY: "services.invalid_query",
  // Currency policy: no global default, no OMR/SAR fallback, no substitution.
  CURRENCY_REQUIRED: "services.currency_required",
  CURRENCY_UNSUPPORTED: "services.currency_unsupported",
} as const;

export type ServiceErrorCode = (typeof SERVICE_ERROR_CODES)[keyof typeof SERVICE_ERROR_CODES];

export const LISTING_STATUS = {
  DRAFT: "draft",
  ACTIVE: "active",
  PAUSED: "paused",
  REMOVED: "removed",
} as const;

export type ListingStatus = (typeof LISTING_STATUS)[keyof typeof LISTING_STATUS];

export const REQUEST_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
  RECEIVING_OFFERS: "receiving_offers",
  OFFER_SELECTED: "offer_selected",
  SCHEDULED: "scheduled",
  IN_PROGRESS: "in_progress",
  WAITING_CUSTOMER_CONFIRMATION: "waiting_customer_confirmation",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
  DISPUTED: "disputed",
  // Legacy values kept valid for backward compatibility.
  OPEN: "open",
  OFFERED: "offered",
  ORDERED: "ordered",
} as const;

export type RequestStatus = (typeof REQUEST_STATUS)[keyof typeof REQUEST_STATUS];

export const REQUEST_FLOW: Record<string, RequestStatus[]> = {
  [REQUEST_STATUS.DRAFT]: [REQUEST_STATUS.PUBLISHED, REQUEST_STATUS.CANCELLED],
  [REQUEST_STATUS.PUBLISHED]: [REQUEST_STATUS.RECEIVING_OFFERS, REQUEST_STATUS.OFFER_SELECTED, REQUEST_STATUS.CANCELLED, REQUEST_STATUS.EXPIRED],
  [REQUEST_STATUS.RECEIVING_OFFERS]: [REQUEST_STATUS.OFFER_SELECTED, REQUEST_STATUS.PUBLISHED, REQUEST_STATUS.CANCELLED, REQUEST_STATUS.EXPIRED],
  [REQUEST_STATUS.OFFER_SELECTED]: [REQUEST_STATUS.SCHEDULED, REQUEST_STATUS.CANCELLED, REQUEST_STATUS.EXPIRED],
  [REQUEST_STATUS.SCHEDULED]: [REQUEST_STATUS.IN_PROGRESS, REQUEST_STATUS.CANCELLED, REQUEST_STATUS.EXPIRED],
  [REQUEST_STATUS.IN_PROGRESS]: [REQUEST_STATUS.WAITING_CUSTOMER_CONFIRMATION, REQUEST_STATUS.COMPLETED, REQUEST_STATUS.CANCELLED, REQUEST_STATUS.DISPUTED],
  [REQUEST_STATUS.WAITING_CUSTOMER_CONFIRMATION]: [REQUEST_STATUS.COMPLETED, REQUEST_STATUS.DISPUTED],
  [REQUEST_STATUS.COMPLETED]: [],
  [REQUEST_STATUS.CANCELLED]: [],
  [REQUEST_STATUS.EXPIRED]: [],
  [REQUEST_STATUS.DISPUTED]: [REQUEST_STATUS.COMPLETED],
  // Legacy transitions accepted.
  [REQUEST_STATUS.OPEN]: [REQUEST_STATUS.OFFERED, REQUEST_STATUS.CANCELLED, REQUEST_STATUS.EXPIRED],
  [REQUEST_STATUS.OFFERED]: [REQUEST_STATUS.ORDERED, REQUEST_STATUS.CANCELLED, REQUEST_STATUS.EXPIRED],
  [REQUEST_STATUS.ORDERED]: [],
};

export function canTransitionRequest(from: string, to: string): boolean {
  const fromStatus = Object.values(REQUEST_STATUS).includes(from as RequestStatus) ? (from as RequestStatus) : REQUEST_STATUS.PUBLISHED;
  return REQUEST_FLOW[fromStatus]?.includes(to as RequestStatus) ?? false;
}

export const OFFER_STATUS = {
  SENT: "sent",
  WITHDRAWN: "withdrawn",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
} as const;

export type OfferStatus = (typeof OFFER_STATUS)[keyof typeof OFFER_STATUS];

export const ORDER_STATUS = {
  CREATED: "created",
  ACCEPTED: "accepted",
  SCHEDULED: "scheduled",
  IN_PROGRESS: "in_progress",
  WAITING_CUSTOMER_CONFIRMATION: "waiting_customer_confirmation",
  DELIVERED: "delivered",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  DISPUTED: "disputed",
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

/**
 * Every status on `service_orders` that means work is under way.
 *
 * That one column holds values from TWO vocabularies, because direct bookings
 * and quoted orders share the table:
 *
 *   direct booking only:  pending_provider  confirmed  declined
 *   order only:           created  accepted  waiting_customer_confirmation
 *                         delivered  disputed
 *   shared:               scheduled  in_progress  completed  cancelled
 *
 * Two queries counted "active jobs" with an inline list drawn from the order
 * vocabulary alone, so every direct booking awaiting or accepted by a provider
 * was missing from both -- the admin dashboard AND the customer's and
 * provider's own dashboard, which is the worse of the two: a provider with
 * three bookings in progress was shown zero.
 *
 * Written as literals rather than composed from the two enums to avoid an
 * import cycle (booking.ts already imports this file). `tests/services-active-
 * statuses.test.mjs` asserts the list stays complete against both vocabularies,
 * so it cannot silently fall behind either.
 */
export const ACTIVE_JOB_STATUSES = [
  // orders
  "accepted",
  "waiting_customer_confirmation",
  "delivered",
  // direct bookings
  "pending_provider",
  "confirmed",
  // shared
  "scheduled",
  "in_progress",
] as const;

/** The same list as a SQL literal, so the two queries cannot drift apart. */
export const ACTIVE_JOB_STATUS_SQL = ACTIVE_JOB_STATUSES.map((status) => `'${status}'`).join(",");

export const ORDER_FLOW: Record<string, OrderStatus[]> = {
  [ORDER_STATUS.CREATED]: [ORDER_STATUS.ACCEPTED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.ACCEPTED]: [ORDER_STATUS.SCHEDULED, ORDER_STATUS.IN_PROGRESS, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.SCHEDULED]: [ORDER_STATUS.IN_PROGRESS, ORDER_STATUS.CANCELLED],
  // DISPUTED was missing here while the parallel table in state-machine.ts had
  // it, so under the machine actually in force a customer could not raise a
  // dispute on a job in progress -- they had to wait for the provider to mark it
  // delivered first. That is a product consequence of a merge artefact, not a
  // decision anyone made.
  [ORDER_STATUS.IN_PROGRESS]: [ORDER_STATUS.DELIVERED, ORDER_STATUS.WAITING_CUSTOMER_CONFIRMATION, ORDER_STATUS.CANCELLED, ORDER_STATUS.DISPUTED],
  [ORDER_STATUS.WAITING_CUSTOMER_CONFIRMATION]: [ORDER_STATUS.COMPLETED, ORDER_STATUS.DISPUTED],
  [ORDER_STATUS.DELIVERED]: [ORDER_STATUS.COMPLETED, ORDER_STATUS.WAITING_CUSTOMER_CONFIRMATION, ORDER_STATUS.DISPUTED],
  [ORDER_STATUS.COMPLETED]: [],
  [ORDER_STATUS.CANCELLED]: [],
  [ORDER_STATUS.DISPUTED]: [ORDER_STATUS.COMPLETED],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_FLOW[from]?.includes(to) ?? false;
}

export const PROVIDER_STATUS_VALUES = {
  DRAFT: "draft",
  SUBMITTED: "submitted",
  UNDER_REVIEW: "under_review",
  APPROVED: "approved",
  REJECTED: "rejected",
  SUSPENDED: "suspended",
} as const;

export type ProviderStatusValue = (typeof PROVIDER_STATUS_VALUES)[keyof typeof PROVIDER_STATUS_VALUES];

/**
 * Provider lifecycle.
 *
 * `setProviderStatus` accepted any of the six values from any other, so a
 * reviewer could move a suspended provider straight back to approved, or send an
 * approved one back to draft, without the review that is supposed to stand
 * behind the Verified badge. Reinstating a suspended or rejected provider now
 * goes back through review rather than jumping to approved.
 */
export const PROVIDER_FLOW: Record<string, ProviderStatusValue[]> = {
  [PROVIDER_STATUS_VALUES.DRAFT]: [PROVIDER_STATUS_VALUES.SUBMITTED],
  [PROVIDER_STATUS_VALUES.SUBMITTED]: [PROVIDER_STATUS_VALUES.UNDER_REVIEW, PROVIDER_STATUS_VALUES.APPROVED, PROVIDER_STATUS_VALUES.REJECTED],
  [PROVIDER_STATUS_VALUES.UNDER_REVIEW]: [PROVIDER_STATUS_VALUES.APPROVED, PROVIDER_STATUS_VALUES.REJECTED],
  [PROVIDER_STATUS_VALUES.APPROVED]: [PROVIDER_STATUS_VALUES.SUSPENDED, PROVIDER_STATUS_VALUES.UNDER_REVIEW],
  [PROVIDER_STATUS_VALUES.REJECTED]: [PROVIDER_STATUS_VALUES.SUBMITTED, PROVIDER_STATUS_VALUES.UNDER_REVIEW],
  [PROVIDER_STATUS_VALUES.SUSPENDED]: [PROVIDER_STATUS_VALUES.UNDER_REVIEW, PROVIDER_STATUS_VALUES.REJECTED],
};

export function canTransitionProvider(from: string, to: string): boolean {
  return PROVIDER_FLOW[from]?.includes(to as ProviderStatusValue) ?? false;
}

export const OFFER_FLOW: Record<string, OfferStatus[]> = {
  [OFFER_STATUS.SENT]: [OFFER_STATUS.ACCEPTED, OFFER_STATUS.REJECTED, OFFER_STATUS.WITHDRAWN],
  [OFFER_STATUS.ACCEPTED]: [],
  [OFFER_STATUS.REJECTED]: [],
  [OFFER_STATUS.WITHDRAWN]: [],
};

export function canTransitionOffer(from: string, to: string): boolean {
  return OFFER_FLOW[from]?.includes(to as OfferStatus) ?? false;
}

export const DISPUTE_STATUS = {
  OPEN: "open",
  IN_REVIEW: "in_review",
  RESOLVED: "resolved",
  REJECTED: "rejected",
} as const;

export type DisputeStatus = (typeof DISPUTE_STATUS)[keyof typeof DISPUTE_STATUS];

export const DISPUTE_FLOW: Record<string, DisputeStatus[]> = {
  [DISPUTE_STATUS.OPEN]: [DISPUTE_STATUS.IN_REVIEW, DISPUTE_STATUS.RESOLVED, DISPUTE_STATUS.REJECTED],
  [DISPUTE_STATUS.IN_REVIEW]: [DISPUTE_STATUS.RESOLVED, DISPUTE_STATUS.REJECTED],
  [DISPUTE_STATUS.RESOLVED]: [],
  [DISPUTE_STATUS.REJECTED]: [],
};

export function canTransitionDispute(from: string, to: string): boolean {
  return DISPUTE_FLOW[from]?.includes(to as DisputeStatus) ?? false;
}

export const UNIT_TYPES = ["hour", "day", "project", "fixed"] as const;
export type UnitType = (typeof UNIT_TYPES)[number];

export function isListingStatus(value: unknown): value is ListingStatus {
  return Object.values(LISTING_STATUS).includes(value as ListingStatus);
}

export function isRequestStatus(value: unknown): value is RequestStatus {
  return Object.values(REQUEST_STATUS).includes(value as RequestStatus);
}

export function isOrderStatus(value: unknown): value is OrderStatus {
  return Object.values(ORDER_STATUS).includes(value as OrderStatus);
}

export function isDisputeStatus(value: unknown): value is DisputeStatus {
  return Object.values(DISPUTE_STATUS).includes(value as DisputeStatus);
}

export function isUnitType(value: unknown): value is UnitType {
  return UNIT_TYPES.includes(value as UnitType);
}
