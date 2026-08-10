/**
 * @deprecated The "Sponsor" product concept has been removed from AkarProMax.
 * This module is a TEMPORARY compatibility shim that only re-exports the
 * neutral canonical identity module `lib/identity-auth.ts`. It contains ZERO
 * sponsor business logic.
 *
 * New code should import from `@/lib/identity-auth` (e.g. `UserIdentity`,
 * `getSessionIdentity`, `hasPermission`). The legacy export names below are
 * deprecated aliases retained only to avoid a broad risky refactor of existing
 * importers; migrate them opportunistically.
 */
export type { SponsorRole } from "@/src/constants/roles";
export type { UserIdentity } from "@/lib/identity-auth";
export {
  GUEST_IDENTITY,
  canManageCountry,
  getSessionIdentity,
  requireAuthenticatedEmail,
  requireSessionUser,
  setSessionIdentityResolverForTests,
} from "@/lib/identity-auth";

/** @deprecated use `getSessionIdentity` from `@/lib/identity-auth`. */
export { getSessionIdentity as getSponsorIdentity } from "@/lib/identity-auth";
/** @deprecated use `hasPermission` from `@/lib/identity-auth`. */
export { hasPermission as hasSponsorPermission } from "@/lib/identity-auth";
/** @deprecated use `UserIdentity` from `@/lib/identity-auth`. */
export type { UserIdentity as SponsorIdentity } from "@/lib/identity-auth";
