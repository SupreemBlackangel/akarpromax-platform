export const SERVICE_ERROR_CODES = {
  INVALID_BODY: "services.invalid_body",
  UNAUTHORIZED: "services.unauthorized",
  FORBIDDEN: "services.forbidden",
  NOT_FOUND: "services.not_found",
  CATEGORY_NOT_FOUND: "services.category_not_found",
  CATEGORY_CONFLICT: "services.category_code_conflict",
  LISTING_NOT_FOUND: "services.listing_not_found",
  REQUEST_NOT_FOUND: "services.request_not_found",
  OFFER_NOT_FOUND: "services.offer_not_found",
  ORDER_NOT_FOUND: "services.order_not_found",
  REQUEST_NOT_OPEN: "services.request_not_open",
  OFFER_NOT_SENT: "services.offer_not_sent",
  OFFER_ALREADY_EXISTS: "services.offer_already_exists",
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
  OPEN: "open",
  OFFERED: "offered",
  ORDERED: "ordered",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
} as const;

export type RequestStatus = (typeof REQUEST_STATUS)[keyof typeof REQUEST_STATUS];

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
  IN_PROGRESS: "in_progress",
  DELIVERED: "delivered",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  DISPUTED: "disputed",
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export const ORDER_FLOW: Record<string, OrderStatus[]> = {
  [ORDER_STATUS.CREATED]: [ORDER_STATUS.ACCEPTED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.ACCEPTED]: [ORDER_STATUS.IN_PROGRESS, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.IN_PROGRESS]: [ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.DELIVERED]: [ORDER_STATUS.COMPLETED, ORDER_STATUS.DISPUTED],
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
