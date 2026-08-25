/**
 * Which OCR languages to load for a document.
 *
 * Tesseract fetches a trained-data file per language, so loading all of them
 * for every upload costs every user the download and the recognition time of
 * scripts their document does not contain. Equally, a Turkish krokisi read
 * with Arabic and English models loses its diacritics and its parcel numbers.
 *
 * The document itself decides: script and vocabulary evidence pick the models,
 * English always rides along because survey sheets label their columns in it,
 * and the region's default is used when a document says nothing at all.
 */

/** Arabic script anywhere in the text. */
const ARABIC_SCRIPT = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;

/** Letters that only Turkish orthography uses, plus its cadastral vocabulary. */
const TURKISH_LETTERS = /[ğĞşŞıİ]/;
const TURKISH_TERMS = /(?:aplikasyon|krokis[iı]|\bkroki\b|\bparsel\b|\bada\b|\bpafta\b|kadastro|\btapu\b|\bimar\b|mahalle|il[çc]e(?:si)?\b|mevkii|koordinat|\bitrf\b|\bed50\b)/i;

export const DEFAULT_LANGUAGES = "ara+eng";
export const FALLBACK_LANGUAGE = "eng";

/**
 * The Tesseract language string for a document.
 *
 * @param text  Native text, OCR text, or both — whatever is known so far.
 * @param fileName  Considered too: a file is often named in its own language.
 */
export function chooseOcrLanguages(text: string, fileName = ""): string {
  const sample = `${fileName}\n${text}`;
  const arabic = ARABIC_SCRIPT.test(sample);
  const turkish = TURKISH_LETTERS.test(sample) || TURKISH_TERMS.test(sample);

  if (arabic && turkish) return "ara+eng+tur";
  if (turkish) return "tur+eng";
  if (arabic) return "ara+eng";
  return DEFAULT_LANGUAGES;
}

/** The individual models a language string asks for. */
export function languageList(languages: string): string[] {
  return languages.split("+").map((part) => part.trim()).filter(Boolean);
}

/**
 * Creates a worker for the chosen languages, degrading rather than failing.
 *
 * A trained-data file can be missing from the host the app is deployed behind,
 * or unreachable on a restricted network. Losing a language is a degraded
 * read; throwing here would lose the whole document.
 */
export async function createOcrWorkerWithFallback<TWorker>(
  create: (languages: string) => Promise<TWorker>,
  languages: string,
  onDegrade?: (attempted: string, used: string, error: Error) => void,
): Promise<{ worker: TWorker; languages: string }> {
  try {
    return { worker: await create(languages), languages };
  } catch (error) {
    const list = languageList(languages);
    // Try each model on its own so one missing file does not cost the rest.
    for (const single of list) {
      if (single === FALLBACK_LANGUAGE) continue;
      try {
        const worker = await create(`${single}+${FALLBACK_LANGUAGE}`);
        onDegrade?.(languages, `${single}+${FALLBACK_LANGUAGE}`, error as Error);
        return { worker, languages: `${single}+${FALLBACK_LANGUAGE}` };
      } catch {
        continue;
      }
    }
    const worker = await create(FALLBACK_LANGUAGE);
    onDegrade?.(languages, FALLBACK_LANGUAGE, error as Error);
    return { worker, languages: FALLBACK_LANGUAGE };
  }
}
