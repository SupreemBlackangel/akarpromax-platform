import { getIntegrationDb } from "@/lib/integration/db";
import { sha256Hex } from "@/lib/integration/crypto";
import { toUtcEpochMs } from "@/lib/integration/pairing";
import {
  OFFICE_CREDENTIAL_TTL_MS,
  OFFICE_PROTOCOL_VERSION,
  checkProtocolVersion,
  type OfficeDeviceStatus,
  type OfficeScope,
} from "@/lib/integration/constants";

export type AuthenticatedDevice = {
  deviceId: string;
  installationId: string | null;
  sponsorId: string;
  officeId: string | null;
  status: string;
  scopes: OfficeScope[];
  credentialId: string;
  protocolVersion: number;
  appVersion: string | null;
};

export type DeviceAuthErrorReason = "INVALID" | "CREDENTIAL_REVOKED" | "EXPIRED" | "DEVICE_REVOKED" | "DEVICE_INACTIVE";

export type DeviceAuthResult =
  | { device: AuthenticatedDevice }
  | { error: { reason: DeviceAuthErrorReason } };

function nowIso(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

export async function authenticateDeviceToken(rawToken: string): Promise<AuthenticatedDevice | null> {
  const result = await authenticateDeviceTokenResult(rawToken);
  return "device" in result ? result.device : null;
}

/**
 * Full device-credential validation. Unlike `authenticateDeviceToken`, the
 * failure reason is preserved so callers (and Desktop) can distinguish a
 * revoked credential/device from an expired one from an invalid token.
 */
export async function authenticateDeviceTokenResult(rawToken: string): Promise<DeviceAuthResult> {
  const db = await getIntegrationDb();
  const tokenHash = await sha256Hex(rawToken);
  const credential = await db
    .prepare("SELECT * FROM office_device_credentials WHERE token_hash = ?1 LIMIT 1")
    .bind(tokenHash)
    .first<Record<string, unknown>>();
  if (!credential) return { error: { reason: "INVALID" } };
  if (credential.revoked_at) return { error: { reason: "CREDENTIAL_REVOKED" } };

  const expiryMs = toUtcEpochMs(credential.expires_at);
  if (expiryMs === null || expiryMs <= Date.now()) return { error: { reason: "EXPIRED" } };

  const device = await db
    .prepare("SELECT * FROM office_devices WHERE id = ?1 LIMIT 1")
    .bind(String(credential.device_id))
    .first<Record<string, unknown>>();
  if (!device) return { error: { reason: "INVALID" } };
  if (device.status !== "active") {
    return { error: { reason: device.status === "revoked" ? "DEVICE_REVOKED" : "DEVICE_INACTIVE" } };
  }

  let scopes: OfficeScope[] = [];
  try {
    scopes = JSON.parse(String(credential.scopes ?? "[]"));
  } catch {
    scopes = [];
  }

  const now = nowIso();
  await db
    .prepare("UPDATE office_device_credentials SET last_used_at = ?1 WHERE id = ?2")
    .bind(now, String(credential.id))
    .run();
  await db
    .prepare("UPDATE office_devices SET last_seen_at = ?1 WHERE id = ?2")
    .bind(now, String(device.id))
    .run();

  return {
    device: {
      deviceId: String(device.id),
      installationId: device.installation_id ? String(device.installation_id) : null,
      sponsorId: String(device.sponsor_id),
      officeId: device.office_id ? String(device.office_id) : null,
      status: String(device.status),
      scopes,
      credentialId: String(credential.id),
      protocolVersion: Number(device.protocol_version) || 1,
      appVersion: device.app_version ? String(device.app_version) : null,
    },
  };
}

export function deviceHasScope(device: AuthenticatedDevice, scope: OfficeScope): boolean {
  return device.scopes.includes(scope);
}

export async function rotateDeviceToken(rawToken: string): Promise<{ token: string; tokenPrefix: string; expiresAt: string }> {
  const device = await authenticateDeviceToken(rawToken);
  if (!device) throw new Error("UNAUTHORIZED");

  const db = await getIntegrationDb();
  const now = nowIso();
  await db
    .prepare("UPDATE office_device_credentials SET revoked_at = ?1 WHERE id = ?2")
    .bind(now, device.credentialId)
    .run();

  const token = `apd_${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "")}`;
  const tokenPrefix = token.slice(0, 8);
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + OFFICE_CREDENTIAL_TTL_MS).toISOString().slice(0, 19).replace("T", " ");
  await db
    .prepare(
      `INSERT INTO office_device_credentials
        (id, device_id, token_hash, token_prefix, scopes, expires_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
    )
    .bind(
      crypto.randomUUID(),
      device.deviceId,
      tokenHash,
      tokenPrefix,
      JSON.stringify(device.scopes),
      expiresAt,
    )
    .run();

  await db
    .prepare("UPDATE office_devices SET last_seen_at = ?1 WHERE id = ?2")
    .bind(now, device.deviceId)
    .run();

  return { token, tokenPrefix, expiresAt };
}

export type HeartbeatMetadata = {
  appVersion?: string;
  osVersion?: string;
  protocolVersion?: number;
};

export type HeartbeatResult = {
  authenticated: boolean;
  deviceId: string;
  status: string;
  serverTime: string;
  protocolVersion: number;
  protocolStatus: string;
  appVersionStatus: string;
  credentialExpiresAt: string | null;
};

export async function heartbeatDevice(
  deviceId: string,
  lastIp?: string,
  metadata?: HeartbeatMetadata,
): Promise<HeartbeatResult> {
  const db = await getIntegrationDb();
  const now = nowIso();
  await db
    .prepare(
      `UPDATE office_devices
         SET last_seen_at = ?1,
             last_ip = COALESCE(?2, last_ip),
             app_version = COALESCE(?3, app_version),
             os_version = COALESCE(?4, os_version),
             protocol_version = COALESCE(?5, protocol_version)
       WHERE id = ?6 AND status = 'active'`,
    )
    .bind(
      now,
      lastIp ?? null,
      metadata?.appVersion ? String(metadata.appVersion).slice(0, 30) : null,
      metadata?.osVersion ? String(metadata.osVersion).slice(0, 64) : null,
      metadata?.protocolVersion != null ? Number(metadata.protocolVersion) : null,
      deviceId,
    )
    .run();

  const device = await db
    .prepare("SELECT id, status, protocol_version, app_version FROM office_devices WHERE id = ?1 LIMIT 1")
    .bind(deviceId)
    .first<Record<string, unknown>>();

  const credential = await db
    .prepare(
      `SELECT expires_at FROM office_device_credentials
        WHERE device_id = ?1 AND revoked_at IS NULL ORDER BY created_at DESC LIMIT 1`,
    )
    .bind(deviceId)
    .first<Record<string, unknown>>();

  const protocolVersion = device ? Number(device.protocol_version) || OFFICE_PROTOCOL_VERSION : OFFICE_PROTOCOL_VERSION;
  const appVersion = device && device.app_version ? String(device.app_version) : "";
  const check = checkProtocolVersion(appVersion, protocolVersion);

  return {
    authenticated: true,
    deviceId,
    status: device ? String(device.status) : "unknown",
    serverTime: now,
    protocolVersion,
    protocolStatus: check.status,
    appVersionStatus: check.status,
    credentialExpiresAt: credential?.expires_at ? String(credential.expires_at) : null,
  };
}

export async function revokeDevice(deviceId: string, reason = "manual"): Promise<{ ok: boolean; revoked: boolean }> {
  const db = await getIntegrationDb();
  const now = nowIso();
  const device = await db
    .prepare("SELECT id FROM office_devices WHERE id = ?1 LIMIT 1")
    .bind(deviceId)
    .first<{ id: string }>();
  if (!device) return { ok: true, revoked: false };

  await db
    .prepare(
      `UPDATE office_devices
         SET status = 'revoked', revoked_at = ?1, revoked_reason = ?2
       WHERE id = ?3`,
    )
    .bind(now, String(reason).slice(0, 255), deviceId)
    .run();
  await db
    .prepare("UPDATE office_device_credentials SET revoked_at = ?1 WHERE device_id = ?2 AND revoked_at IS NULL")
    .bind(now, deviceId)
    .run();
  return { ok: true, revoked: true };
}

export async function listDevices(sponsorId?: string, status?: OfficeDeviceStatus): Promise<Array<Record<string, unknown>>> {
  const db = await getIntegrationDb();
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (sponsorId) {
    params.push(sponsorId);
    clauses.push(`sponsor_id = ?${params.length}`);
  }
  if (status) {
    params.push(status);
    clauses.push(`status = ?${params.length}`);
  }
  const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
  const rows = await db
    .prepare(
      `SELECT id, sponsor_id, office_id, device_name, model, os, os_version, app_version,
              protocol_version, installation_id, status, last_seen_at, last_ip,
              revoked_at, revoked_reason, created_at, updated_at
       FROM office_devices${where}
       ORDER BY created_at DESC`,
    )
    .bind(...params)
    .all<Record<string, unknown>>();
  return rows.results ?? [];
}

export async function getDevice(deviceId: string): Promise<Record<string, unknown> | null> {
  const db = await getIntegrationDb();
  const row = await db
    .prepare(
      `SELECT id, sponsor_id, office_id, device_name, model, os, os_version, app_version,
              protocol_version, installation_id, status, last_seen_at, last_ip,
              revoked_at, revoked_reason, created_at, updated_at
       FROM office_devices WHERE id = ?1 LIMIT 1`,
    )
    .bind(deviceId)
    .first<Record<string, unknown>>();
  return row ?? null;
}
