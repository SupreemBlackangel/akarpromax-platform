import { getIntegrationDb } from "@/lib/integration/db";
import { randomPairingCode, sha256Hex } from "@/lib/integration/crypto";
import { OFFICE_DEFAULT_SCOPES, PAIRING_CODE_TTL_MS, type PairingCodeStatus } from "@/lib/integration/constants";

export type StartPairingInput = {
  sponsorId: string;
  officeId?: string;
  createdBy?: string;
};

export type CompletePairingInput = {
  code: string;
  installationId: string;
  deviceName?: string;
  model?: string;
  os?: string;
  osVersion?: string;
  appVersion?: string;
  protocolVersion?: number;
  lastIp?: string;
};

export type PairedDevice = {
  deviceId: string;
  installationId: string;
  sponsorId: string;
  officeId: string | null;
  status: string;
  token: string;
  tokenPrefix: string;
  expiresAt: string;
};

function nowIso(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

/**
 * Normalize a stored expiry value to a UTC epoch timestamp (ms).
 *
 * Handles both storage backends without special-casing either:
 * - D1 stores the naive UTC text "YYYY-MM-DD HH:MM:SS" produced by nowIso()
 *   -> parsed as UTC by appending "Z".
 * - PostgreSQL stores the same naive text in a `timestamp without time zone`
 *   column, but node-postgres converts it to a JS Date whose LOCAL components
 *   reproduce the stored string (see pg_typeof probe: read-back shifts by the
 *   Node runtime offset). Reconstruct the UTC instant from those components
 *   so the value keeps the UTC semantics the server used when writing it.
 * - ISO-8601 strings (with T/Z/offset) and numeric epoch values are accepted
 *   as-is.
 *
 * Returns null when the value cannot be parsed -> callers must fail closed.
 */
export function toUtcEpochMs(value: unknown): number | null {
  if (value == null) return null;
  if (value instanceof Date) {
    const t = value.getTime();
    if (Number.isNaN(t)) return null;
    return Date.UTC(
      value.getFullYear(),
      value.getMonth(),
      value.getDate(),
      value.getHours(),
      value.getMinutes(),
      value.getSeconds(),
      value.getMilliseconds(),
    );
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? (value < 1e12 ? value * 1000 : value) : null;
  }
  const raw = String(value).trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) {
    const n = Number(raw);
    return Number.isFinite(n) ? (n < 1e12 ? n * 1000 : n) : null;
  }
  const naiveUtc = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(raw);
  const ms = Date.parse(naiveUtc ? `${raw.replace(" ", "T")}Z` : raw);
  return Number.isNaN(ms) ? null : ms;
}

export async function startPairing(input: StartPairingInput): Promise<{ code: string; expiresAt: string }> {
  const db = await getIntegrationDb();
  const code = randomPairingCode();
  const codeHash = await sha256Hex(code);
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + PAIRING_CODE_TTL_MS).toISOString().slice(0, 19).replace("T", " ");
  await db
    .prepare(
      `INSERT INTO office_pairing_codes
        (id, sponsor_id, office_id, code_hash, status, expires_at, created_by)
       VALUES (?1, ?2, ?3, ?4, 'pending', ?5, ?6)`,
    )
    .bind(id, input.sponsorId, input.officeId ?? null, codeHash, expiresAt, input.createdBy ?? null)
    .run();
  return { code, expiresAt };
}

