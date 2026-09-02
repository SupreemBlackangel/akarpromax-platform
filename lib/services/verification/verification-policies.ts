/**
 * Superseded by `./requirements.ts`.
 *
 * This file listed required documents per provider kind and was imported by
 * nothing. Its vocabulary did not overlap the one the upload form offers -- it
 * asked for `identity`, `certificate`, `commercial_registration` and
 * `representative_identity` while the form offered `national_id`, `license`,
 * `commercial_register` and `other` -- so three of the four form options
 * matched no requirement and several required types could not be uploaded at
 * all. Wiring it in would have made verification impossible rather than
 * possible.
 *
 * `requirements.ts` owns the document vocabulary that the form and the
 * requirements both read, so a type that cannot be uploaded cannot be required.
 * These re-exports keep any caller working.
 */
export {
  DOCUMENT_TYPES,
  DOCUMENT_LABELS,
  requirementsFor as getVerificationRequirements,
  assessVerification,
  providerKind,
  type DocumentType,
  type ProviderKind,
  type Requirements,
  type VerificationAssessment,
} from "./requirements";
