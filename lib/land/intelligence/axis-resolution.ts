/**
 * Which column is easting and which is northing.
 *
 * `X` and `Y` do not mean the same thing everywhere. A Gulf survey sheet
 * headed `X / Y` usually means easting then northing; a Turkish cadastral
 * sheet headed `Y / X` means the opposite, because the national convention
 * puts the easting on `Y`. Hard-coding either reading is how a parcel ends up
 * hundreds of kilometres from where it belongs — confidently.
 *
 * So the axes are not decided by a rule. Several independent signals are
 * gathered — heading semantics, coordinate-system evidence, numeric
 * plausibility, repeated row structure, regional convention — and an
 * assignment is only called confident when at least two of them agree and
 * none contradicts. Magnitude on its own is never enough: it is one voice,
 * deliberately not the deciding one.
 */

export type AxisRole =
  | "EASTING"
  | "NORTHING"
  | "LATITUDE"
  | "LONGITUDE"
  | "AXIS_X"
  | "AXIS_Y"
  | "UNKNOWN";

export interface AxisColumn {
  columnIndex: number;
  /** The heading exactly as the document wrote it; may be empty. */
  headerToken: string;
  headerRole: AxisRole;
  /** Numeric values read down this column, in row order. */
  values: readonly number[];
}

export interface AxisContext {
  /** Document text, used only for coordinate-system and regional wording. */
  documentText?: string;
  /** A UTM zone the document itself declared, when it did. */
  declaredZone?: number;
  hemisphere?: "N" | "S";
  /** Country evidence from the document. Supporting sanity only. */
  countryCode?: string;
  /** True when the two columns sit side by side in the reconstructed layout. */
  spatiallyAdjacent?: boolean;
}

export type AxisKind = "PROJECTED" | "GEOGRAPHIC";

export interface AxisAssignment {
  kind: AxisKind;
  /** Column holding easting (projected) or longitude (geographic). */
  primaryColumn: number;
  /** Column holding northing (projected) or latitude (geographic). */
  secondaryColumn: number;
  /** Named signals that supported this assignment. */
  evidence: string[];
  /** Named signals that contradicted it. */
  conflicts: string[];
  /** True when at least two independent signals agree and none conflicts. */
  confident: boolean;
}

/** A UTM easting always sits inside the 500 km false-easting envelope. */
const UTM_EASTING_MIN = 100_000;
const UTM_EASTING_MAX = 900_000;
/** Northings run from the equator to the pole in either hemisphere. */
const UTM_NORTHING_MIN = 0;
const UTM_NORTHING_MAX = 10_000_000;

const MIN_STRUCTURAL_ROWS = 3;

function finite(values: readonly number[]): number[] {
  return values.filter((value) => Number.isFinite(value));
}

/**
 * Whether a column's values sit in a range.
 *
 * Deliberately a majority rather than a unanimity: OCR merges a decimal point
 * every few rows and turns `4339530.49` into `433953049`. One corrupted cell
 * must not be able to veto the reading of a whole column — the corrupted rows
 * are rejected individually afterwards, with a reason.
 */
const RANGE_MAJORITY = 0.7;

export function mostlyWithin(
  values: readonly number[],
  min: number,
  max: number,
  ratio: number = RANGE_MAJORITY,
): boolean {
  const usable = finite(values);
  if (usable.length === 0) return false;
  const inside = usable.filter((value) => value >= min && value <= max).length;
  return inside / usable.length >= ratio;
}

/** True when a value is a plausible projected easting. */
export function isPlausibleEasting(value: number): boolean {
  return Number.isFinite(value) && value >= UTM_EASTING_MIN && value <= UTM_EASTING_MAX;
}

/** True when a value is a plausible projected northing. */
export function isPlausibleNorthing(value: number): boolean {
  return Number.isFinite(value) && value >= UTM_NORTHING_MIN && value <= UTM_NORTHING_MAX;
}

