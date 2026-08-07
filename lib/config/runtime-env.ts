import { logSecurityEvent } from "@/lib/security/audit";

export type NodeEnv = "development" | "test" | "production";

export type DbProvider = "postgres" | "mysql" | "d1";

export type RuntimeEnv = {
  nodeEnv: NodeEnv;
  isProduction: boolean;
  sessionSecret: string;
  appUrl: string;
  appOrigin: string;
  trustedOrigins: string[];
  databaseUrl: string;
  mysqlUrl: string | null;
  dbProvider: DbProvider;
};

export class RuntimeEnvError extends Error {
  readonly variable: string;

  constructor(variable: string, reason: string) {
    super(`Invalid or missing environment variable ${variable} (${reason}). Refusing to boot.`);
    this.name = "RuntimeEnvError";
    this.variable = variable;
  }
}

export const DEV_FALLBACK_SESSION_SECRET = "akar-local-dev-session-secret-0fbd9c2e1a-00000000";
export const TEST_SESSION_SECRET = "akar-test-session-secret-00000000000000000000";

const MIN_SECRET_LENGTH = 32;

const KNOWN_WEAK_SECRETS = new Set([
  "secret",
  "changeme",
  "change-me",
  "development",
  "test",
  "password",
  "my_super_secret_key",
  "default-secret",
  "your-secret-here",
  "12345678",
  "replace_with_32_byte_random_string",
]);

function normalizeSecret(value: string): string {
  return value.trim().toLowerCase();
}

function isWeakSecret(value: string): boolean {
  const normalized = normalizeSecret(value);
  if (KNOWN_WEAK_SECRETS.has(normalized)) return true;
  return /^[a-z0-9_-]+$/.test(normalized) && normalized.length < MIN_SECRET_LENGTH;
}

function fail(variable: string, reason: string): never {
  logSecurityEvent("AUTH_SECRET_VALIDATION_FAILED", { variable, reason });
  throw new RuntimeEnvError(variable, reason);
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname.length > 0;
  } catch {
    return false;
  }
}

function normalizeOrigin(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed.endsWith("/") ? trimmed : `${trimmed}/`);
    return url.origin;
  } catch {
    return trimmed;
  }
}

function parseTrustedOrigins(raw: string | undefined): string[] {
  if (!raw) return [];
  const origins = new Set<string>();
  for (const part of raw.split(",")) {
    const origin = normalizeOrigin(part);
    if (origin && isHttpUrl(`${origin}/`)) origins.add(origin);
  }
  return [...origins];
}

function normalizeAppUrl(raw: string | undefined): string {
  if (!raw) return "";
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (isHttpUrl(trimmed)) return trimmed;
  return "";
}

const DB_PROVIDER_VALUES: DbProvider[] = ["postgres", "mysql", "d1"];

function parseDbProvider(raw: string | undefined, isProduction: boolean): DbProvider {
  const value = (raw ?? "").trim().toLowerCase();
  if (!value) {
    if (isProduction) {
      fail("DB_PROVIDER", "missing (required: postgres for production)");
    }
    return "d1";
  }
  if (!DB_PROVIDER_VALUES.includes(value as DbProvider)) {
    fail("DB_PROVIDER", `invalid value "${value}" (expected postgres, mysql, or d1)`);
  }
  if (isProduction && value !== "postgres") {
    fail("DB_PROVIDER", `production only supports postgres (got "${value}")`);
  }
  return value as DbProvider;
}

export function validateRuntimeEnv(raw: NodeJS.ProcessEnv): RuntimeEnv {
  const nodeEnv = (raw.NODE_ENV as NodeEnv) || "development";
  const isProduction = nodeEnv === "production";
  const mysqlUrl = raw.MYSQL_URL && raw.MYSQL_URL.trim() ? raw.MYSQL_URL.trim() : null;
  const dbProvider = parseDbProvider(raw.DB_PROVIDER, isProduction);

  if (isProduction) {
    const configuredSecret = raw.SESSION_SECRET ?? "";
    if (!configuredSecret) fail("SESSION_SECRET", "missing");
    if (configuredSecret.length < MIN_SECRET_LENGTH) fail("SESSION_SECRET", "too short (min 32 characters)");
    if (isWeakSecret(configuredSecret)) fail("SESSION_SECRET", "known weak or placeholder value");
    if (configuredSecret === DEV_FALLBACK_SESSION_SECRET || configuredSecret === TEST_SESSION_SECRET) {
      fail("SESSION_SECRET", "development/test fallback used in production");
    }
    if (!raw.DATABASE_URL || !raw.DATABASE_URL.trim()) fail("DATABASE_URL", "missing");
    const appUrl = normalizeAppUrl(raw.APP_URL);
    if (!appUrl) fail("APP_URL", "missing or not a valid http(s) URL");

    const trustedOrigins = parseTrustedOrigins(raw.TRUSTED_ORIGINS);
    if (trustedOrigins.length === 0) {
      fail("TRUSTED_ORIGINS", "required in production (comma-separated list of allowed origins)");
    }
    for (const origin of trustedOrigins) {
      if (!isHttpUrl(`${origin}/`)) fail("TRUSTED_ORIGINS", `invalid origin: ${origin}`);
    }

    return {
      nodeEnv,
      isProduction,
      sessionSecret: configuredSecret,
      appUrl,
      appOrigin: new URL(appUrl).origin,
      trustedOrigins,
      databaseUrl: raw.DATABASE_URL.trim(),
      mysqlUrl,
      dbProvider,
    };
  }

  let sessionSecret = raw.SESSION_SECRET ?? "";
  if (!sessionSecret) {
    sessionSecret = nodeEnv === "test" ? TEST_SESSION_SECRET : DEV_FALLBACK_SESSION_SECRET;
    if (nodeEnv === "development") {
      logSecurityEvent("AUTH_SECRET_VALIDATION_FAILED", {
        variable: "SESSION_SECRET",
        reason: "missing; using documented development-only fallback",
      });
    }
  } else if (nodeEnv === "development" && (sessionSecret.length < MIN_SECRET_LENGTH || isWeakSecret(sessionSecret))) {
    logSecurityEvent("AUTH_SECRET_VALIDATION_FAILED", {
      variable: "SESSION_SECRET",
      reason: "weak or placeholder value in development",
    });
  }

  const appUrl = normalizeAppUrl(raw.APP_URL) || (nodeEnv === "test" ? "http://localhost:3000" : "http://localhost:3000");
  const configuredOrigins = parseTrustedOrigins(raw.TRUSTED_ORIGINS);
  const trustedOrigins = new Set(configuredOrigins);
  if (appUrl) trustedOrigins.add(new URL(appUrl).origin);

  return {
    nodeEnv,
    isProduction,
    sessionSecret,
    appUrl,
    appOrigin: new URL(appUrl).origin,
    trustedOrigins: [...trustedOrigins],
    databaseUrl: raw.DATABASE_URL ?? "",
    mysqlUrl,
    dbProvider,
  };
}

let cached: RuntimeEnv | null = null;

export function getRuntimeEnv(): RuntimeEnv {
  if (!cached) cached = validateRuntimeEnv(process.env);
  return cached;
}

export function getTrustedOrigins(): string[] {
  return getRuntimeEnv().trustedOrigins;
}

export function isDevelopment(): boolean {
  return getRuntimeEnv().nodeEnv === "development";
}

export function isProduction(): boolean {
  return getRuntimeEnv().isProduction;
}

export function resetRuntimeEnvForTests(): void {
  cached = null;
}
