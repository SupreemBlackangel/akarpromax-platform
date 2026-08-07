export type CanonicalRequestStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "OPEN"
  | "RECEIVING_OFFERS"
  | "OFFER_ACCEPTED"
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "REJECTED"
  | "EXPIRED"
  | "DISPUTED";

export type CanonicalOfferStatus =
  | "SENT"
  | "WITHDRAWN"
  | "ACCEPTED"
  | "REJECTED"
  | "REVISED"
  | "EXPIRED";

export type CanonicalOrderStatus =
  | "CREATED"
  | "ACCEPTED"
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "WAITING_CUSTOMER_CONFIRMATION"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED"
  | "DISPUTED";

export type CanonicalProviderStatus =
  | "DRAFT"
  | "PENDING"
  | "UNDER_REVIEW"
  | "VERIFIED"
  | "REJECTED"
  | "SUSPENDED";

export type CanonicalDisputeStatus =
  | "OPEN"
  | "UNDER_REVIEW"
  | "WAITING_CUSTOMER"
  | "WAITING_PROVIDER"
  | "RESOLVED"
  | "REJECTED"
  | "CLOSED";

const REQUEST_STATUS_MAP: Record<string, CanonicalRequestStatus> = {
  draft: "DRAFT",
  published: "OPEN",
  receiving_offers: "RECEIVING_OFFERS",
  offer_selected: "OFFER_ACCEPTED",
  scheduled: "SCHEDULED",
  in_progress: "IN_PROGRESS",
  waiting_customer_confirmation: "IN_PROGRESS",
  completed: "COMPLETED",
  cancelled: "CANCELLED",
  expired: "EXPIRED",
  disputed: "DISPUTED",
  open: "OPEN",
  offered: "RECEIVING_OFFERS",
  ordered: "OFFER_ACCEPTED",
};

const OFFER_STATUS_MAP: Record<string, CanonicalOfferStatus> = {
  sent: "SENT",
  withdrawn: "WITHDRAWN",
  accepted: "ACCEPTED",
  rejected: "REJECTED",
  revised: "REVISED",
};

const ORDER_STATUS_MAP: Record<string, CanonicalOrderStatus> = {
  created: "CREATED",
  accepted: "ACCEPTED",
  scheduled: "SCHEDULED",
  in_progress: "IN_PROGRESS",
  waiting_customer_confirmation: "WAITING_CUSTOMER_CONFIRMATION",
  delivered: "DELIVERED",
  completed: "COMPLETED",
  cancelled: "CANCELLED",
  disputed: "DISPUTED",
};

const PROVIDER_STATUS_MAP: Record<string, CanonicalProviderStatus> = {
  draft: "DRAFT",
  submitted: "PENDING",
  under_review: "UNDER_REVIEW",
  approved: "VERIFIED",
  rejected: "REJECTED",
  suspended: "SUSPENDED",
};

const DISPUTE_STATUS_MAP: Record<string, CanonicalDisputeStatus> = {
  open: "OPEN",
  in_review: "UNDER_REVIEW",
  waiting_customer: "WAITING_CUSTOMER",
  waiting_provider: "WAITING_PROVIDER",
  resolved: "RESOLVED",
  rejected: "REJECTED",
  closed: "CLOSED",
};

const REQUEST_TRANSITIONS: Record<CanonicalRequestStatus, CanonicalRequestStatus[]> = {
  DRAFT: ["PENDING_REVIEW", "CANCELLED"],
  PENDING_REVIEW: ["OPEN", "CANCELLED", "REJECTED"],
  OPEN: ["RECEIVING_OFFERS", "CANCELLED", "EXPIRED"],
  RECEIVING_OFFERS: ["OFFER_ACCEPTED", "OPEN", "CANCELLED", "EXPIRED"],
  OFFER_ACCEPTED: ["SCHEDULED", "IN_PROGRESS", "CANCELLED"],
  SCHEDULED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED", "DISPUTED"],
  COMPLETED: [],
  CANCELLED: [],
  REJECTED: [],
  EXPIRED: [],
  DISPUTED: ["COMPLETED", "CANCELLED"],
};

const OFFER_TRANSITIONS: Record<CanonicalOfferStatus, CanonicalOfferStatus[]> = {
  SENT: ["ACCEPTED", "REJECTED", "WITHDRAWN", "REVISED", "EXPIRED"],
  WITHDRAWN: [],
  ACCEPTED: [],
  REJECTED: [],
  REVISED: ["ACCEPTED", "REJECTED", "WITHDRAWN", "EXPIRED"],
  EXPIRED: [],
};

const ORDER_TRANSITIONS: Record<CanonicalOrderStatus, CanonicalOrderStatus[]> = {
  CREATED: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["SCHEDULED", "IN_PROGRESS", "CANCELLED"],
  SCHEDULED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["WAITING_CUSTOMER_CONFIRMATION", "COMPLETED", "CANCELLED", "DISPUTED"],
  WAITING_CUSTOMER_CONFIRMATION: ["COMPLETED", "DISPUTED"],
  DELIVERED: ["COMPLETED", "WAITING_CUSTOMER_CONFIRMATION", "DISPUTED"],
  COMPLETED: [],
  CANCELLED: [],
  DISPUTED: ["COMPLETED", "CANCELLED"],
};

