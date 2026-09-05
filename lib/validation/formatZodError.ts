import type { $ZodError, $ZodIssue } from "zod/v4/core";

import { fieldKey, fieldLabelAr } from "@/lib/validation/fieldLabels.ar";
import { stepForField, type PropertyStep } from "@/lib/validation/propertyFieldSteps";

/**
 * A ZodError, in Arabic, addressed to the field it came from.
 *
 * `ZodError` extends `Error`, and its `.message` is the JSON dump of
 * `.issues`. Every route that answered `{ error: error.message }` in a catch
 * therefore printed that JSON straight into the user's red alert — the failure
 * this module exists to end:
 *
 *   [{"origin":"string","code":"too_small","minimum":5,"path":["titleAr"], ...
 *
 * Nothing may hand a client `error.message` or `error.issues` from a Zod
 * failure. Route handlers call `validationErrorResponse` (or
 * `formatZodError` and build their own body) instead.
 */

export type ValidationError = {
  /** The indexless field path — "titleAr", "offers.price", "media.url". */
  field: string;
  /** The wizard step the field lives on, so the form can open it. */
  step: PropertyStep;
  /** Arabic, naming the field as the form labels it. */
  message: string;
  /** The full path including array indices, for marking one row of a repeater. */
  path: string;
};

export const VALIDATION_ERROR_CODE = "VALIDATION_ERROR";
export const VALIDATION_ERROR_STATUS = 422;

/** Arabic counts read badly with a bare numeral; these are the forms a length rule needs. */
function characters(count: number): string {
  if (count === 1) return "حرفاً واحداً";
  if (count === 2) return "حرفين";
  if (count >= 3 && count <= 10) return `${count} أحرف`;
  return `${count} حرفاً`;
}

function hasArabic(text: string): boolean {
  return /[؀-ۿ]/.test(text);
}

function numeric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") return Number(value);
  return null;
}

/**
 * One issue as a sentence. The schema's own message wins whenever it is
 * already Arabic — a `refine` that says "نوع المزاد مطلوب عند اختيار التسويق
 * بالمزاد" knows more than any generic rule here can.
 */
export function messageForIssue(issue: $ZodIssue): string {
  const label = fieldLabelAr(issue.path);
  if (issue.message && hasArabic(issue.message)) return issue.message;

  switch (issue.code) {
    case "too_small": {
      const minimum = numeric((issue as { minimum?: unknown }).minimum);
      const origin = (issue as { origin?: string }).origin;
      if (minimum === null) return `${label} مطلوب`;
      // A string with a minimum of 1, or any empty collection, is simply missing.
      if (minimum <= 1 && origin !== "number") return `${label} مطلوب`;
      if (origin === "string") return `${label} يجب ألا يقل عن ${characters(minimum)}`;
      if (origin === "array" || origin === "set") return `${label}: الحد الأدنى ${minimum} عناصر`;
      return `${label}: الحد الأدنى ${minimum}`;
    }
    case "too_big": {
      const maximum = numeric((issue as { maximum?: unknown }).maximum);
      const origin = (issue as { origin?: string }).origin;
      if (maximum === null) return `${label} غير صالح`;
      if (origin === "string") return `${label}: الحد الأقصى ${characters(maximum)}`;
      if (origin === "array" || origin === "set") return `${label}: الحد الأقصى ${maximum} عناصر`;
      return `${label}: الحد الأقصى ${maximum}`;
    }
    case "invalid_type": {
      // Zod reports a missing key as invalid_type with `received: undefined`.
      return `${label} مطلوب`;
    }
    case "invalid_format":
    case "invalid_value":
    case "invalid_union":
    case "invalid_key":
    case "invalid_element":
      return `${label} غير صالح`;
    case "not_multiple_of":
      return `${label} غير صالح`;
    case "unrecognized_keys":
      return `${label}: حقول غير معروفة`;
    case "custom":
    default:
      return `${label} غير صالح`;
  }
}

/** Every issue in a ZodError, as field + step + Arabic message, in schema order. */
export function formatZodError(error: $ZodError | { issues: readonly $ZodIssue[] }): ValidationError[] {
  const issues = error?.issues ?? [];
  const seen = new Set<string>();
  const formatted: ValidationError[] = [];

  for (const issue of issues) {
    const path = issue.path.map(String).join(".");
    const field = fieldKey(issue.path);
    // One message per concrete path: a union reports the same field several times.
    if (seen.has(path)) continue;
    seen.add(path);
    formatted.push({
      field,
      path,
      step: stepForField(field),
      message: messageForIssue(issue),
    });
  }

  return formatted;
}

/** True for a thrown value that is a ZodError, without importing zod at runtime. */
export function isZodError(error: unknown): error is $ZodError {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: string }).name === "ZodError" &&
    Array.isArray((error as { issues?: unknown }).issues)
  );
}

export type ValidationErrorBody = {
  ok: false;
  success: false;
  code: typeof VALIDATION_ERROR_CODE;
  error: string;
  errors: ValidationError[];
};

/**
 * The one body shape a validation failure takes, on every route — the web
 * routes and the office bridge alike, so the desktop application reads the
 * same messages the web form shows.
 *
 * `success: false` is carried alongside `ok: false` because the existing web
 * clients test `success`; `error` carries a human summary for a client that
 * only knows how to print one string.
 */
export function validationErrorBody(errors: ValidationError[]): ValidationErrorBody {
  return {
    ok: false,
    success: false,
    code: VALIDATION_ERROR_CODE,
    error: errors.length === 1 ? errors[0].message : `يوجد ${errors.length} حقول غير مكتملة`,
    errors,
  };
}
