import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  createEventBus,
  resetGlobalEventBus,
  getGlobalEventBus,
  loggingHook,
  reputationChangeHook,
  verificationChangeHook,
  type AmrsEvent,
  type EventHook,
} from "@/lib/amrs/events";
import type {
  ReputationChangedEvent,
  VerificationStatusChangedEvent,
  OrganizationCreatedEvent,
} from "@/lib/amrs/contracts/events";

// ─── Event bus core ────────────────────────────────────────────────

describe("AMRS-10 Event bus core", () => {
  let bus: ReturnType<typeof createEventBus>;

  beforeEach(() => {
    bus = createEventBus();
  });

  it("emits and logs events", () => {
    const event: OrganizationCreatedEvent = {
      organizationId: "org-1",
      ownerId: "user-1",
      type: "real_estate",
      name: "Acme",
      createdAt: new Date(),
    };
    bus.emit(event);
    const log = bus.getLog();
    assert.equal(log.length, 1);
    assert.equal(log[0], event);
  });

  it("multiple events are logged in order", () => {
    const e1: OrganizationCreatedEvent = {
      organizationId: "org-1",
      ownerId: "user-1",
      type: "real_estate",
      name: "A",
      createdAt: new Date(),
    };
    const e2: OrganizationCreatedEvent = {
      organizationId: "org-2",
      ownerId: "user-2",
      type: "business",
      name: "B",
      createdAt: new Date(),
    };
    bus.emit(e1);
    bus.emit(e2);
    const log = bus.getLog();
    assert.equal(log.length, 2);
    assert.equal(log[0], e1);
    assert.equal(log[1], e2);
  });

  it("clearLog empties the log", () => {
    bus.emit({ organizationId: "x", ownerId: "y", type: "other", name: "Z", createdAt: new Date() });
    bus.clearLog();
    assert.equal(bus.getLog().length, 0);
  });
});

// ─── Event hooks ───────────────────────────────────────────────────

describe("AMRS-10 Event hooks", () => {
  let bus: ReturnType<typeof createEventBus>;
  const received: AmrsEvent[] = [];

  beforeEach(() => {
    bus = createEventBus();
    received.length = 0;
  });

  it("hook receives emitted events", () => {
    const hook: EventHook = {
      name: "test-hook",
      handler: (event) => { received.push(event); },
    };
    bus.on(hook);
    const event: OrganizationCreatedEvent = {
      organizationId: "org-1",
      ownerId: "user-1",
      type: "real_estate",
      name: "Test",
      createdAt: new Date(),
    };
    bus.emit(event);
    assert.equal(received.length, 1);
    assert.equal(received[0], event);
  });

  it("multiple hooks all receive events", () => {
    const received2: AmrsEvent[] = [];
    bus.on({ name: "hook-1", handler: (e) => { received.push(e); } });
    bus.on({ name: "hook-2", handler: (e) => { received2.push(e); } });
    bus.emit({ organizationId: "o", ownerId: "u", type: "other", name: "X", createdAt: new Date() });
    assert.equal(received.length, 1);
    assert.equal(received2.length, 1);
  });

  it("removing a hook stops delivery", () => {
    bus.on({ name: "removable", handler: (e) => { received.push(e); } });
    bus.off("removable");
    bus.emit({ organizationId: "o", ownerId: "u", type: "other", name: "X", createdAt: new Date() });
    assert.equal(received.length, 0);
  });

  it("getListeners returns hook names", () => {
    bus.on({ name: "a", handler: () => {} });
    bus.on({ name: "b", handler: () => {} });
    const listeners = bus.getListeners();
    assert.ok(listeners.includes("a"));
    assert.ok(listeners.includes("b"));
    assert.equal(listeners.length, 2);
  });

  it("removing hook updates listeners", () => {
    bus.on({ name: "a", handler: () => {} });
    bus.on({ name: "b", handler: () => {} });
    bus.off("a");
    const listeners = bus.getListeners();
    assert.ok(!listeners.includes("a"));
    assert.ok(listeners.includes("b"));
  });
});

