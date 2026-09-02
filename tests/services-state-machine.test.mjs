import assert from "node:assert/strict";
import test from "node:test";

import {
  ORDER_STATUS, ORDER_FLOW, canTransition,
  PROVIDER_STATUS_VALUES, canTransitionProvider,
  REQUEST_STATUS, canTransitionRequest,
  OFFER_STATUS, canTransitionOffer,
  DISPUTE_STATUS, canTransitionDispute,
} from "../lib/services/constants.ts";
import {
  canTransitionOrder as canonicalCanTransitionOrder,
  canTransitionRequest as canonicalCanTransitionRequest,
  getValidNextOrderStatuses,
  isTerminalOrderStatus,
} from "../lib/services/state-machine.ts";

/**
 * The marketplace carried two transition tables. `state-machine.ts` looked
 * canonical -- five entities, full tables, getValidNext and isTerminal -- and
 * was imported by nothing, verified across app/, lib/ and src/. `constants.ts`
 * held the one the system actually ran on, and only its order guard was ever
 * called.
 *
 * They had drifted apart in ways that matter, so the tables are now derived
 * from a single source.
 */

// ---- the regression the drift caused ---------------------------------------

test("a job in progress can be disputed", () => {
  assert.equal(
    canTransition(ORDER_STATUS.IN_PROGRESS, ORDER_STATUS.DISPUTED),
    true,
    "the live table omitted this, so a customer had to wait for the provider to mark delivery before raising a dispute",
  );
});

test("the ordinary delivery path still works", () => {
  assert.equal(canTransition(ORDER_STATUS.IN_PROGRESS, ORDER_STATUS.DELIVERED), true);
  assert.equal(canTransition(ORDER_STATUS.DELIVERED, ORDER_STATUS.COMPLETED), true);
  assert.equal(canTransition(ORDER_STATUS.WAITING_CUSTOMER_CONFIRMATION, ORDER_STATUS.COMPLETED), true);
});

test("terminal order states stay terminal", () => {
  for (const terminal of [ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED]) {
    assert.deepEqual(ORDER_FLOW[terminal], [], `${terminal} must be an end state`);
    for (const to of Object.values(ORDER_STATUS)) {
      assert.equal(canTransition(terminal, to), false, `${terminal} -> ${to} must be refused`);
    }
  }
});

// ---- one table, not two -----------------------------------------------------

test("the canonical module now agrees with the live one", () => {
  // Previously state-machine.ts allowed IN_PROGRESS -> DISPUTED while
  // constants.ts forbade it, and forbade IN_PROGRESS -> DELIVERED while
  // constants.ts allowed it. Both are now the same table.
  assert.equal(canonicalCanTransitionOrder("in_progress", "disputed"), true);
  assert.equal(canonicalCanTransitionOrder("in_progress", "delivered"), true);
  assert.equal(canonicalCanTransitionOrder("completed", "in_progress"), false);
});

test("publishing a request is legal in the canonical module too", () => {
  // Its old table had only DRAFT -> PENDING_REVIEW, a status no row has ever
  // held, and no DRAFT -> OPEN edge -- so adopting it would have made
  // publishRequest illegal.
  assert.equal(canTransitionRequest(REQUEST_STATUS.DRAFT, REQUEST_STATUS.PUBLISHED), true);
  assert.equal(canonicalCanTransitionRequest("draft", "published"), true);
});

test("a canonical status that several database values share is not a self-transition", () => {
  // waiting_customer_confirmation and in_progress both map to IN_PROGRESS.
  assert.equal(canonicalCanTransitionOrder("in_progress", "in_progress"), false);
  assert.equal(isTerminalOrderStatus("completed"), true);
  assert.ok(getValidNextOrderStatuses("in_progress").includes("DISPUTED"));
});

// ---- provider lifecycle, previously unguarded -------------------------------

test("a suspended provider cannot be returned straight to approved", () => {
  assert.equal(
    canTransitionProvider(PROVIDER_STATUS_VALUES.SUSPENDED, PROVIDER_STATUS_VALUES.APPROVED),
    false,
    "the Verified badge must stand on a review, so reinstatement goes back through one",
  );
  assert.equal(canTransitionProvider(PROVIDER_STATUS_VALUES.SUSPENDED, PROVIDER_STATUS_VALUES.UNDER_REVIEW), true);
});

test("a rejected provider cannot be approved without re-review", () => {
  assert.equal(canTransitionProvider(PROVIDER_STATUS_VALUES.REJECTED, PROVIDER_STATUS_VALUES.APPROVED), false);
  assert.equal(canTransitionProvider(PROVIDER_STATUS_VALUES.REJECTED, PROVIDER_STATUS_VALUES.SUBMITTED), true);
});

test("an approved provider cannot be pushed back to draft", () => {
  assert.equal(canTransitionProvider(PROVIDER_STATUS_VALUES.APPROVED, PROVIDER_STATUS_VALUES.DRAFT), false);
  assert.equal(canTransitionProvider(PROVIDER_STATUS_VALUES.APPROVED, PROVIDER_STATUS_VALUES.SUSPENDED), true);
});

test("the ordinary approval path works", () => {
  assert.equal(canTransitionProvider(PROVIDER_STATUS_VALUES.DRAFT, PROVIDER_STATUS_VALUES.SUBMITTED), true);
  assert.equal(canTransitionProvider(PROVIDER_STATUS_VALUES.SUBMITTED, PROVIDER_STATUS_VALUES.UNDER_REVIEW), true);
  assert.equal(canTransitionProvider(PROVIDER_STATUS_VALUES.UNDER_REVIEW, PROVIDER_STATUS_VALUES.APPROVED), true);
  assert.equal(canTransitionProvider(PROVIDER_STATUS_VALUES.SUBMITTED, PROVIDER_STATUS_VALUES.REJECTED), true);
});

test("an unknown status permits nothing", () => {
  // The old canonical mapper fell back to OPEN for anything unrecognised, which
  // handed unknown values a live state's permissions.
  assert.equal(canTransitionProvider("banana", PROVIDER_STATUS_VALUES.APPROVED), false);
  assert.equal(canTransition("banana", ORDER_STATUS.COMPLETED), false);
  assert.equal(canTransitionOffer("banana", OFFER_STATUS.ACCEPTED), false);
  assert.equal(canTransitionDispute("banana", DISPUTE_STATUS.RESOLVED), false);
});

// ---- offers and disputes ----------------------------------------------------

test("an accepted or withdrawn offer is final", () => {
  assert.equal(canTransitionOffer(OFFER_STATUS.SENT, OFFER_STATUS.ACCEPTED), true);
  assert.equal(canTransitionOffer(OFFER_STATUS.ACCEPTED, OFFER_STATUS.WITHDRAWN), false);
  assert.equal(canTransitionOffer(OFFER_STATUS.WITHDRAWN, OFFER_STATUS.ACCEPTED), false);
});

test("a resolved dispute cannot be reopened through a transition", () => {
  assert.equal(canTransitionDispute(DISPUTE_STATUS.OPEN, DISPUTE_STATUS.IN_REVIEW), true);
  assert.equal(canTransitionDispute(DISPUTE_STATUS.IN_REVIEW, DISPUTE_STATUS.RESOLVED), true);
  assert.equal(canTransitionDispute(DISPUTE_STATUS.RESOLVED, DISPUTE_STATUS.OPEN), false);
});
