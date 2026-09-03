import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { ACTIVE_JOB_STATUSES, ACTIVE_JOB_STATUS_SQL, ORDER_STATUS } from "../lib/services/constants.ts";
import { DIRECT_BOOKING_STATUS } from "../lib/services/booking.ts";

const read = (rel) => readFile(new URL(`../${rel}`, import.meta.url), "utf8");

/**
 * Which statuses mean "work is under way".
 *
 * `service_orders.status` holds values from TWO vocabularies, because direct
 * bookings and quoted orders share the table:
 *
 *   direct booking only:  pending_provider  confirmed  declined
 *   order only:           created  accepted  waiting_customer_confirmation
 *                         delivered  disputed
 *   shared:               scheduled  in_progress  completed  cancelled
 *
 * Two queries counted active jobs with an inline list drawn from the order
 * vocabulary alone. Every direct booking awaiting or accepted by a provider was
 * missing from both -- the admin tile, and the customer's and provider's own
 * dashboard. A provider with three bookings in progress was shown zero.
 */

// ---- the list is complete against both vocabularies -------------------------

test("every non-terminal direct booking status counts as active", async () => {
  // Terminal states are the only ones that should be absent. If a new booking
  // status is added, this fails until somebody decides which side it is on.
  const terminal = new Set([
    DIRECT_BOOKING_STATUS.DECLINED,
    DIRECT_BOOKING_STATUS.CANCELLED,
    DIRECT_BOOKING_STATUS.COMPLETED,
  ]);

  for (const status of Object.values(DIRECT_BOOKING_STATUS)) {
    if (terminal.has(status)) {
      assert.ok(
        !ACTIVE_JOB_STATUSES.includes(status),
        `${status} is terminal and must not count as active work`,
      );
      continue;
    }
    assert.ok(
      ACTIVE_JOB_STATUSES.includes(status),
      `direct booking status "${status}" means work is under way but is not counted`,
    );
  }
});

test("the order statuses that mean work is under way are all counted", async () => {
  for (const status of [
    ORDER_STATUS.ACCEPTED,
    ORDER_STATUS.SCHEDULED,
    ORDER_STATUS.IN_PROGRESS,
    ORDER_STATUS.WAITING_CUSTOMER_CONFIRMATION,
    ORDER_STATUS.DELIVERED,
  ]) {
    assert.ok(ACTIVE_JOB_STATUSES.includes(status), `order status "${status}" is not counted`);
  }
});

test("nothing finished or unstarted is counted as active", async () => {
  // created is a draft nobody has accepted; the rest are over.
  for (const status of [
    ORDER_STATUS.CREATED,
    ORDER_STATUS.COMPLETED,
    ORDER_STATUS.CANCELLED,
    ORDER_STATUS.DISPUTED,
  ]) {
    assert.ok(!ACTIVE_JOB_STATUSES.includes(status), `"${status}" must not count as work under way`);
  }
});

test("the list has no duplicates", async () => {
  assert.equal(new Set(ACTIVE_JOB_STATUSES).size, ACTIVE_JOB_STATUSES.length);
});

// ---- both queries use it ----------------------------------------------------

test("the SQL literal is built from the list, not written out again", async () => {
  // A second hand-written list is a second thing to forget.
  for (const status of ACTIVE_JOB_STATUSES) {
    assert.ok(ACTIVE_JOB_STATUS_SQL.includes(`'${status}'`), `${status} missing from the SQL literal`);
  }
  assert.equal(ACTIVE_JOB_STATUS_SQL.split(",").length, ACTIVE_JOB_STATUSES.length);
});

test("no query counts active jobs with its own inline list", async () => {
  // The exact shape that was wrong, in both files that had it.
  for (const file of [
    "lib/services/marketplace.ts",
    "app/api/service-dashboard/counts/route.ts",
  ]) {
    const source = await read(file);
    assert.match(source, /ACTIVE_JOB_STATUS_SQL/, `${file} does not use the shared list`);
    assert.doesNotMatch(
      source,
      /status IN \('accepted','scheduled','in_progress'/,
      `${file} still carries an inline status list`,
    );
  }
});

test("the user's own dashboard counts the same statuses as the admin tile", async () => {
  // These disagreeing is how a provider is told they have no active work while
  // an administrator can see three.
  const admin = await read("lib/services/marketplace.ts");
  const own = await read("app/api/service-dashboard/counts/route.ts");

  assert.match(admin, /status IN \(\$\{ACTIVE_JOB_STATUS_SQL\}\)/);
  assert.match(own, /status IN \(\$\{ACTIVE_JOB_STATUS_SQL\}\)/);
});

test("a booking a provider has accepted shows on their dashboard", async () => {
  // The concrete case: confirmed and pending_provider are booking-only statuses
  // and were in neither query.
  assert.ok(ACTIVE_JOB_STATUSES.includes("pending_provider"));
  assert.ok(ACTIVE_JOB_STATUSES.includes("confirmed"));
});
