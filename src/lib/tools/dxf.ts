/**
 * The small part of DXF this platform writes.
 *
 * DXF is a list of group-code/value pairs, two lines each, CRLF-separated. The
 * shape is fiddly enough that hand-writing it twice invites two subtly
 * different dialects, so the header, the layer table and the entity writers
 * live here and the drawings live with their tools.
 *
 * R12 (`AC1009`): the oldest format every CAD program still opens, and enough
 * for a closed polyline with labels. Nothing here needs a later one.
 */

/** Three decimals — a millimetre, which is the precision a survey carries. */
export const dxfNumber = (value: number): string => value.toFixed(3);

/** A value that cannot break the two-lines-per-pair structure. */
export function dxfText(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim().slice(0, 120);
}

export type DxfLayer = { name: string; color: number };

/** ACI colour numbers, named so a drawing reads as intent rather than integers. */
export const DXF_COLOR = {
  white: 7,
  red: 1,
  yellow: 2,
  green: 3,
  cyan: 4,
  blue: 5,
  magenta: 6,
} as const;

export class DxfBuilder {
  private readonly lines: string[] = [];

  private pair(...values: Array<string | number>): void {
    for (const value of values) this.lines.push(String(value));
  }

  /**
   * @param insUnits `$INSUNITS`. 6 is metres — without it a receiving drawing
   *   in feet scales the parcel by 3.28 and the area check silently fails.
   */
  constructor(
    private readonly extents: { minX: number; minY: number; maxX: number; maxY: number },
    private readonly layers: readonly DxfLayer[],
    private readonly insUnits = 6,
  ) {}

  private header(): void {
    this.pair("0", "SECTION", "2", "HEADER");
    this.pair("9", "$ACADVER", "1", "AC1009");
    this.pair("9", "$INSUNITS", "70", String(this.insUnits));
    this.pair("9", "$INSBASE", "10", "0.0", "20", "0.0", "30", "0.0");
    this.pair("9", "$EXTMIN", "10", dxfNumber(this.extents.minX), "20", dxfNumber(this.extents.minY), "30", "0.0");
    this.pair("9", "$EXTMAX", "10", dxfNumber(this.extents.maxX), "20", dxfNumber(this.extents.maxY), "30", "0.0");
    this.pair("0", "ENDSEC");

    this.pair("0", "SECTION", "2", "TABLES");
    this.pair("0", "TABLE", "2", "LTYPE", "70", "1");
    this.pair("0", "LTYPE", "2", "CONTINUOUS", "70", "0", "3", "Solid line", "72", "65", "73", "0", "40", "0.0");
    this.pair("0", "ENDTAB");
    this.pair("0", "TABLE", "2", "LAYER", "70", String(this.layers.length + 1));
    this.pair("0", "LAYER", "2", "0", "70", "0", "62", "7", "6", "CONTINUOUS");
    for (const layer of this.layers) {
      this.pair("0", "LAYER", "2", layer.name, "70", "0", "62", String(layer.color), "6", "CONTINUOUS");
    }
    this.pair("0", "ENDTAB");
    this.pair("0", "TABLE", "2", "STYLE", "70", "1");
    this.pair("0", "STYLE", "2", "STANDARD", "70", "0", "40", "0.0", "41", "1.0", "50", "0.0", "71", "0", "42", "1.0", "3", "txt", "4", "");
    this.pair("0", "ENDTAB", "0", "ENDSEC");
    this.pair("0", "SECTION", "2", "BLOCKS", "0", "ENDSEC");
    this.pair("0", "SECTION", "2", "ENTITIES");
  }

  /**
   * A closed boundary, as POLYLINE / VERTEX / SEQEND.
   *
   * It was an LWPOLYLINE carrying `100 AcDbEntity` / `100 AcDbPolyline`. Both
   * of those are R13-and-later constructs, and the header of this file says
   * AC1009 — R12. A reader that believes the header meets an entity that cannot
   * exist in the version it was told to expect, and the boundary is silently
   * dropped: the drawing opens EMPTY. Which is what a surveyor reported.
   *
   * The old POLYLINE sequence is more verbose and is read by everything ever
   * written, including the survey software these drawings actually go to.
   * Group 70 bit 1 is the closed flag, and it is set on the POLYLINE header —
   * the VERTEX entities carry bit 32 to mark them as polyline vertices.
   */
  polyline(layer: string, vertices: readonly { x: number; y: number }[], closed = true): this {
    if (this.lines.length === 0) this.header();
    this.pair(
      "0", "POLYLINE", "8", layer,
      // 66 = "vertices follow", required by R12 readers.
      "66", "1",
      "10", "0.000", "20", "0.000", "30", "0.000",
      "70", closed ? "1" : "0",
    );
    for (const vertex of vertices) {
      this.pair(
        "0", "VERTEX", "8", layer,
        "10", dxfNumber(vertex.x), "20", dxfNumber(vertex.y), "30", "0.000",
        "70", "32",
      );
    }
    this.pair("0", "SEQEND", "8", layer);
    return this;
  }

  text(layer: string, value: string, x: number, y: number, height: number): this {
    if (this.lines.length === 0) this.header();
    this.pair(
      "0", "TEXT", "8", layer,
      "10", dxfNumber(x), "20", dxfNumber(y), "30", "0.000",
      "40", dxfNumber(height), "1", dxfText(value), "7", "STANDARD",
    );
    return this;
  }

  point(layer: string, x: number, y: number): this {
    if (this.lines.length === 0) this.header();
    this.pair("0", "POINT", "8", layer, "10", dxfNumber(x), "20", dxfNumber(y), "30", "0.000");
    return this;
  }

  toString(): string {
    if (this.lines.length === 0) this.header();
    const out = [...this.lines, "0", "ENDSEC", "0", "EOF"];
    return `${out.join("\r\n")}\r\n`;
  }
}