const PROVIDER_TRANSITIONS: Record<CanonicalProviderStatus, CanonicalProviderStatus[]> = {
  DRAFT: ["PENDING"],
  PENDING: ["UNDER_REVIEW", "REJECTED"],
  UNDER_REVIEW: ["VERIFIED", "REJECTED"],
  VERIFIED: ["SUSPENDED"],
  REJECTED: ["PENDING"],
  SUSPENDED: ["VERIFIED", "REJECTED"],
};

const DISPUTE_TRANSITIONS: Record<CanonicalDisputeStatus, CanonicalDisputeStatus[]> = {
  OPEN: ["UNDER_REVIEW", "WAITING_CUSTOMER", "WAITING_PROVIDER", "REJECTED", "CLOSED"],
  UNDER_REVIEW: ["WAITING_CUSTOMER", "WAITING_PROVIDER", "RESOLVED", "REJECTED"],
  WAITING_CUSTOMER: ["RESOLVED", "REJECTED", "UNDER_REVIEW"],
  WAITING_PROVIDER: ["RESOLVED", "REJECTED", "UNDER_REVIEW"],
  RESOLVED: ["CLOSED"],
  REJECTED: ["CLOSED"],
  CLOSED: [],
};

export function toCanonicalRequestStatus(status: string): CanonicalRequestStatus {
  return REQUEST_STATUS_MAP[status] ?? ("OPEN" as CanonicalRequestStatus);
}

export function toCanonicalOfferStatus(status: string): CanonicalOfferStatus {
  return OFFER_STATUS_MAP[status] ?? ("SENT" as CanonicalOfferStatus);
}

export function toCanonicalOrderStatus(status: string): CanonicalOrderStatus {
  return ORDER_STATUS_MAP[status] ?? ("CREATED" as CanonicalOrderStatus);
}

export function toCanonicalProviderStatus(status: string): CanonicalProviderStatus {
  return PROVIDER_STATUS_MAP[status] ?? ("DRAFT" as CanonicalProviderStatus);
}

export function toCanonicalDisputeStatus(status: string): CanonicalDisputeStatus {
  return DISPUTE_STATUS_MAP[status] ?? ("OPEN" as CanonicalDisputeStatus);
}

export function canTransitionRequest(from: string, to: string): boolean {
  const canonicalFrom = toCanonicalRequestStatus(from);
  const canonicalTo = toCanonicalRequestStatus(to);
  return REQUEST_TRANSITIONS[canonicalFrom]?.includes(canonicalTo) ?? false;
}

export function canTransitionOffer(from: string, to: string): boolean {
  const canonicalFrom = toCanonicalOfferStatus(from);
  const canonicalTo = toCanonicalOfferStatus(to);
  return OFFER_TRANSITIONS[canonicalFrom]?.includes(canonicalTo) ?? false;
}

export function canTransitionOrder(from: string, to: string): boolean {
  const canonicalFrom = toCanonicalOrderStatus(from);
  const canonicalTo = toCanonicalOrderStatus(to);
  return ORDER_TRANSITIONS[canonicalFrom]?.includes(canonicalTo) ?? false;
}

export function canTransitionProvider(from: string, to: string): boolean {
  const canonicalFrom = toCanonicalProviderStatus(from);
  const canonicalTo = toCanonicalProviderStatus(to);
  return PROVIDER_TRANSITIONS[canonicalFrom]?.includes(canonicalTo) ?? false;
}

export function canTransitionDispute(from: string, to: string): boolean {
  const canonicalFrom = toCanonicalDisputeStatus(from);
  const canonicalTo = toCanonicalDisputeStatus(to);
  return DISPUTE_TRANSITIONS[canonicalFrom]?.includes(canonicalTo) ?? false;
}

export function getValidNextRequestStatuses(status: string): CanonicalRequestStatus[] {
  const canonical = toCanonicalRequestStatus(status);
  return REQUEST_TRANSITIONS[canonical] ?? [];
}

export function getValidNextOfferStatuses(status: string): CanonicalOfferStatus[] {
  const canonical = toCanonicalOfferStatus(status);
  return OFFER_TRANSITIONS[canonical] ?? [];
}

export function getValidNextOrderStatuses(status: string): CanonicalOrderStatus[] {
  const canonical = toCanonicalOrderStatus(status);
  return ORDER_TRANSITIONS[canonical] ?? [];
}

export function getValidNextProviderStatuses(status: string): CanonicalProviderStatus[] {
  const canonical = toCanonicalProviderStatus(status);
  return PROVIDER_TRANSITIONS[canonical] ?? [];
}

export function getValidNextDisputeStatuses(status: string): CanonicalDisputeStatus[] {
  const canonical = toCanonicalDisputeStatus(status);
  return DISPUTE_TRANSITIONS[canonical] ?? [];
}

export function isTerminalRequestStatus(status: string): boolean {
  const canonical = toCanonicalRequestStatus(status);
  return REQUEST_TRANSITIONS[canonical]?.length === 0;
}

export function isTerminalOfferStatus(status: string): boolean {
  const canonical = toCanonicalOfferStatus(status);
  return OFFER_TRANSITIONS[canonical]?.length === 0;
}

export function isTerminalOrderStatus(status: string): boolean {
  const canonical = toCanonicalOrderStatus(status);
  return ORDER_TRANSITIONS[canonical]?.length === 0;
}

export function isTerminalProviderStatus(status: string): boolean {
  const canonical = toCanonicalProviderStatus(status);
  return PROVIDER_TRANSITIONS[canonical]?.length === 0;
}

export function isTerminalDisputeStatus(status: string): boolean {
  const canonical = toCanonicalDisputeStatus(status);
  return DISPUTE_TRANSITIONS[canonical]?.length === 0;
}