export function isMissingOrganizationsTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybeError = error as { message?: string; cause?: { message?: string; code?: string } };
  const messages = [maybeError.message, maybeError.cause?.message].filter((value): value is string => Boolean(value));
  return maybeError.cause?.code === "42P01" || messages.some((message) => /relation\s+"organizations"\s+does not exist/i.test(message));
}

export function emptyDirectoryResult(limit: number, offset: number) {
  return { entries: [], total: 0, limit, offset };
}

export function emptyDirectoryStats() {
  return { totalOrganizations: 0, byType: {}, byCountry: {} };
}

export function emptyOrganizationsResult() {
  return { organizations: [], total: 0 };
}
