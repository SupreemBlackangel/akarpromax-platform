// A validation failure the user can act on.
//
// `ZodError` extends `Error` and its `.message` is the JSON dump of `.issues`,
// so every route that answered `{ error: error.message }` in a catch printed
// this into the red alert on step 5, about fields on step 1:
//
//   [{"origin":"string","code":"too_small","minimum":5,"path":["titleAr"],...
//
// Every issue must come back as an Arabic sentence naming the field as the
// form labels it, with the step it lives on.
import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";

import {
  formatZodError,
  isZodError,
  validationErrorBody,
  VALIDATION_ERROR_CODE,
  VALIDATION_ERROR_STATUS,
} from "../lib/validation/formatZodError.ts";
import { createPropertySchema } from "../lib/validators/property-validators.ts";
import { stepForField, PROPERTY_STEPS } from "../lib/validation/propertyFieldSteps.ts";
import { fieldLabelAr } from "../lib/validation/fieldLabels.ar.ts";

const ARABIC = /[؀-ۿ]/;

function issuesOf(schema, value) {
  const result = schema.safeParse(value);
  assert.equal(result.success, false, "expected the parse to fail");
  return formatZodError(result.error);
}

// ---- the exact failure that prompted this --------------------------------

test("the reported failure comes back as two Arabic messages on step 1", () => {
  const errors = issuesOf(createPropertySchema, {
    titleAr: "شقة",
    descriptionAr: "قصير",
    dealType: "sale",
    category: "residential",
    propertyType: "apartment",
    country: "SA",
    governorate: "MAKKAH",
    city: "JEDDAH",
    price: 450000,
    area: 96,
  });

  const byField = Object.fromEntries(errors.map((error) => [error.field, error]));
  assert.ok(byField.titleAr, "titleAr must be reported");
  assert.ok(byField.descriptionAr, "descriptionAr must be reported");
  assert.equal(byField.titleAr.step, 1);
  assert.equal(byField.descriptionAr.step, 1);
  assert.match(byField.titleAr.message, /عنوان العقار/);
  assert.match(byField.titleAr.message, /5 أحرف/);
  assert.match(byField.descriptionAr.message, /الوصف/);
  assert.match(byField.descriptionAr.message, /20 حرفاً/);

  for (const error of errors) {
    assert.match(error.message, ARABIC, `${error.field} must be Arabic`);
    assert.doesNotMatch(error.message, /too_small|expected|string|minimum/i, error.field);
  }
});

// ---- one rule per issue code ---------------------------------------------

test("every issue code produces an Arabic message and a real step", () => {
  const schema = z.object({
    titleAr: z.string().min(5),
    descriptionAr: z.string().max(3),
    area: z.number().min(10),
    bedrooms: z.number().max(50),
    city: z.string(),
    media: z.array(z.object({ url: z.url() })).max(1),
    currency: z.enum(["SAR", "OMR"]),
  });

  const errors = issuesOf(schema, {
    titleAr: "ab",
    descriptionAr: "much too long",
    area: 2,
    bedrooms: 900,
    media: [{ url: "not-a-url" }, { url: "https://a.example/b" }],
    currency: "XYZ",
  });

  const byField = Object.fromEntries(errors.map((error) => [error.field, error]));
  assert.match(byField.titleAr.message, /يجب ألا يقل عن 5 أحرف/);
  assert.match(byField.descriptionAr.message, /الحد الأقصى/);
  assert.match(byField.area.message, /الحد الأدنى 10/);
  assert.match(byField.bedrooms.message, /الحد الأقصى 50/);
  assert.match(byField.city.message, /المدينة مطلوب/);
  assert.match(byField["media.url"].message, /غير صالح/);
  assert.match(byField.currency.message, /العملة غير صالح/);

  const validSteps = new Set(PROPERTY_STEPS.map((entry) => entry.step));
  for (const error of errors) {
    assert.match(error.message, ARABIC, error.field);
    assert.ok(validSteps.has(error.step), `${error.field} -> step ${error.step}`);
  }
});

test("a length of one reads as 'required', not as 'at least 1 character'", () => {
  const errors = issuesOf(z.object({ city: z.string().min(1) }), { city: "" });
  assert.equal(errors[0].message, "المدينة مطلوب");
});

