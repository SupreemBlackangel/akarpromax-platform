import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
const read = (p) => fs.readFileSync(p, "utf8");
test("workspace helper scopes memberships", () => {
  const s=read("lib/amrs/workspace.ts");
  assert.match(s,/requestedOrganizationId/);
  assert.match(s,/\["real_estate", "law_office"\]/);
  assert.match(s,/\["business", "other"\]/);
});
test("workspace shells have no demo guest mode or fake company tabs", () => {
  const s=read("src/components/office/OfficeWorkspaceShell.tsx")+read("src/components/company/CompanyWorkspaceShell.tsx");
  assert.doesNotMatch(s,/وضع الضيف|بيانات تجريبية/);
  assert.doesNotMatch(s,/company\/portfolio|company\/capabilities|company\/specialties/);
});
test("my offices and companies are membership-scoped", () => {
  // The two pages now delegate to one shared component, so the scoping lives
  // there. This asserted the call in the pages themselves and so was checking a
  // structure that had moved -- the guarantee never changed.
  const pages = read("app/dashboard/offices/page.tsx") + read("app/dashboard/companies/page.tsx");
  assert.match(pages, /OrgMembershipsPage/, "both pages must go through the shared picker");
  assert.match(pages, /kind="office"/);
  assert.match(pages, /kind="company"/);

  const shared = read("src/components/organization/org-memberships-page.tsx");
  assert.match(shared, /listUserOrganizationWorkspaces\(session\.userId, kind\)/,
    "the list must be scoped to this user's memberships, not to every organization");

  // The original prohibitions still hold, across all three files.
  const all = pages + shared;
  assert.doesNotMatch(all, /fetch\(['"]\/api\/(offices|companies)/);
  assert.doesNotMatch(all, /dashboard\/(offices|companies)\/new/);
});
test("office requests expose no nonexistent detail/offer routes", () => {
  const s=read("app/dashboard/office/property-requests/page.tsx");
  assert.doesNotMatch(s,/office\/offers\/new|property-requests\/\$\{request\.id\}/);
});
test("profile and branches use membership-scoped helpers", () => {
  assert.match(read("lib/amrs/workspace-profile-api.ts"),/resolveUserOrganizationWorkspace/);
  const b=read("lib/amrs/workspace-branches-api.ts");
  assert.match(b,/const FIELDS/); assert.match(b,/canManageOrganization/);
});
test("locked F1/F2 markers remain", () => {
  assert.match(read("app/api/amrs/organizations/route.ts"),/q\.get\("mine"\) === "1"/);
  assert.match(read("lib/amrs/organization-verification.ts"),/VERIFICATION_EXPIRE_BATCH/);
  assert.match(read("lib/db/schema.ts"),/org_member_org_user_unique/);
});