// ─── Built-in hooks ────────────────────────────────────────────────

describe("AMRS-10 Built-in hooks", () => {
  it("logging hook has correct name", () => {
    assert.equal(loggingHook.name, "logging");
  });

  it("reputation change hook has correct name", () => {
    assert.equal(reputationChangeHook.name, "reputation-change");
  });

  it("verification change hook has correct name", () => {
    assert.equal(verificationChangeHook.name, "verification-change");
  });

  it("reputation change hook does not throw on non-reputation events", () => {
    const event: OrganizationCreatedEvent = {
      organizationId: "org-1",
      ownerId: "user-1",
      type: "real_estate",
      name: "Test",
      createdAt: new Date(),
    };
    assert.doesNotThrow(() => reputationChangeHook.handler(event));
  });

  it("verification change hook does not throw on non-verification events", () => {
    const event: OrganizationCreatedEvent = {
      organizationId: "org-1",
      ownerId: "user-1",
      type: "real_estate",
      name: "Test",
      createdAt: new Date(),
    };
    assert.doesNotThrow(() => verificationChangeHook.handler(event));
  });
});

// ─── Global event bus ──────────────────────────────────────────────

describe("AMRS-10 Global event bus", () => {
  beforeEach(() => {
    resetGlobalEventBus();
  });

  it("getGlobalEventBus returns same instance", () => {
    const bus1 = getGlobalEventBus();
    const bus2 = getGlobalEventBus();
    assert.equal(bus1, bus2);
  });

  it("resetGlobalEventBus creates new instance", () => {
    const bus1 = getGlobalEventBus();
    resetGlobalEventBus();
    const bus2 = getGlobalEventBus();
    assert.notEqual(bus1, bus2);
  });

  it("global bus persists events across calls", () => {
    const bus = getGlobalEventBus();
    bus.emit({ organizationId: "o", ownerId: "u", type: "other", name: "X", createdAt: new Date() });
    const log = getGlobalEventBus().getLog();
    assert.equal(log.length, 1);
  });
});

// ─── Event type discrimination ─────────────────────────────────────

describe("AMRS-10 Event type discrimination", () => {
  it("reputation event has oldLevel and newLevel", () => {
    const event: ReputationChangedEvent = {
      entityType: "professional",
      entityId: "p1",
      oldLevel: "new",
      newLevel: "rising",
      oldScore: 150,
      newScore: 250,
      policyVersion: 1,
      evaluatedAt: new Date(),
    };
    assert.equal("oldLevel" in event, true);
    assert.equal("newLevel" in event, true);
  });

  it("verification event has verificationType and oldStatus", () => {
    const event: VerificationStatusChangedEvent = {
      entityType: "user",
      entityId: "u1",
      verificationType: "email",
      oldStatus: "pending",
      newStatus: "verified",
      changedAt: new Date(),
    };
    assert.equal("verificationType" in event, true);
    assert.equal("oldStatus" in event, true);
  });

  it("organization created event has organizationId", () => {
    const event: OrganizationCreatedEvent = {
      organizationId: "org-1",
      ownerId: "user-1",
      type: "real_estate",
      name: "Acme",
      createdAt: new Date(),
    };
    assert.equal("organizationId" in event, true);
  });
});

// ─── Event hook async support ──────────────────────────────────────

describe("AMRS-10 Async hooks", () => {
  it("async hook is called", async () => {
    const bus = createEventBus();
    const received: AmrsEvent[] = [];
    bus.on({
      name: "async-hook",
      handler: async (event) => {
        received.push(event);
      },
    });
    bus.emit({ organizationId: "o", ownerId: "u", type: "other", name: "X", createdAt: new Date() });
    assert.equal(received.length, 1);
  });
});