/**
 * Turkish national grid sheets label the easting `Y` (sağa değer) and the
 * northing `X` (yukarı değer). Treated as supporting evidence when the
 * document actually reads as Turkish — never as a country rule that can
 * create a reading on its own.
 */
const TURKISH_MARKERS = /(?:aplikasyon|krokis[iı]|kroki|parsel\b|\bada\b|ilçe|ilce|mahalle|sağa|saga|yukar[iı]|itrf|ed50|tapu|kadastro)/i;
/** Explicit wording that names the axes outright, in any of the three languages. */
const EASTING_WORDS = /(?:easting|east\s*coordinate|sağa|saga|شرقيات|الاحداثي\s*الشرقي|الإحداثي\s*الشرقي)/i;
const NORTHING_WORDS = /(?:northing|north\s*coordinate|yukar[iı]|شماليات|الاحداثي\s*الشمالي|الإحداثي\s*الشمالي)/i;

function looksProjected(values: readonly number[]): boolean {
  return mostlyWithin(values.map((value) => Math.abs(value)), 1_000, Number.POSITIVE_INFINITY);
}

function looksGeographic(values: readonly number[]): boolean {
  const usable = finite(values);
  return usable.length > 0 && usable.every((value) => Math.abs(value) <= 180);
}

/**
 * Resolves two candidate columns into an easting/northing or
 * longitude/latitude assignment.
 *
 * Returns `null` only when the two columns cannot be a coordinate pair at all.
 * A returned assignment with `confident: false` must not be allowed to produce
 * a confident parcel; it is a reading that still needs a human.
 */
