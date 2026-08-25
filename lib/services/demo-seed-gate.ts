/**
 * AkarProMax L1C-0.5B1 — Services demo-seed containment gate.
 *
 * WHY THIS EXISTS
 * ---------------
 * The Services demo graph (4 hard-coded providers, 4 hard-coded customer
 * requests and their offer/order/review/timeline children) used to be inserted
 * by *any* non-production boot, and unconditionally by the MySQL runtime
 * bootstrap. That made "development mode" a silent writer of operational
 * Services rows into whatever database the process happened to be pointed at.
 *
 * From L1C-0.5B1 the Services marketplace demo graph is inserted ONLY when an
 * operator explicitly asks for it:
 *
 *     SEED_DEMO_DATA=true            (explicit opt-in, EXACT string)
 *     AND NODE_ENV !== "production"  (never in production, opt-in or not)
 *
 * NODE_ENV alone — including `development` — never enables it.
 *
 * R1: the opt-in comparison is EXACT — no trimming, no case folding. "true" is
 * the only accepted value; " true ", "TRUE", "True", "1", "yes" and "on" are all
 * refusals. An operator enabling a destructive-by-nature demo seed must type the
 * value exactly, and a stray space in a shell script or CI variable must fail
 * closed rather than be silently repaired.
 *
 * SCOPE
 * -----
 * This gate governs the DEMO graph only. `seedServiceTaxonomy` is reference /
 * catalog data (professions a market registers against) and is deliberately NOT
 * gated: it stays available on every boot, independently of this module.
 *
 * NO DEPENDENCIES ON PURPOSE
 * --------------------------
 * The manual seed scripts must be able to refuse before they open a database
 * connection, so this module imports nothing — not the runtime-env validator,
 * not the DB layer. It reads a plain env record and returns a decision.
 */

/** The one environment variable that can enable the Services demo graph. */
export const SERVICES_DEMO_SEED_ENV = "SEED_DEMO_DATA" as const;

/** The exact value required. Anything else — including " true ", "TRUE", "1" — is a refusal. */
export const SERVICES_DEMO_SEED_OPT_IN = "true" as const;

export type DemoSeedEnvLike = {
  SEED_DEMO_DATA?: string | undefined;
  NODE_ENV?: string | undefined;
};

function readEnv(env?: DemoSeedEnvLike): DemoSeedEnvLike {
  return env ?? (process.env as DemoSeedEnvLike);
}

/** True when this process considers itself a production runtime. */
export function isProductionEnv(env?: DemoSeedEnvLike): boolean {
  return String(readEnv(env).NODE_ENV ?? "").trim().toLowerCase() === "production";
}

/**
 * True only for the exact, explicit opt-in string.
 * R1: strict equality — the value is NOT trimmed and NOT case-folded.
 */
export function hasServicesDemoSeedOptIn(env?: DemoSeedEnvLike): boolean {
  return readEnv(env).SEED_DEMO_DATA === SERVICES_DEMO_SEED_OPT_IN;
}

/**
 * The single authority for "may this process insert the Services demo graph?".
 * Fails closed: production is refused even with the opt-in present.
 */
export function isServicesDemoSeedEnabled(env?: DemoSeedEnvLike): boolean {
  const resolved = readEnv(env);
  if (isProductionEnv(resolved)) return false;
  return hasServicesDemoSeedOptIn(resolved);
}

/** Human-readable reason a demo seed was refused, or null when it is allowed. */
export function servicesDemoSeedRefusal(env?: DemoSeedEnvLike): string | null {
  const resolved = readEnv(env);
  if (isProductionEnv(resolved)) {
    return "Refusing to seed the Services demo graph: NODE_ENV=production. Demo data never enters a production database.";
  }
  if (!hasServicesDemoSeedOptIn(resolved)) {
    return `Refusing to seed the Services demo graph: ${SERVICES_DEMO_SEED_ENV} is not exactly "${SERVICES_DEMO_SEED_OPT_IN}" (the value is compared strictly — no trimming, no case folding). Non-production mode alone does NOT enable Services demo data — set ${SERVICES_DEMO_SEED_ENV}=${SERVICES_DEMO_SEED_OPT_IN} explicitly.`;
  }
  return null;
}

/**
 * Fail-fast guard for the manual seed scripts. Prints the refusal and exits
 * non-zero BEFORE any database connection is opened. Returns normally only when
 * the demo seed is explicitly permitted.
 */
export function assertServicesDemoSeedAllowed(scriptName: string, env?: DemoSeedEnvLike): void {
  const refusal = servicesDemoSeedRefusal(env);
  if (!refusal) return;
  console.error(`[${scriptName}] ${refusal}`);
  console.error(`[${scriptName}] no database connection was opened. Nothing was written.`);
  process.exit(1);
}
