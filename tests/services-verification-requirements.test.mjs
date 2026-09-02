import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import {
  DOCUMENT_TYPES,
  DOCUMENT_LABELS,
  isDocumentType,
  providerKind,
  requirementsFor,
  assessVerification,
} from "../lib/services/verification/requirements.ts";

/**
 * The verification policy layer was 21 lines, imported by nothing, and asked
 * for documents the upload form could not produce: it required `identity`,
 * `certificate`, `commercial_registration` and `representative_identity` while
 * the form offered `national_id`, `license`, `commercial_register` and `other`.
 * Three of the four form options matched no requirement and several required
 * types had no upload option at all, so even wired in it would have made
 * verification impossible rather than possible.
 */

const read = (rel) => readFile(new URL(`../${rel}`, import.meta.url), "utf8");

// ---- the vocabularies cannot drift apart again ------------------------------

test("every requirable document type is one the form can produce", async () => {
  const page = await read("app/dashboard/services/provider-profile/page.tsx");
  assert.match(page, /Object\.values\(DOCUMENT_TYPES\)\.map/, "the selector must be generated, not hand-listed");
  assert.doesNotMatch(page, /<option value="commercial_register">/, "a hand-written list is what drifted last time");
  // Dashboard pages reach the services domain only through @services-client;
  // importing lib/services directly is the boundary the suite already guards.
  assert.match(page, /DOCUMENT_TYPES, DOCUMENT_LABELS \} from "@services-client"/);
});

test("every type carries a label in both languages", () => {
  for (const type of Object.values(DOCUMENT_TYPES)) {
    assert.ok(DOCUMENT_LABELS[type]?.ar, `${type} needs an Arabic label`);
    assert.ok(DOCUMENT_LABELS[type]?.en, `${type} needs an English label`);
  }
});

test("required types are all real document types", () => {
  for (const kind of ["individual", "business"]) {
    for (const country of [null, "OM", "SA"]) {
      const { required, optional } = requirementsFor(kind, country);
      for (const type of [...required, ...optional]) {
        assert.ok(isDocumentType(type), `${kind}/${country} requires unknown type ${type}`);
      }
    }
  }
});

test("an unknown type is refused", () => {
  assert.equal(isDocumentType("identity"), false, "the old policy vocabulary is not accepted");
  assert.equal(isDocumentType("commercial_registration"), false);
  assert.equal(isDocumentType(""), false);
  assert.equal(isDocumentType(null), false);
  assert.equal(isDocumentType(DOCUMENT_TYPES.NATIONAL_ID), true);
});

// ---- requirements -----------------------------------------------------------

test("provider kind comes from the column the profile actually has", () => {
  assert.equal(providerKind({ is_business: 1 }), "business");
  assert.equal(providerKind({ is_business: 0 }), "individual");
  assert.equal(providerKind(null), "individual", "a missing profile must not be treated as a company");
});

test("a business needs its commercial register, an individual does not", () => {
  assert.ok(requirementsFor("business").required.includes(DOCUMENT_TYPES.COMMERCIAL_REGISTER));
  assert.ok(!requirementsFor("individual").required.includes(DOCUMENT_TYPES.COMMERCIAL_REGISTER));
  assert.ok(requirementsFor("individual").required.includes(DOCUMENT_TYPES.NATIONAL_ID));
});

test("a country can add a requirement without touching the engine", () => {
  const base = requirementsFor("business", "SA").required;
  const oman = requirementsFor("business", "OM").required;
  assert.ok(oman.includes(DOCUMENT_TYPES.TAX_REGISTRATION));
  assert.ok(!base.includes(DOCUMENT_TYPES.TAX_REGISTRATION));
  assert.equal(requirementsFor("business", "om").required.length, oman.length, "the code's case must not change the answer");
});

test("a type promoted to required is not still offered as optional", () => {
  const { required, optional } = requirementsFor("business", "OM");
  for (const type of required) {
    assert.ok(!optional.includes(type), `${type} is listed twice with different weight`);
  }
});

// ---- assessment -------------------------------------------------------------

const doc = (type, verified = 0) => ({ type, verified });

test("an application with nothing uploaded cannot be submitted", () => {
  const result = assessVerification("individual", []);
  assert.equal(result.canSubmit, false, "an application used to reach a reviewer with no identity document at all");
  assert.deepEqual(result.missing, [DOCUMENT_TYPES.NATIONAL_ID]);
});

test("submitting needs the documents present, approving needs them checked", () => {
  const result = assessVerification("individual", [doc(DOCUMENT_TYPES.NATIONAL_ID)]);
  assert.equal(result.canSubmit, true, "the provider has done their part");
  assert.equal(result.canApprove, false, "but nobody has looked at it yet");
  assert.deepEqual(result.awaitingReview, [DOCUMENT_TYPES.NATIONAL_ID]);
});

test("an approved document satisfies its requirement", () => {
  const result = assessVerification("individual", [doc(DOCUMENT_TYPES.NATIONAL_ID, 1)]);
  assert.equal(result.canApprove, true);
  assert.deepEqual(result.satisfied, [DOCUMENT_TYPES.NATIONAL_ID]);
  assert.deepEqual(result.awaitingReview, []);
});

test("optional documents do not satisfy a missing requirement", () => {
  const result = assessVerification("business", [doc(DOCUMENT_TYPES.INSURANCE, 1), doc(DOCUMENT_TYPES.OTHER, 1)]);
  assert.equal(result.canSubmit, false);
  assert.ok(result.missing.includes(DOCUMENT_TYPES.COMMERCIAL_REGISTER));
  assert.ok(result.missing.includes(DOCUMENT_TYPES.NATIONAL_ID));
});

test("a document filed under an unknown type counts for nothing", () => {
  const result = assessVerification("individual", [doc("identity", 1)]);
  assert.equal(result.canSubmit, false, "the old vocabulary must not silently satisfy a requirement");
});

test("submission is gated on the assessment, not just on having a category", async () => {
  const marketplace = await read("lib/services/marketplace.ts");
  assert.match(marketplace, /assessVerification\(providerKind\(provider\), documents/);
  assert.match(marketplace, /PROVIDER_DOCUMENTS_MISSING/);
});
