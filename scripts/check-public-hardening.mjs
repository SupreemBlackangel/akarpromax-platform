import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const failures = [];
const read = (p) => fs.readFileSync(path.join(root,p),"utf8");
const mustExist = [
  "src/config/standard-public-ad-registry.ts",
  "src/config/public-ad-policy.ts",
  "src/components/public/public-page-shell-client.tsx",
  "src/lib/organizations/public-mode.ts",
];
for (const p of mustExist) if (!fs.existsSync(path.join(root,p))) failures.push(`missing ${p}`);
if (fs.existsSync(path.join(root,"src/components/public/public-page-shell.tsx"))) failures.push("obsolete public-page-shell.tsx still exists");
const registry = read("src/config/standard-public-ad-registry.ts");
const layout = read("src/config/standard-public-ad-layout.ts");
const advertising = read("src/constants/advertising.ts");
const nav = read("src/config/public-navigation.ts");
const destinations = read("src/content/public-destinations.ts");
const engine = read("lib/ads/engine.ts");
if (/CANONICAL_SLOT_IDS/.test(layout)) failures.push("duplicate CANONICAL_SLOT_IDS remains in standard-public-ad-layout.ts");
if (/STANDARD_WEBSITE_FAMILIES/.test(advertising)) failures.push("duplicate STANDARD_WEBSITE_FAMILIES remains in advertising.ts");
if (!/PUBLIC_ROUTE_AD_POLICIES/.test(nav) || !/PUBLIC_ROUTE_AD_POLICIES/.test(destinations)) failures.push("public route ad policy is not centralized");
if (!/canonicalPlacementFor/.test(engine)) failures.push("canonical placement matching is missing from ads engine");
for (const base of ["app","lib","src"]) {
  const start=path.join(root,base); if(!fs.existsSync(start)) continue;
  const stack=[start];
  while(stack.length){const d=stack.pop(); for(const e of fs.readdirSync(d,{withFileTypes:true})){const f=path.join(d,e.name); if(e.isDirectory()) stack.push(f); else if(/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(e.name)){const t=fs.readFileSync(f,"utf8"); if(t.includes("???? ???????...")) failures.push(`${path.relative(root,f)}: damaged Arabic loading text remains`);}}}
}
if (failures.length) { console.error("PUBLIC_HARDENING_FAIL"); for(const f of failures) console.error(`- ${f}`); process.exit(1); }
console.log("PUBLIC_HARDENING_PASS");
