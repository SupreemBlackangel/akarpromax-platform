/**
 * Multilingual survey-table vocabulary.
 *
 * Every column heading a coordinate table can carry, in Arabic and English,
 * mapped to the role it plays. Column order is never assumed: the heading text
 * decides what each column holds.
 *
 * This is the single vocabulary for the whole engine. Country adapters add
 * local wording on top; they never restate what is here.
 */

export type ColumnRole =
  | "LINE"
  | "POINT"
  | "FROM"
  | "TO"
  | "EASTING"
  | "NORTHING"
  | "LATITUDE"
  | "LONGITUDE"
  | "DISTANCE"
  | "BEARING"
  | "AREA"
  | "UNKNOWN";

interface LabelGroup {
  role: ColumnRole;
  /**
   * Terms in descending specificity. `EASTING` must be tested before the bare
   * `E`, or a full heading would be classified by its first letter.
   */
  terms: readonly string[];
}

/**
 * Ordered most specific first. A single letter is only accepted as a whole
 * token, so `E` is a column heading but the `E` in `LINE` is not.
 */
const LABEL_GROUPS: readonly LabelGroup[] = [
  {
    role: "EASTING",
    terms: [
      "easting", "eastings", "east coordinate", "east", "e (m)", "e(m)",
      "الشرقيات", "الاحداثي الشرقي", "الإحداثي الشرقي", "الشرقي", "شرقيات", "شرق",
      "x coordinate", "coord x", "x", "e", "س",
      "sağa", "saga", "sağa değer", "saga deger", "doğu", "dogu",
    ],
  },
  {
    role: "NORTHING",
    terms: [
      "northing", "northings", "north coordinate", "north", "n (m)", "n(m)",
      "الشماليات", "الاحداثي الشمالي", "الإحداثي الشمالي", "الشمالي", "شماليات", "شمال",
      "y coordinate", "coord y", "y", "n", "ص",
      "yukarı", "yukari", "yukarı değer", "yukari deger", "kuzey",
    ],
  },
  {
    role: "LATITUDE",
    terms: ["latitude", "lat.", "lat", "enlem", "خط العرض", "دائرة العرض", "العرض"],
  },
  {
    role: "LONGITUDE",
    terms: ["longitude", "long.", "long", "lon", "lng", "boylam", "خط الطول", "الطول الجغرافي"],
  },
  {
    role: "DISTANCE",
    terms: [
      "distance", "dist.", "dist", "length", "len.", "len", "side length",
      "المسافة", "الطول", "طول الضلع", "الاطوال", "الأطوال",
      "mesafe", "uzunluk", "kenar uzunlugu", "kenar uzunluğu",
    ],
  },
  {
    role: "BEARING",
    terms: ["bearing", "azimuth", "azm", "aci", "açı", "semt", "الاتجاه", "اتجاه", "الزاوية", "زاوية", "الانحراف"],
  },
  {
    role: "AREA",
    terms: ["area", "total area", "alan", "yuzolcumu", "yüzölçümü", "المساحة", "المساحه", "مساحة القطعة", "مساحة القسيمة"],
  },
  {
    role: "LINE",
    terms: ["line", "edge", "segment", "side", "الضلع", "ضلع", "الحد", "خط"],
  },
  {
    role: "FROM",
    terms: ["from", "from point", "start", "baslangic", "başlangıç", "من", "من النقطة", "البداية"],
  },
  {
    role: "TO",
    terms: ["to", "to point", "end", "bitis", "bitiş", "الى", "إلى", "إلى النقطة", "النهاية"],
  },
  {
    role: "POINT",
    terms: [
      "point no", "point number", "point", "pt.", "pt", "vertex", "station", "corner", "id", "no.",
      "رقم النقطة", "النقطة", "نقطة", "الركن", "رقم الركن", "م",
      "nokta no", "nokta", "kose no", "köşe no", "kose", "köşe",
    ],
  },
];

/** Single letters that are only a heading when they stand alone as a token. */
const SINGLE_LETTER_TERMS = new Set(["e", "n", "x", "y", "س", "ص", "م"]);

/**
 * Arabic headings appear with and without the definite article, and no
 * vocabulary stays consistent about it by hand: this file carried both
 * `الضلع` and `ضلع` but only `خط`, so a sheet heading its first column
 * `الخط` went unrecognised. Stripping the article during matching fixes the
 * whole class at once, and keeps the term lists short.
 *
 * Applied only when at least two characters remain, so `ال` itself and
 * three-letter words such as `الى` are left alone.
 */
function stripArabicArticle(value: string): string {
  return value.length >= 4 && value.startsWith("ال") ? value.slice(2) : value;
}

