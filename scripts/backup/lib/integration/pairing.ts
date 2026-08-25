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
  if (String(pairing.expires_at) < now) throw new Error("PAIRING_CODE_EXPIRED");

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
