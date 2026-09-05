// The owner's name is the office's private record of whose property it is
// (required on every listing since a0ee06c) — never part of the advertisement.
// Three public routes return property rows; each is asserted on its executable
// code so a later edit cannot quietly put the name back.
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (rel) => readFile(new URL(`../${rel}`, import.meta.url), "utf8");

test("the list feed's public field list carries no owner identity", async () => {
  const source = await read("app/api/properties/route.ts");
  const list = /PUBLIC_PROPERTY_FIELDS = \[([\s\S]*?)\] as const;/.exec(source)?.[1] ?? "";
  const fields = [...list.matchAll(/"([A-Za-z]+)"/g)].map((m) => m[1]);
  assert.ok(fields.length > 20 && fields.includes("titleAr"), "the field list was not found");
  for (const secret of ["ownerName", "ownerPhone", "ownerIdentity", "ownerClientId", "userId", "adminNotes"]) {
    assert.ok(!fields.includes(secret), `${secret} must not be a public field`);
  }
});

test("the detail route strips ownerName for anyone but the owner or an admin", async () => {
  const source = await read("app/api/properties/[id]/route.ts");
  const list = /INTERNAL_FIELDS = \[([\s\S]*?)\] as const;/.exec(source)?.[1] ?? "";
  assert.match(list, /'ownerName'/);
  assert.match(source, /if \(!isOwnerOrAdmin\) \{\s*for \(const field of INTERNAL_FIELDS\) delete propertyData\[field\];/);
});

test("the search route drops ownerName from every row before responding", async () => {
  const source = await read("app/api/properties/search/route.ts");
  assert.match(source, /rows\.map\(\(row\) => \{[\s\S]*?delete copy\.ownerName;/);
  assert.doesNotMatch(source, /data: rows,/);
});