function normalizeLabel(token: string): string {
  const base = token
    .toLowerCase()
    .replace(/[ً-ْٰ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return stripArabicArticle(base);
}

/**
 * Bare axis headings, which carry no direction of their own.
 *
 * `X` and `Y` mean different things in different national grids, so they are
 * reported as axes and resolved from context elsewhere rather than being
 * mapped to easting and northing here. {@link classifyColumn} keeps its
 * long-standing behaviour for the flat-text reader; the layout reader asks
 * this function first so it can resolve the axes properly.
 */
const AXIS_X_TERMS: ReadonlySet<string> = new Set(["x", "x m", "coord x", "x coordinate", "س"]);
const AXIS_Y_TERMS: ReadonlySet<string> = new Set(["y", "y m", "coord y", "y coordinate", "ص"]);

export function classifyAxisToken(token: string): "AXIS_X" | "AXIS_Y" | null {
  const normalized = normalizeLabel(token);
  if (!normalized) return null;
  if (AXIS_X_TERMS.has(normalized)) return "AXIS_X";
  if (AXIS_Y_TERMS.has(normalized)) return "AXIS_Y";
  return null;
}

/** The role a column heading token plays, or `UNKNOWN`. */
export function classifyColumn(token: string): ColumnRole {
  const normalized = normalizeLabel(token);
  if (!normalized) return "UNKNOWN";

  for (const group of LABEL_GROUPS) {
    for (const term of group.terms) {
      const candidate = normalizeLabel(term);
      if (!candidate) continue;
      if (SINGLE_LETTER_TERMS.has(candidate)) {
        if (normalized === candidate) return group.role;
        continue;
      }
      if (normalized === candidate) return group.role;
    }
  }

  // A heading may carry a unit or a qualifier, e.g. `EASTING (m)`.
  for (const group of LABEL_GROUPS) {
    for (const term of group.terms) {
      const candidate = normalizeLabel(term);
      if (candidate.length < 3 || SINGLE_LETTER_TERMS.has(candidate)) continue;
      if (normalized.startsWith(`${candidate} `) || normalized.endsWith(` ${candidate}`)) {
        return group.role;
      }
    }
  }

  return "UNKNOWN";
}

/**
 * Splits a heading line into its column tokens.
 *
 * Columns may be separated by a pipe, a tab, several spaces, or a single
 * space. Splitting on single spaces alone would break a multi-word heading
 * such as `رقم النقطة`, so the wider separators are tried first and the
 * narrow split is only used when the wide one does not yield columns.
 */
export function splitHeadingTokens(line: string): string[] {
  const wide = line.split(/[|\t]|\s{2,}/).map((token) => token.trim()).filter(Boolean);
  if (wide.length >= 2) return wide;
  return line.split(/[|\t]|\s+/).map((token) => token.trim()).filter(Boolean);
}

/**
 * Token-wise comparison. Joining with a space would call `["A B", "C"]` and
 * `["A", "B", "C"]` equal, which is precisely the difference between the two
 * tokenizations this function exists to tell apart.
 */
function sameTokens(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((token, index) => token === right[index]);
}

function candidateTokenizations(line: string): string[][] {
  const wide = line.split(/[|\t]|\s{2,}/).map((token) => token.trim()).filter(Boolean);
  const narrow = line.split(/[|\t]|\s+/).map((token) => token.trim()).filter(Boolean);
  const candidates: string[][] = [];
  if (wide.length >= 2) candidates.push(wide);
  if (narrow.length >= 2 && !sameTokens(narrow, wide)) candidates.push(narrow);
  return candidates;
}

function hasCoordinatePair(roles: readonly ColumnRole[]): boolean {
  return (
    (roles.includes("EASTING") && roles.includes("NORTHING"))
    || (roles.includes("LATITUDE") && roles.includes("LONGITUDE"))
  );
}

/**
 * Classifies a heading line into column roles.
 *
 * Returns `null` when the line does not read as a coordinate-table heading:
 * a coordinate pair must be recognised, so a sentence that happens to contain
 * the word "area" is not mistaken for a table.
 *
 * When both tokenizations produce a valid heading, the one that leaves fewest
 * tokens unrecognised wins — that is the one that split the columns correctly.
 */
export function classifyHeadingLine(line: string): { roles: ColumnRole[]; tokens: string[] } | null {
  let best: { roles: ColumnRole[]; tokens: string[]; score: number } | null = null;

  for (const raw of candidateTokenizations(line)) {
    if (raw.length > 12) continue;
    const tokens = [...raw];
    const roles = tokens.map(classifyColumn);

    // In text whose line breaks were lost, the heading trails the prose that
    // preceded it: `… NO PERSONAL DATA WGS84 40N LINE | EASTING | …`. When the
    // first token ends in a heading word, that word is the real column.
    if (roles[0] === "UNKNOWN" && /\s/.test(tokens[0])) {
      const lastWord = tokens[0].split(/\s+/).pop() ?? "";
      const trailingRole = classifyColumn(lastWord);
      if (trailingRole !== "UNKNOWN") {
        tokens[0] = lastWord;
        roles[0] = trailingRole;
      }
    }

    if (!hasCoordinatePair(roles)) continue;

    const recognised = roles.filter((role) => role !== "UNKNOWN").length;
    const unknown = roles.length - recognised;
    const score = recognised - unknown;
    if (!best || score > best.score) best = { roles, tokens, score };
  }

  return best ? { roles: best.roles, tokens: best.tokens } : null;
}

/** Index of the first column that holds a coordinate value. */
export function firstCoordinateColumn(roles: readonly ColumnRole[]): number {
  return roles.findIndex(
    (role) => role === "EASTING" || role === "NORTHING" || role === "LATITUDE" || role === "LONGITUDE",
  );
}

/** Terms that introduce a coordinate table even when no heading row follows. */
export const TABLE_INTRODUCTION_TERMS: readonly string[] = [
  "coordinate table",
  "coordinate schedule",
  "coordinates",
  "boundary coordinates",
  "جدول الإحداثيات",
  "جدول الاحداثيات",
  "الإحداثيات",
  "الاحداثيات",
  "كشف الإحداثيات",
];