test("a schema's own Arabic message wins over the generic rule", () => {
  const schema = z.object({
    auctionType: z.string().optional(),
  }).superRefine((value, ctx) => {
    if (!value.auctionType) {
      ctx.addIssue({ code: "custom", path: ["offers", 0, "auctionType"], message: "نوع المزاد مطلوب عند اختيار التسويق بالمزاد" });
    }
  });
  const errors = issuesOf(schema, {});
  assert.equal(errors[0].message, "نوع المزاد مطلوب عند اختيار التسويق بالمزاد");
  assert.equal(errors[0].field, "offers.auctionType");
  assert.equal(errors[0].step, 4);
});

// ---- fields, labels and steps --------------------------------------------

test("an indexed path is labelled and stepped by its indexless form", () => {
  const errors = issuesOf(
    z.object({ offers: z.array(z.object({ price: z.number().min(1) })) }),
    { offers: [{ price: 0 }, { price: 0 }] },
  );
  assert.equal(errors.length, 2, "each row of a repeater is reported");
  assert.deepEqual(errors.map((error) => error.path), ["offers.0.price", "offers.1.price"]);
  assert.deepEqual(errors.map((error) => error.field), ["offers.price", "offers.price"]);
  assert.ok(errors.every((error) => error.step === 4));
});

test("every field the create schema knows has a label and a step", () => {
  const shape = createPropertySchema.shape ?? {};
  for (const field of Object.keys(shape)) {
    const label = fieldLabelAr([field]);
    assert.match(label, ARABIC, `${field} has no Arabic label`);
    const step = stepForField(field);
    assert.ok(step >= 1 && step <= 5, `${field} -> step ${step}`);
  }
});

test("the fields the failure named land on the step that holds them", () => {
  assert.equal(stepForField("titleAr"), 1);
  assert.equal(stepForField("city"), 2);
  assert.equal(stepForField("area"), 3);
  assert.equal(stepForField("price"), 4);
  assert.equal(stepForField("offers.price"), 4);
  assert.equal(stepForField("media.url"), 5);
  assert.equal(stepForField("images"), 5);
  // An unmapped field falls back rather than throwing.
  assert.equal(stepForField("somethingNew"), 1);
});

// ---- the response body ----------------------------------------------------

test("isZodError recognises a real ZodError and nothing else", () => {
  try {
    z.string().min(5).parse("a");
    assert.fail("should have thrown");
  } catch (error) {
    assert.ok(isZodError(error));
  }
  assert.equal(isZodError(new Error("boom")), false);
  assert.equal(isZodError({ name: "ZodError" }), false, "must have issues");
  assert.equal(isZodError(null), false);
  assert.equal(isZodError("ZodError"), false);
});

test("the body is the one agreed shape and carries no raw Zod text", () => {
  const errors = issuesOf(createPropertySchema, { titleAr: "شقة" });
  const body = validationErrorBody(errors);

  assert.equal(body.ok, false);
  assert.equal(body.success, false);
  assert.equal(body.code, VALIDATION_ERROR_CODE);
  assert.equal(VALIDATION_ERROR_STATUS, 422);
  assert.ok(Array.isArray(body.errors) && body.errors.length > 1);
  assert.match(body.error, /يوجد \d+ حقول غير مكتملة/);

  const serialised = JSON.stringify(body);
  for (const leak of ["too_small", "invalid_type", "Too small", "expected string", '"issues"', "ZodError"]) {
    assert.ok(!serialised.includes(leak), `the body leaked ${leak}`);
  }
});

test("a single failure states the field instead of counting", () => {
  const body = validationErrorBody(issuesOf(z.object({ city: z.string() }), {}));
  assert.equal(body.error, "المدينة مطلوب");
});

// ---- no route may answer with error.message from a Zod failure ------------

test("the property write routes answer Zod failures with the shared body", async () => {
  const { readFile } = await import("node:fs/promises");
  for (const file of [
    "app/api/properties/route.ts",
    "app/api/properties/[id]/route.ts",
    "app/api/program/properties/route.ts",
    "app/api/program/properties/[id]/route.ts",
  ]) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    assert.match(source, /isZodError/, `${file} must catch Zod failures first`);
    assert.match(source, /validationErrorBody\(formatZodError\(error\)\)/, file);
  }
});
