/**
 * Canonical, UPPERCASE status vocabulary for the services marketplace, and the
 * transition guards expressed in it.
 *
 * This module used to carry its OWN transition tables, parallel to the ones in
 * `constants.ts`. Nothing imported it -- verified across app/, lib/ and src/ --
 * so the tables never ran, and they had silently drifted apart from the ones
 * that do:
 *
 *   - For an order IN_PROGRESS, this file allowed DISPUTED and forbade
 *     DELIVERED; `constants.ts` did the exact opposite.
 *   - Its request table had no DRAFT -> OPEN edge at all, only
 *     DRAFT -> PENDING_REVIEW, and PENDING_REVIEW is a status no database row
 *     has ever held. Adopting these tables would have made publishing a request
 *     illegal.
 *
 * A second table that disagrees with the live one is worse than no table: it
 * looks authoritative and is wrong. The vocabulary and the mapping stay here,
 * because presenting a status to a person is a real need and the lowercase
 * database values are not what you want on a screen. The transition rules now
 * come from `constants.ts`, which is the one the system actually runs on.
 */
import {
  REQUEST_FLOW,
  OFFER_FLOW,
  ORDER_FLOW,
  PROVIDER_FLOW,
  DISPUTE_FLOW,
} from "@services/constants";

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

/**
 * Derive the canonical transition table for one entity from the live lowercase
 * flow, so there is exactly one set of rules in the system. Several database
 * values can share a canonical status (`waiting_customer_confirmation` and
 * `in_progress` are both IN_PROGRESS), so the edges are unioned.
 */
function canonicalFlow<T extends string>(
  flow: Record<string, string[]>,
  toCanonical: (status: string) => T,
): Record<string, T[]> {
  const table: Record<string, Set<T>> = {};
  for (const [from, targets] of Object.entries(flow)) {
    const key = toCanonical(from);
    const set = (table[key] ??= new Set<T>());
    for (const to of targets) {
      const canonicalTo = toCanonical(to);
      // A pair of database values that collapse to the same canonical status is
      // not a transition; recording it would make a terminal state look live.
      if (canonicalTo !== key) set.add(canonicalTo);
    }
  }
  return Object.fromEntries(Object.entries(table).map(([key, set]) => [key, [...set]]));
}

const REQUEST_TRANSITIONS = canonicalFlow(REQUEST_FLOW, toCanonicalRequestStatus);
const OFFER_TRANSITIONS = canonicalFlow(OFFER_FLOW, toCanonicalOfferStatus);
const ORDER_TRANSITIONS = canonicalFlow(ORDER_FLOW, toCanonicalOrderStatus);
const PROVIDER_TRANSITIONS = canonicalFlow(PROVIDER_FLOW, toCanonicalProviderStatus);
const DISPUTE_TRANSITIONS = canonicalFlow(DISPUTE_FLOW, toCanonicalDisputeStatus);

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