export const VERIFICATION_POLICIES = {
  professional: {
    required: ['identity', 'certificate', 'license'],
    optional: ['experience', 'specialty_evidence'],
    statuses: ['pending', 'approved', 'rejected', 'expired'],
  },
  office: {
    required: ['commercial_registration', 'real_estate_license', 'representative_identity'],
    optional: ['office_address', 'insurance'],
    statuses: ['pending', 'approved', 'rejected', 'expired'],
  },
  company: {
    required: ['commercial_registration', 'vat_registration', 'industry_license', 'representative_identity'],
    optional: ['certificates', 'insurance'],
    statuses: ['pending', 'approved', 'rejected', 'expired'],
  },
} as const;

export function getVerificationRequirements(type: 'professional' | 'office' | 'company') {
  return VERIFICATION_POLICIES[type] || VERIFICATION_POLICIES.professional;
}
