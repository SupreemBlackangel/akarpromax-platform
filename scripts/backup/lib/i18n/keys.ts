import type { Locale } from "@/src/types/site";

export const LOCALES: Locale[] = ["ar", "en", "tr"];

export const NAMESPACES = {
  HOME: "home",
  SERVICES: "services",
  SERVICES_ADMIN: "services.admin",
  I18N_ADMIN: "i18n.admin",
  COMMON: "common",
  ACCOUNT: "account",
  ERRORS: "errors",
} as const;

export type Namespace = (typeof NAMESPACES)[keyof typeof NAMESPACES];

export function isLocale(value: unknown): value is Locale {
  return value === "ar" || value === "en" || value === "tr";
}

export function normalizeKey(namespace: string, key: string): string {
  const cleanKey = key.replace(/^[.]+|[.]+$/g, "").trim();
  if (!cleanKey) throw new Error("i18n: empty key");
  return `${namespace}.${cleanKey}`;
}

export function parseKey(fullKey: string): { namespace: string; key: string } {
  const dot = fullKey.indexOf(".");
  if (dot <= 0) return { namespace: "common", key: fullKey };
  return { namespace: fullKey.slice(0, dot), key: fullKey.slice(dot + 1) };
}

export function escapeDots(value: string): string {
  return value.replace(/\\\./g, "__DOT__");
}

export function unescapeDots(value: string): string {
  return value.replace(/__DOT__/g, ".");
}

type Leaf = string | number | boolean | null;

/**
 * Flatten a nested object into dot-path keys: `{ a: { b: "x" }, c: ["y"] }`
 * -> `{ "a.b": "x", "c.0": "y" }`. Array leaves become numeric-path keys so
 * the DB can hold them and the client can rebuild arrays on demand.
 */
export function flattenLeaf(source: Record<string, unknown>, prefix = ""): Record<string, Leaf> {
  const out: Record<string, Leaf> = {};
  for (const [key, value] of Object.entries(source)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value === null || value === undefined) continue;
    if (typeof value === "object") {
      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          const itemPath = `${path}.${index}`;
          if (item !== null && typeof item === "object") {
            Object.assign(out, flattenLeaf(item as Record<string, unknown>, itemPath));
          } else if (item !== null && item !== undefined) {
            out[itemPath] = item as Leaf;
          }
        });
      } else {
        Object.assign(out, flattenLeaf(value as Record<string, unknown>, path));
      }
    } else {
      out[path] = value as Leaf;
    }
  }
  return out;
}

export function unflattenLeaf(flat: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [path, value] of Object.entries(flat)) {
    const segments = path.split(".");
    let cursor: Record<string | number, unknown> = out;
    for (let i = 0; i < segments.length - 1; i += 1) {
      const segment = segments[i];
      const nextIsNumeric = /^\d+$/.test(segments[i + 1]);
      const existing = cursor[segment];
      if (nextIsNumeric) {
        if (!Array.isArray(existing)) cursor[segment] = [];
      } else if (existing === undefined || Array.isArray(existing)) {
        if (Array.isArray(existing)) {
          const holder: Record<string | number, unknown> = {};
          existing.forEach((item, index) => {
            if (item !== undefined) holder[index] = item;
          });
          cursor[segment] = holder;
        } else {
          cursor[segment] = {};
        }
      }
      cursor = cursor[segment] as Record<string | number, unknown>;
    }
    const last = segments[segments.length - 1];
    if (Array.isArray(cursor)) {
      cursor[Number(last)] = value;
    } else {
      cursor[last] = value;
    }
  }
  return out;
}

export function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}
