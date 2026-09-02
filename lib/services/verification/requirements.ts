/**
 * What a provider must submit to be verified, and whether they have.
 *
 * There was a policy table -- `verification-policies.ts` -- listing required
 * documents per provider kind. Nothing imported it, and its vocabulary did not
 * even overlap the one the upload form offers: the policy asked for `identity`,
 * `certificate`, `commercial_registration` and `representative_identity` while
 * the form offered `national_id`, `license`, `commercial_register` and `other`.
 * Three of the four form options matched no requirement, and several required
 * types could not be uploaded at all. Even wired in, no provider could ever
 * have satisfied it.
 *
 * So the document vocabulary lives here, once, and both the form and the
 * requirements read it. A type that cannot be uploaded cannot be required.
 */

export const DOCUMENT_TYPES = {
  NATIONAL_ID: "national_id",
  COMMERCIAL_REGISTER: "commercial_register",
  LICENSE: "license",
  PROFESSIONAL_CERTIFICATE: "professional_certificate",
  TAX_REGISTRATION: "tax_registration",
  INSURANCE: "insurance",
  OTHER: "other",
} as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[keyof typeof DOCUMENT_TYPES];

export const DOCUMENT_LABELS: Record<DocumentType, { ar: string; en: string }> = {
  national_id: { ar: "إثبات الهوية", en: "Identity document" },
  commercial_register: { ar: "السجل التجاري", en: "Commercial register" },
  license: { ar: "رخصة مزاولة المهنة", en: "Professional licence" },
  professional_certificate: { ar: "شهادة مهنية", en: "Professional certificate" },
  tax_registration: { ar: "التسجيل الضريبي", en: "Tax registration" },
  insurance: { ar: "وثيقة تأمين", en: "Insurance policy" },
  other: { ar: "مستند آخر", en: "Other document" },
};

export function isDocumentType(value: unknown): value is DocumentType {
  return typeof value === "string" && Object.values(DOCUMENT_TYPES).includes(value as DocumentType);
}

/**
 * The kinds of provider the platform distinguishes.
 *
 * The profile table records `is_business`, not a provider type, so that is what
 * this reads. A richer taxonomy (craftsman / freelancer / engineer / office /
 * company) is a schema change and is not invented here.
 */
export type ProviderKind = "individual" | "business";

export function providerKind(profile: { is_business?: unknown } | null | undefined): ProviderKind {
  return profile && Number(profile.is_business) === 1 ? "business" : "individual";
}

export type Requirements = { required: DocumentType[]; optional: DocumentType[] };

const BASE_REQUIREMENTS: Record<ProviderKind, Requirements> = {
  individual: {
    required: [DOCUMENT_TYPES.NATIONAL_ID],
    optional: [DOCUMENT_TYPES.LICENSE, DOCUMENT_TYPES.PROFESSIONAL_CERTIFICATE, DOCUMENT_TYPES.INSURANCE],
  },
  business: {
    required: [DOCUMENT_TYPES.COMMERCIAL_REGISTER, DOCUMENT_TYPES.NATIONAL_ID],
    optional: [DOCUMENT_TYPES.LICENSE, DOCUMENT_TYPES.TAX_REGISTRATION, DOCUMENT_TYPES.INSURANCE],
  },
};

/**
 * Per-country additions, keyed by uppercase ISO code -- the case the services
 * domain stores. A country absent from this map simply uses the base
 * requirements; adding a market is data, not code.
 */
const COUNTRY_ADDITIONS: Record<string, Partial<Record<ProviderKind, DocumentType[]>>> = {
  OM: { business: [DOCUMENT_TYPES.TAX_REGISTRATION] },
};

export function requirementsFor(kind: ProviderKind, countryCode?: string | null): Requirements {
  const base = BASE_REQUIREMENTS[kind];
  const extra = COUNTRY_ADDITIONS[String(countryCode ?? "").toLocaleUpperCase("en")]?.[kind] ?? [];
  const required = [...new Set([...base.required, ...extra])];
  // A type promoted to required for this country must not still be listed as
  // optional, or the UI would offer it twice with different weight.
  return { required, optional: base.optional.filter((type) => !required.includes(type)) };
}

export type DocumentRow = { type?: unknown; verified?: unknown };

export type VerificationAssessment = {
  required: DocumentType[];
  /** Required types with no document uploaded at all. */
  missing: DocumentType[];
  /** Required types uploaded but not yet approved by a reviewer. */
  awaitingReview: DocumentType[];
  /** Required types with an approved document. */
  satisfied: DocumentType[];
  /** Enough has been uploaded to send the application for review. */
  canSubmit: boolean;
  /** Every requirement has an approved document. */
  canApprove: boolean;
};

export function assessVerification(
  kind: ProviderKind,
  documents: DocumentRow[],
  countryCode?: string | null,
): VerificationAssessment {
  const { required } = requirementsFor(kind, countryCode);
  const uploaded = new Set<string>();
  const approved = new Set<string>();
  for (const document of documents) {
    if (!isDocumentType(document.type)) continue;
    uploaded.add(document.type);
    if (Number(document.verified) === 1) approved.add(document.type);
  }

  const missing = required.filter((type) => !uploaded.has(type));
  const satisfied = required.filter((type) => approved.has(type));
  const awaitingReview = required.filter((type) => uploaded.has(type) && !approved.has(type));

  return {
    required,
    missing,
    awaitingReview,
    satisfied,
    // Submitting needs the documents present; approving needs them checked.
    // Conflating the two would either block providers behind a review that has
    // not started, or let a reviewer approve an application with nothing in it.
    canSubmit: missing.length === 0,
    canApprove: missing.length === 0 && awaitingReview.length === 0,
  };
}