export function resolveAxisAssignment(
  first: AxisColumn,
  second: AxisColumn,
  context: AxisContext = {},
): AxisAssignment | null {
  const text = context.documentText ?? "";
  const evidence: string[] = [];
  const conflicts: string[] = [];

  const bothProjected = looksProjected(first.values) && looksProjected(second.values);
  const bothGeographic = looksGeographic(first.values) && looksGeographic(second.values);
  const kind: AxisKind | null = bothProjected ? "PROJECTED" : bothGeographic ? "GEOGRAPHIC" : null;
  if (!kind) return null;

  const rows = Math.min(finite(first.values).length, finite(second.values).length);
  if (rows === 0) return null;

  // Each signal votes for an orientation: `true` = first column is the
  // primary axis (easting / longitude), `false` = the columns are swapped.
  const votes: { name: string; firstIsPrimary: boolean }[] = [];

  // --- Signal 1: heading semantics -------------------------------------
  const named = namedOrientation(first.headerRole, second.headerRole, kind);
  if (named !== null) {
    votes.push({ name: `column headings "${first.headerToken}" / "${second.headerToken}"`, firstIsPrimary: named });
  }

  // --- Signal 2: explicit axis wording anywhere in the document ---------
  if (first.headerRole === "AXIS_X" || first.headerRole === "AXIS_Y" || named === null) {
    const eastingNamed = EASTING_WORDS.test(text);
    const northingNamed = NORTHING_WORDS.test(text);
    if (eastingNamed && northingNamed) {
      const eastingAt = text.search(EASTING_WORDS);
      const northingAt = text.search(NORTHING_WORDS);
      if (eastingAt !== northingAt) {
        votes.push({
          name: "the document names its axes in reading order",
          firstIsPrimary: eastingAt < northingAt,
        });
      }
    }
  }

  // --- Signal 3: numeric plausibility (one voice, never the only one) ---
  if (kind === "PROJECTED") {
    const forward = mostlyWithin(first.values, UTM_EASTING_MIN, UTM_EASTING_MAX)
      && mostlyWithin(second.values, UTM_NORTHING_MIN, UTM_NORTHING_MAX);
    const reverse = mostlyWithin(second.values, UTM_EASTING_MIN, UTM_EASTING_MAX)
      && mostlyWithin(first.values, UTM_NORTHING_MIN, UTM_NORTHING_MAX);
    if (forward !== reverse) {
      votes.push({ name: "grid value ranges", firstIsPrimary: forward });
    } else if (forward && reverse) {
      conflicts.push("both orientations are numerically possible; ranges cannot decide");
    }
  } else {
    const forward = mostlyWithin(second.values, -90, 90) && mostlyWithin(first.values, -180, 180);
    const reverse = mostlyWithin(first.values, -90, 90) && mostlyWithin(second.values, -180, 180);
    if (forward !== reverse) {
      votes.push({ name: "latitude/longitude ranges", firstIsPrimary: forward });
    }
  }

  // --- Signal 4: regional convention, supporting only -------------------
  // The convention only speaks when the document actually labelled an axis
  // `X` or `Y`, and only when the sheet reads as Turkish. A single surviving
  // label is enough to anchor it — the other column is then the other axis by
  // elimination — but it is still one voice among several.
  const namedAxis = [first, second].find(
    (column) => column.headerRole === "AXIS_X" || column.headerRole === "AXIS_Y",
  );
  if (namedAxis && TURKISH_MARKERS.test(text)) {
    const namedIsFirst = namedAxis === first;
    // Y carries the easting on the Turkish national grid; X carries the northing.
    const namedIsPrimary = namedAxis.headerRole === "AXIS_Y";
    votes.push({
      name: `Turkish cadastral convention (Y = easting, X = northing) applied to the "${namedAxis.headerToken}" column, supporting evidence only`,
      firstIsPrimary: namedIsFirst ? namedIsPrimary : !namedIsPrimary,
    });
  }

  // --- Signal 5: repeated row structure ---------------------------------
  if (rows >= MIN_STRUCTURAL_ROWS) {
    evidence.push(`${rows} rows carry a value in both columns`);
  } else {
    conflicts.push(`only ${rows} row(s) carry a value in both columns`);
  }

  // --- Signal 6: spatial adjacency in the reconstructed layout ----------
  if (context.spatiallyAdjacent) evidence.push("the two columns are adjacent in the page layout");

  if (votes.length === 0) {
    return {
      kind,
      primaryColumn: first.columnIndex,
      secondaryColumn: second.columnIndex,
      evidence,
      conflicts: [...conflicts, "nothing in the document says which axis is which"],
      confident: false,
    };
  }

  const forwardVotes = votes.filter((vote) => vote.firstIsPrimary);
  const reverseVotes = votes.filter((vote) => !vote.firstIsPrimary);
  const firstIsPrimary = forwardVotes.length >= reverseVotes.length;
  const agreeing = firstIsPrimary ? forwardVotes : reverseVotes;
  const disagreeing = firstIsPrimary ? reverseVotes : forwardVotes;

  for (const vote of agreeing) evidence.push(vote.name);
  for (const vote of disagreeing) conflicts.push(`${vote.name} reads the axes the other way round`);

  const confident = agreeing.length >= 2 && disagreeing.length === 0 && rows >= MIN_STRUCTURAL_ROWS;

  return {
    kind,
    primaryColumn: firstIsPrimary ? first.columnIndex : second.columnIndex,
    secondaryColumn: firstIsPrimary ? second.columnIndex : first.columnIndex,
    evidence,
    conflicts,
    confident,
  };
}

/** Orientation implied by the two headings alone, or `null` when they are silent. */
function namedOrientation(first: AxisRole, second: AxisRole, kind: AxisKind): boolean | null {
  if (kind === "PROJECTED") {
    if (first === "EASTING" && second === "NORTHING") return true;
    if (first === "NORTHING" && second === "EASTING") return false;
    return null;
  }
  if (first === "LONGITUDE" && second === "LATITUDE") return true;
  if (first === "LATITUDE" && second === "LONGITUDE") return false;
  return null;
}
