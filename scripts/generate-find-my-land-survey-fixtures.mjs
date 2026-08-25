#!/usr/bin/env node
/**
 * Generates the survey-sheet PDF fixtures for Find My Land.
 *
 * The PDFs are written by hand rather than with a PDF library so the corpus can
 * be regenerated anywhere, with no extra dependency and byte-identical output.
 * Every fixture is synthetic: the coordinates describe an invented parcel and
 * no document here comes from a real title or a real owner.
 *
 * Usage: node scripts/generate-find-my-land-survey-fixtures.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(HERE, "..", "tests", "fixtures", "find-my-land");

/** Escapes the characters that are special inside a PDF string literal. */
function escapePdfText(value) {
  return value.replace(/[\\()]/g, (character) => `\\${character}`);
}

/**
 * Builds a single-page PDF with a selectable WinAnsi text layer.
 * Lines are laid out top-down with a fixed leading.
 */
function buildTextPdf(lines, { title }) {
  const content = [
    "BT",
    "/F1 11 Tf",
    "54 780 Td",
    "15 TL",
    ...lines.map((line) => `(${escapePdfText(line)}) Tj T*`),
    "ET",
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842]"
      + " /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
    `<< /Title (${escapePdfText(title)}) /Producer (AkarProMax synthetic survey fixture) >>`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info ${objects.length} 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, "latin1");
}

/**
 * The reference survey sheet: a CRS caption above the table, a `LINE` column
 * carrying the edge topology, and a registered area in the footer.
 */
const REFERENCE_SHEET_LINES = [
  "SYNTHETIC LAND SURVEY SHEET - NO PERSONAL DATA",
  "",
  "WGS84 40N",
  "",
  "LINE    EASTING       NORTHING       DIST",
  "1  2    565150.50     2550415.28     30.00",
  "2  3    565136.78     2550388.60     10.00",
  "3  4    565127.88     2550393.17     30.00",
  "4  1    565141.61     2550419.85     10.00",
  "",
  "AREA = 300 SQ.m",
];

/** The same structure with the columns the other way round. */
const EASTING_LAST_SHEET_LINES = [
  "SYNTHETIC LAND SURVEY SHEET - REVERSED COLUMNS",
  "",
  "Coordinate Reference System: UTM Zone 40N",
  "",
  "POINT   NORTHING      EASTING",
  "1       2550415.28    565150.50",
  "2       2550388.60    565136.78",
  "3       2550393.17    565127.88",
  "4       2550419.85    565141.61",
  "",
  "AREA = 300 SQ.m",
];

/** A sheet with two tables, so the parcel must not absorb the control points. */
const TWO_TABLE_SHEET_LINES = [
  "SYNTHETIC SURVEY SHEET - PARCEL AND CONTROL POINTS",
  "",
  "WGS84 40N",
  "",
  "LINE    EASTING       NORTHING       DIST",
  "1  2    565150.50     2550415.28     30.00",
  "2  3    565136.78     2550388.60     10.00",
  "3  4    565127.88     2550393.17     30.00",
  "4  1    565141.61     2550419.85     10.00",
  "",
  "AREA = 300 SQ.m",
  "",
  "CONTROL STATIONS",
  "STATION EASTING NORTHING",
  "101     560000.00     2540000.00",
  "102     561000.00     2541000.00",
  "103     562000.00     2542000.00",
];

const FIXTURES = [
  {
    file: "09-line-topology-utm.pdf",
    title: "Synthetic survey sheet: LINE topology, UTM 40N",
    lines: REFERENCE_SHEET_LINES,
  },
  {
    file: "10-point-table-northing-first.pdf",
    title: "Synthetic survey sheet: POINT table, northing first",
    lines: EASTING_LAST_SHEET_LINES,
  },
  {
    file: "11-two-coordinate-tables.pdf",
    title: "Synthetic survey sheet: parcel plus control stations",
    lines: TWO_TABLE_SHEET_LINES,
  },
];

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
for (const fixture of FIXTURES) {
  const target = path.join(OUTPUT_DIR, fixture.file);
  fs.writeFileSync(target, buildTextPdf(fixture.lines, { title: fixture.title }));
  console.log(`wrote ${path.relative(path.join(HERE, ".."), target)}`);
}
console.log(`Generated ${FIXTURES.length} synthetic survey-sheet fixtures.`);
