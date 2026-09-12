import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { readFileSync } from "node:fs";
import { noRawColours } from "./eslint-rules/no-raw-colours.mjs";

// Files that predate the raw-colour rule, as ignore PATTERNS.
// See eslint-raw-colour-allowlist.json.
//
// The square brackets in a Next.js dynamic segment are a glob character class,
// so "app/properties/[id]/page.tsx" matched every path with a p, an i or a d
// there and never the file itself. Every allow-listed route with a dynamic
// segment — around a third of the list — was therefore not exempt at all and
// has been erroring since the rule landed. They are escaped here rather than
// in the JSON so the list stays a list of paths a person can read.
const rawColourAllowlist = JSON.parse(readFileSync(new URL("./eslint-raw-colour-allowlist.json", import.meta.url), "utf8"))
  .files.map((file) => file.replace(/\[/g, "\\[").replace(/\]/g, "\\]"));

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Design tokens only in className (docs/brand-identity.md). New files get
  // the rule; the allow-listed legacy files are exempt until cleaned.
  {
    files: ["app/**/*.{ts,tsx}", "src/**/*.{ts,tsx}"],
    ignores: rawColourAllowlist,
    rules: { "no-restricted-syntax": ["error", ...noRawColours] },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".next*/**",
    "out/**",
    "build/**",
    "**/dist/**",
    "next-env.d.ts",
    // Backup / legacy directories:
    "AkarApp_LIVE/**",
    "_ai-backup/**",
    "_auctions_current_snapshot/**",
    ".*-backup/**",
    ".temp-fix/**",
    ".tmp/**",
    ".vinext/**",
    ".visual-checkpoint/**",
    ".wrangler/**",
    "artifacts/**",
    "tmp/**",
    "scripts/backup/**",
    ".properties-f2-backup/**",
    ".fml-*-backup*/**",
    ".fml-*-backup*",
    "AKARPROMAX_FML_*/**",
    "test-utm.js",
  ]),
]);

export default eslintConfig;
