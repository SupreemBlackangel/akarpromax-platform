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
  const s=read("app/dashboard/offices/page.tsx")+read("app/dashboard/companies/page.tsx");
  assert.match(s,/listUserOrganizationWorkspaces/);
  assert.doesNotMatch(s,/fetch\(['"]\/api\/(offices|companies)/);
  assert.doesNotMatch(s,/dashboard\/(offices|companies)\/new/);
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
