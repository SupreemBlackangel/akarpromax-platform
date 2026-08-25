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

export const ORDER_FLOW: Record<string, OrderStatus[]> = {
  [ORDER_STATUS.CREATED]: [ORDER_STATUS.ACCEPTED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.ACCEPTED]: [ORDER_STATUS.SCHEDULED, ORDER_STATUS.IN_PROGRESS, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.SCHEDULED]: [ORDER_STATUS.IN_PROGRESS, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.IN_PROGRESS]: [ORDER_STATUS.DELIVERED, ORDER_STATUS.WAITING_CUSTOMER_CONFIRMATION, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.WAITING_CUSTOMER_CONFIRMATION]: [ORDER_STATUS.COMPLETED, ORDER_STATUS.DISPUTED],
  [ORDER_STATUS.DELIVERED]: [ORDER_STATUS.COMPLETED, ORDER_STATUS.WAITING_CUSTOMER_CONFIRMATION, ORDER_STATUS.DISPUTED],
  [ORDER_STATUS.COMPLETED]: [],
  [ORDER_STATUS.CANCELLED]: [],
  [ORDER_STATUS.DISPUTED]: [ORDER_STATUS.COMPLETED],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_FLOW[from]?.includes(to) ?? false;
}

export const DISPUTE_STATUS = {
  OPEN: "open",
  IN_REVIEW: "in_review",
  RESOLVED: "resolved",
  REJECTED: "rejected",
} as const;

export type DisputeStatus = (typeof DISPUTE_STATUS)[keyof typeof DISPUTE_STATUS];

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
