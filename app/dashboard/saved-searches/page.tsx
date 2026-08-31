import { redirect } from "next/navigation";

// Duplicate feature stack removed: the canonical saved-searches surface lives
// under the properties dashboard (single API, single UI).
export default function SavedSearchesRedirect() {
  redirect("/dashboard/properties/saved-searches");
}
