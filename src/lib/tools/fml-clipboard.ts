/**
 * What leaves this tool on the clipboard.
 *
 * A surveyor copies coordinates to paste them into AutoCAD, a spreadsheet or a
 * total station, and every one of those wants a different shape. The tool used
 * to offer exactly one: a five-column table headed
 * `Point / UTM Zone / EPSG / Easting (X) / Northing (Y)`. Pasted into a CAD
 * command line that is not a coordinate list, it is a paragraph — the zone and
 * the EPSG code are metadata about the numbers, not numbers, and they sit in
 * the middle of every row.
 *
 * So the metadata moves to the button's tooltip, where it can be read, and the
 * clipboard carries points.
 *
 * Three rules hold across every format, because the receiving program is not a
 * person and does not read Arabic:
 *   - Latin digits and a decimal point, whatever the interface language.
 *   - `\n` between rows, none at the end.
 *   - The document's values, rounded only by `toFixed` — no renumbering, and a
 *     repeated closing point stays a row, because it is one in the document.
 */

export type CopyFormat = "en" | "ne" | "csv" | "acad" | "wgs84";

export interface CopyRow {
  label: string;
  easting: number;
  northing: number;
  lat?: number;
  lon?: number;
}

/** Metric values keep millimetres; nothing else is rounded. */
const metric = (value: number): string => value.toFixed(3);
/** ~1mm of latitude, which is the precision a WGS84 pair is worth. */
const geographic = (value: number): string => value.toFixed(8);

/**
 * The number the document gave the point.
 *
 * `P1`..`Pn` is what this tool invents when the document numbered nothing, and
 * pasting an invented `P` into a coordinate column breaks it. A real survey
 * number — `23915169`, or a `12-13` line id — is never touched.
 */
function normalizeLabel(label: string): string {
  const synthetic = /^P(\d+)$/i.exec(label.trim());
  return synthetic ? synthetic[1] : label.trim();
}

/** True when the ring closes by repeating its first point as its last row. */
function closesOnItself(rows: readonly CopyRow[]): boolean {
  if (rows.length < 3) return false;
  const first = rows[0];
  const last = rows[rows.length - 1];
  return first.easting === last.easting && first.northing === last.northing;
}

/** A row can only be written in WGS84 if it carries a WGS84 pair. */
export function hasGeographicPair(row: CopyRow): boolean {
  return Number.isFinite(row.lat) && Number.isFinite(row.lon);
}

/** A row can only be written in a metric format if it carries a metric pair. */
export function hasProjectedPair(row: CopyRow): boolean {
  return Number.isFinite(row.easting) && Number.isFinite(row.northing);
}

/**
 * Whether a format can be produced from these rows at all.
 *
 * A geographic-only document has no eastings until it is projected, and a
 * projected one may have no WGS84 pair; in both cases the button is disabled
 * rather than copying `NaN,NaN`, which pastes into CAD as a point at the
 * origin and looks like a reading rather than a gap.
 */
export function canFormat(rows: readonly CopyRow[], format: CopyFormat): boolean {
  if (rows.length === 0) return false;
  if (format === "wgs84") return rows.every(hasGeographicPair);
  return rows.every(hasProjectedPair);
}

export function formatPoints(rows: readonly CopyRow[], format: CopyFormat): string {
  if (rows.length === 0) return "";

  switch (format) {
    case "en":
      return rows
        .map((row) => `${normalizeLabel(row.label)}\t${metric(row.easting)},${metric(row.northing)}`)
        .join("\n");

    case "ne":
      return rows
        .map((row) => `${normalizeLabel(row.label)}\t${metric(row.northing)},${metric(row.easting)}`)
        .join("\n");

    case "csv":
      return [
        "Point,Easting,Northing",
        ...rows.map((row) => `${normalizeLabel(row.label)},${metric(row.easting)},${metric(row.northing)}`),
      ].join("\n");

    case "acad": {
      // `C` closes the polyline, so repeating the first point as the last
      // vertex would leave AutoCAD with a zero-length final segment.
      const vertices = closesOnItself(rows) ? rows.slice(0, -1) : rows;
      return ["_PLINE", ...vertices.map((row) => `${metric(row.easting)},${metric(row.northing)}`), "C"].join("\n");
    }

    case "wgs84": {
      if (!canFormat(rows, "wgs84")) return "";
      return rows
        .map((row) => `${normalizeLabel(row.label)}\t${geographic(row.lat as number)},${geographic(row.lon as number)}`)
        .join("\n");
    }

    default: {
      // A format name that is not one of ours copies nothing rather than
      // silently copying the default and looking like it worked.
      const exhaustive: never = format;
      void exhaustive;
      return "";
    }
  }
}

export const COPY_FORMATS: readonly CopyFormat[] = ["en", "ne", "csv", "acad", "wgs84"];

export const COPY_FORMAT_STORAGE_KEY = "fml.copyFormat";

export function isCopyFormat(value: unknown): value is CopyFormat {
  return typeof value === "string" && (COPY_FORMATS as readonly string[]).includes(value);
}

/**
 * The remembered choice, as an external store.
 *
 * A surveyor pastes into the same program every day, so the format is worth
 * remembering — but `localStorage` does not exist during the server render,
 * and reading it in an effect is a `setState` in an effect, which flashes the
 * default before the real value and is a lint error besides. `useSyncExternalStore`
 * is the shape React has for exactly this: the server renders the default, the
 * client's first paint already has the stored value.
 *
 * The `storage` event carries changes from another tab; the local one carries
 * changes from this tab, which `storage` does not fire for.
 */
const COPY_FORMAT_EVENT = "fml:copy-format";
const DEFAULT_COPY_FORMAT: CopyFormat = "en";

export function subscribeCopyFormat(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(COPY_FORMAT_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(COPY_FORMAT_EVENT, onChange);
  };
}

export function readCopyFormat(): CopyFormat {
  try {
    const stored = window.localStorage.getItem(COPY_FORMAT_STORAGE_KEY);
    return isCopyFormat(stored) ? stored : DEFAULT_COPY_FORMAT;
  } catch {
    // A browser with site data blocked keeps the default; nothing else breaks.
    return DEFAULT_COPY_FORMAT;
  }
}

/** What the server renders, and what a viewer with no stored choice gets. */
export function serverCopyFormat(): CopyFormat {
  return DEFAULT_COPY_FORMAT;
}

export function writeCopyFormat(next: CopyFormat): void {
  try {
    window.localStorage.setItem(COPY_FORMAT_STORAGE_KEY, next);
  } catch {
    // The choice still applies to this session through the event below.
  }
  window.dispatchEvent(new Event(COPY_FORMAT_EVENT));
}
