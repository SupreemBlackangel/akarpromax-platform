import assert from "node:assert/strict";
import test from "node:test";

import {
  PROVIDER_STATUS_VALUES,
  PROVIDER_FLOW,
  canTransitionProvider,
} from "../lib/services/constants.ts";

/**
 * Who may become an approved provider, and how.
 *
 * The visibility half of this is checked end to end in
 * scripts/e2e-lifecycle.mjs against an isolated database -- a draft, submitted,
 * under-review or rejected provider is absent from the public directory, an
 * approved one appears, and a suspended one disappears again.
 *
 * The transitions themselves are pure logic and need no running system, so they
 * belong here. Section 38 of the mandate asks specifically that a pending
 * provider cannot publish and a rejected one cannot publish; those are the
 * first two assertions below.
 */

test("a draft provider cannot jump straight to approved", () => {
  // The review step is the whole control. A path around it is the control not
  // existing.
  assert.equal(canTransitionProvider(PROVIDER_STATUS_VALUES.DRAFT, PROVIDER_STATUS_VALUES.APPROVED), false);
});

test("a rejected provider cannot become approved without being resubmitted", () => {
  assert.equal(canTransitionProvider(PROVIDER_STATUS_VALUES.REJECTED, PROVIDER_STATUS_VALUES.APPROVED), false);
  // It may re-enter the queue, which is the intended route back.
  assert.equal(canTransitionProvider(PROVIDER_STATUS_VALUES.REJECTED, PROVIDER_STATUS_VALUES.SUBMITTED), true);
});

test("a suspended provider cannot be quietly reinstated", () => {
  // Suspension is a moderation decision. Undoing it must go back through
  // review, where somebody records why.
  assert.equal(canTransitionProvider(PROVIDER_STATUS_VALUES.SUSPENDED, PROVIDER_STATUS_VALUES.APPROVED), false);
  assert.equal(canTransitionProvider(PROVIDER_STATUS_VALUES.SUSPENDED, PROVIDER_STATUS_VALUES.UNDER_REVIEW), true);
});

test("the intended path through the queue is open", () => {
  assert.equal(canTransitionProvider(PROVIDER_STATUS_VALUES.DRAFT, PROVIDER_STATUS_VALUES.SUBMITTED), true);
  assert.equal(canTransitionProvider(PROVIDER_STATUS_VALUES.SUBMITTED, PROVIDER_STATUS_VALUES.UNDER_REVIEW), true);
  assert.equal(canTransitionProvider(PROVIDER_STATUS_VALUES.SUBMITTED, PROVIDER_STATUS_VALUES.APPROVED), true);
  assert.equal(canTransitionProvider(PROVIDER_STATUS_VALUES.UNDER_REVIEW, PROVIDER_STATUS_VALUES.APPROVED), true);
});

test("an approved provider can be suspended or re-reviewed, and nothing else", () => {
  assert.deepEqual(
    [...PROVIDER_FLOW[PROVIDER_STATUS_VALUES.APPROVED]].sort(),
    [PROVIDER_STATUS_VALUES.SUSPENDED, PROVIDER_STATUS_VALUES.UNDER_REVIEW].sort(),
  );
});

test("an unknown status transitions nowhere", () => {
  // A status the machine does not know must not be a way around it.
  for (const from of ["", "nonsense", "APPROVED", "verified", null, undefined]) {
    assert.equal(canTransitionProvider(from, PROVIDER_STATUS_VALUES.APPROVED), false, String(from));
  }
});

test("no status transitions to itself", () => {
  // Always either a double click or a bug, and treating it as a no-op hides
  // both.
  for (const status of Object.values(PROVIDER_STATUS_VALUES)) {
    assert.equal(canTransitionProvider(status, status), false, status);
  }
});

test("every status the machine knows has a declared destination set", () => {
  // A status missing from the table transitions nowhere at all, which strands
  // any provider who reaches it.
  for (const status of Object.values(PROVIDER_STATUS_VALUES)) {
    assert.ok(PROVIDER_FLOW[status] !== undefined, `${status} has no entry in PROVIDER_FLOW`);
  }
});

test("every destination is itself a known status", () => {
  // A transition to a value nothing else recognises writes a row no other code
  // can read.
  const known = new Set(Object.values(PROVIDER_STATUS_VALUES));
  for (const [from, destinations] of Object.entries(PROVIDER_FLOW)) {
    for (const to of destinations) {
      assert.ok(known.has(to), `${from} -> ${to} is not a known status`);
    }
  }
});

test("approval is reachable from exactly the two review states", () => {
  // Anything else reaching approved would be a way past review.
  const reaching = Object.entries(PROVIDER_FLOW)
    .filter(([, destinations]) => destinations.includes(PROVIDER_STATUS_VALUES.APPROVED))
    .map(([from]) => from)
    .sort();

  assert.deepEqual(reaching, [PROVIDER_STATUS_VALUES.SUBMITTED, PROVIDER_STATUS_VALUES.UNDER_REVIEW].sort());
});