export async function completePairing(input: CompletePairingInput): Promise<PairedDevice> {
  const db = await getIntegrationDb();
  const code = String(input.code ?? "").trim().toUpperCase();
  const codeHash = await sha256Hex(code);
  const now = nowIso();

  const pairing = await db
    .prepare("SELECT * FROM office_pairing_codes WHERE code_hash = ?1 LIMIT 1")
    .bind(codeHash)
    .first<Record<string, unknown>>();
  if (!pairing) throw new Error("PAIRING_CODE_NOT_FOUND");
  if (pairing.status !== "pending") throw new Error("PAIRING_CODE_USED");
  const expiryMs = toUtcEpochMs(pairing.expires_at);
  if (expiryMs === null || expiryMs <= Date.now()) throw new Error("PAIRING_CODE_EXPIRED");

  const sponsorId = String(pairing.sponsor_id);
  const officeId = pairing.office_id ? String(pairing.office_id) : null;

  const deviceId = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO office_devices
        (id, sponsor_id, office_id, device_name, model, os, os_version, app_version,
         protocol_version, installation_id, status, last_seen_at, last_ip, created_by)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 'active', ?11, ?12, ?13)`,
    )
    .bind(
      deviceId,
      sponsorId,
      officeId,
      String(input.deviceName ?? "").slice(0, 120) || null,
      String(input.model ?? "").slice(0, 120) || null,
      String(input.os ?? "").slice(0, 64) || null,
      String(input.osVersion ?? "").slice(0, 64) || null,
      String(input.appVersion ?? "").slice(0, 30) || null,
      Number(input.protocolVersion) || 1,
      String(input.installationId ?? "").slice(0, 120),
      now,
      String(input.lastIp ?? "").slice(0, 45) || null,
      null,
    )
    .run();

  await db
    .prepare(
      `UPDATE office_pairing_codes
         SET status = 'completed', completed_at = ?1, completed_by_device_id = ?2
       WHERE id = ?3`,
    )
    .bind(now, deviceId, String(pairing.id))
    .run();

  const credential = await issueDeviceCredential(deviceId, OFFICE_DEFAULT_SCOPES);
  return {
    deviceId,
    installationId: String(input.installationId),
    sponsorId,
    officeId,
    status: "active",
    token: credential.token,
    tokenPrefix: credential.tokenPrefix,
    expiresAt: credential.expiresAt,
  };
}

export async function issueDeviceCredential(
  deviceId: string,
  scopes?: readonly string[],
  ttlMs = 90 * 24 * 60 * 60 * 1000,
): Promise<{ token: string; tokenPrefix: string; expiresAt: string }> {
  const db = await getIntegrationDb();
  const token = `apd_${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "")}`;
  const tokenPrefix = token.slice(0, 8);
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + ttlMs).toISOString().slice(0, 19).replace("T", " ");
  await db
    .prepare(
      `INSERT INTO office_device_credentials
        (id, device_id, token_hash, token_prefix, scopes, expires_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
    )
    .bind(
      crypto.randomUUID(),
      deviceId,
      tokenHash,
      tokenPrefix,
      JSON.stringify(scopes && scopes.length ? scopes : []),
      expiresAt,
    )
    .run();
  return { token, tokenPrefix, expiresAt };
}

export async function revokePairingCode(id: string): Promise<void> {
  const db = await getIntegrationDb();
  await db
    .prepare("UPDATE office_pairing_codes SET status = 'revoked' WHERE id = ?1 AND status = 'pending'")
    .bind(id)
    .run();
}

export async function listPairingCodes(sponsorId?: string): Promise<Array<Record<string, unknown>>> {
  const db = await getIntegrationDb();
  const rows = sponsorId
    ? await db
        .prepare("SELECT id, sponsor_id, office_id, status, expires_at, completed_at, created_at FROM office_pairing_codes WHERE sponsor_id = ?1 ORDER BY created_at DESC")
        .bind(sponsorId)
        .all<Record<string, unknown>>()
    : await db
        .prepare("SELECT id, sponsor_id, office_id, status, expires_at, completed_at, created_at FROM office_pairing_codes ORDER BY created_at DESC")
        .all<Record<string, unknown>>();
  return rows.results ?? [];
}

export function pairingErrorToHttp(error: unknown): { status: number; message: string } {
  const message = error instanceof Error ? error.message : String(error);
  switch (message) {
    case "PAIRING_CODE_NOT_FOUND":
      return { status: 404, message: "Invalid pairing code" };
    case "PAIRING_CODE_USED":
      return { status: 410, message: "Pairing code already used" };
    case "PAIRING_CODE_EXPIRED":
      return { status: 410, message: "Pairing code has expired" };
    default:
      return { status: 400, message };
  }
}

export type { PairingCodeStatus };
