import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
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
