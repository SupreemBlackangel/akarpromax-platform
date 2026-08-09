# Policy Acceptance Architecture

REQUIRES HUMAN LEGAL REVIEW BEFORE PRODUCTION

## Target model

- policyId
- policyVersion
- userId
- acceptedAt
- context

## Contextual acceptance

- registration: terms + privacy
- property publishing: listing policy
- service request: services marketplace terms
- professional onboarding: provider terms
- future supplier/product actions: supplier terms

## Current state

- full versioned acceptance storage is not yet implemented as a dedicated subsystem
- should be added before production-scale legal enforcement
