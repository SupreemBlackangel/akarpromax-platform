import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { readFileSync } from "node:fs";
import { noRawColours } from "./eslint-rules/no-raw-colours.mjs";

// Files that predate the raw-colour rule. See eslint-raw-colour-allowlist.json.
const rawColourAllowlist = JSON.parse(readFileSync(new URL("./eslint-raw-colour-allowlist.json", import.meta.url), "utf8")).files;

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
