import type {
  ReputationChangedEvent,
  VerificationStatusChangedEvent,
  OrganizationCreatedEvent,
  MembershipChangedEvent,
  ProfileUpdatedEvent,
} from "@/lib/amrs/contracts/events";

export type AmrsEvent =
  | ReputationChangedEvent
  | VerificationStatusChangedEvent
  | OrganizationCreatedEvent
  | MembershipChangedEvent
  | ProfileUpdatedEvent;

export interface EventHook {
  readonly name: string;
  readonly handler: (event: AmrsEvent) => void | Promise<void>;
}

export interface EventBus {
  emit(event: AmrsEvent): void;
  on(hook: EventHook): void;
  off(hookName: string): void;
  getListeners(): string[];
  getLog(): AmrsEvent[];
  clearLog(): void;
}

export function createEventBus(): EventBus {
  const hooks: Map<string, EventHook> = new Map();
  const log: AmrsEvent[] = [];

  return {
    emit(event: AmrsEvent) {
      log.push(event);
      for (const hook of hooks.values()) {
        hook.handler(event);
      }
    },
    on(hook: EventHook) {
      hooks.set(hook.name, hook);
    },
    off(hookName: string) {
      hooks.delete(hookName);
    },
    getListeners() {
      return [...hooks.keys()];
    },
    getLog() {
      return [...log];
    },
    clearLog() {
      log.length = 0;
    },
  };
}

let globalBus: EventBus | null = null;

export function getGlobalEventBus(): EventBus {
  if (!globalBus) {
    globalBus = createEventBus();
  }
  return globalBus;
}

export function resetGlobalEventBus(): void {
  globalBus = null;
}

// Built-in hooks

export const loggingHook: EventHook = {
  name: "logging",
  handler: (event) => {
    const eventType = "organizationId" in event
      ? "organization" in event
        ? "organization"
        : "membership"
      : "verificationType" in event
        ? "verification"
        : "reputation";
    console.log(`[AMRS] ${eventType} event`, JSON.stringify(event));
  },
};

export const reputationChangeHook: EventHook = {
  name: "reputation-change",
  handler: (event) => {
    if ("oldLevel" in event && "newLevel" in event && "score" in event) {
      const e = event as ReputationChangedEvent;
      if (e.oldLevel !== e.newLevel) {
        console.log(`[AMRS] Reputation ${e.entityType}:${e.entityId} ${e.oldLevel} → ${e.newLevel}`);
      }
    }
  },
};

export const verificationChangeHook: EventHook = {
  name: "verification-change",
  handler: (event) => {
    if ("verificationType" in event && "oldStatus" in event) {
      const e = event as VerificationStatusChangedEvent;
      console.log(`[AMRS] Verification ${e.verificationType}:${e.entityId} ${e.oldStatus} → ${e.newStatus}`);
    }
  },
};
