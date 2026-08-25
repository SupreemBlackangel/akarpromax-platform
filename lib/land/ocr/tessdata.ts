/**
 * OCR language-model availability.
 *
 * A language may be routed and still be unloadable: the trained-data file can
 * be absent from the deployment, or the CDN unreachable behind a restricted
 * network. Selecting a model must therefore go through this module, which
 * verifies what is actually available and degrades a missing language to a
 * warning — never to a crash, a hang, or an HTTP 500.
 *
 * Resolution order for trained data:
 *   1. `AKARPROMAX_TESSDATA_PATH` — an operator-provided directory.
 *   2. `tessdata/` relative to process.cwd() — standard deployment layout.
 *   3. The tesseract.js CDN default (no langPath), for open networks.
 */
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { languageList } from "./languages";

export interface TessdataResolution {
  /** Directory to pass as `langPath`, or undefined for the CDN default. */
  langPath?: string;
  /** Languages whose data is verified or assumed reachable, joined by '+'. */
  languages: string;
  /** Languages dropped because their data cannot be found, with reasons. */
  dropped: { language: string; reason: string }[];
  source: "ENV" | "LOCAL_BUNDLE" | "CDN";
}

/**
 * Portable traineddata resolution — no developer paths, no CDN dependency
 * for mandatory V1 OCR languages.
 *
 * Resolution order:
 *   1. `AKARPROMAX_TESSDATA_PATH` env var — operator override.
 *   2. `tessdata/` relative to process.cwd() — standard deployment layout.
 *   3. CDN fallback for missing languages (graceful degradation, never hang).
 */
function findLocalTessdataDir(): { dir: string; source: "ENV" | "LOCAL_BUNDLE" } | null {
  const envPath = process.env.AKARPROMAX_TESSDATA_PATH?.trim();
  if (envPath && existsSync(envPath)) return { dir: resolve(envPath), source: "ENV" };

  const cwdPath = join(process.cwd(), "tessdata");
  if (existsSync(cwdPath)) return { dir: resolve(cwdPath), source: "LOCAL_BUNDLE" };

  return null;
}

/**
 * Resolves where the requested languages' models will come from, dropping the
 * ones that provably cannot load. With no local source at all the CDN default
 * is kept and runtime fallback (in the worker factory) covers the rest.
 */
export function resolveTessdata(requested: string): TessdataResolution {
  const languages = languageList(requested);
  const dropped: TessdataResolution["dropped"] = [];

  const local = findLocalTessdataDir();
  if (local) {
    const kept = languages.filter((language) => {
      const present = existsSync(join(local.dir, `${language}.traineddata.gz`))
        || existsSync(join(local.dir, `${language}.traineddata`));
      if (!present) dropped.push({ language, reason: `no trained data in ${local.dir}` });
      return present;
    });
    return {
      langPath: local.dir,
      languages: (kept.length > 0 ? kept : ["eng"]).join("+"),
      dropped,
      source: local.source,
    };
  }

  // No local directory found — fall through to CDN, which may still work on
  // open networks. Runtime fallback in the worker factory guards failures.
  return { langPath: undefined, languages: languages.join("+"), dropped, source: "CDN" };
}
