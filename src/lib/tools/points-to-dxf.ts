export type SurveyPoint = {
  name: string;
  x: number;
  y: number;
  z: number;
  code: string;
  sourceLine: number;
};

export type PointsParseResult = {
  points: SurveyPoint[];
  skippedLines: number;
  totalDataLines: number;
};

function isHeader(parts: string[]): boolean {
  const first = parts[0]?.toLowerCase() ?? "";
  const second = parts[1]?.toLowerCase() ?? "";
  const third = parts[2]?.toLowerCase() ?? "";
  const hasPointName = /^(?:n|no|id|point|pointno|name|number|رقم)$/i.test(first);
  const hasX = /^(?:x|e|east|easting|شرق)$/i.test(hasPointName ? second : first);
  const hasY = /^(?:y|n|north|northing|شمال)$/i.test(hasPointName ? third : second);
  return hasX && hasY;
}

function splitPointLine(line: string): string[] {
  const separator = line.includes("\t")
    ? /\t+/
    : line.includes(",")
      ? /\s*,\s*/
      : line.includes(";")
        ? /\s*;\s*/
        : /\s+/;
  return line.split(separator).map((part) => part.trim()).filter(Boolean);
}

function numeric(value: string | undefined): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseSurveyPoints(text: string): PointsParseResult {
  const points: SurveyPoint[] = [];
  let skippedLines = 0;
  const dataRows = text.split(/\r?\n/).map((source, index) => {
    const line = source.trim();
    if (!line || line.startsWith("#") || line.startsWith("//") || line.startsWith(";")) return null;

    const parts = splitPointLine(line);
    if (isHeader(parts)) return null;
    return { parts, sourceLine: index + 1 };
  }).filter((row): row is { parts: string[]; sourceLine: number } => row !== null);

  const identifierFirstFormat = dataRows.some(({ parts }) => (
    numeric(parts[0]) === null
      && numeric(parts[1]) !== null
      && numeric(parts[2]) !== null
  )) || dataRows.some(({ parts }) => {
    const id = numeric(parts[0]);
    const x = numeric(parts[1]);
    const y = numeric(parts[2]);
    return id !== null
      && Number.isInteger(id)
      && Math.abs(id) <= 999_999
      && x !== null
      && y !== null
      && Math.abs(x) >= 10_000
      && Math.abs(y) >= 10_000;
  });

  dataRows.forEach(({ parts, sourceLine }) => {

    let name = "";
    let x: number | null = null;
    let y: number | null = null;
    let z = 0;
    let code = "";

    // Survey-office format used by the old AkarProMax tool: N, X, Y, Z, Code.
    if (
      parts.length >= 3
      && numeric(parts[1]) !== null
      && numeric(parts[2]) !== null
      && (numeric(parts[0]) === null || parts.length >= 4 || identifierFirstFormat)
    ) {
      name = parts[0];
      x = numeric(parts[1]);
      y = numeric(parts[2]);
      const parsedZ = numeric(parts[3]);
      if (parsedZ !== null) {
        z = parsedZ;
        code = parts.slice(4).join(" ");
      } else {
        code = parts.slice(3).join(" ");
      }
    } else if (numeric(parts[0]) !== null && numeric(parts[1]) !== null) {
      // Also accept X, Y[, Z, Code] and assign a sequential point number.
      name = String(points.length + 1);
      x = numeric(parts[0]);
      y = numeric(parts[1]);
      const parsedZ = numeric(parts[2]);
      if (parsedZ !== null) {
        z = parsedZ;
        code = parts.slice(3).join(" ");
      } else {
        code = parts.slice(2).join(" ");
      }
    }

    if (x === null || y === null) {
      skippedLines += 1;
      return;
    }

    points.push({ name, x, y, z, code, sourceLine });
  });

  return { points, skippedLines, totalDataLines: dataRows.length };
}

function safeDxfText(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim().slice(0, 120);
}

export function generateSurveyPointsDxf(points: SurveyPoint[]): string {
  if (points.length === 0) throw new Error("NO_POINTS");

  const format = (value: number) => value.toFixed(3);
  const minX = Math.min(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const minZ = Math.min(...points.map((point) => point.z));
  const maxX = Math.max(...points.map((point) => point.x));
  const maxY = Math.max(...points.map((point) => point.y));
  const maxZ = Math.max(...points.map((point) => point.z));
  const span = Math.max(maxX - minX, maxY - minY, 1);
  const crossSize = span * 0.008;
  const textHeight = crossSize * 0.36;
  const lines: string[] = [];
  const write = (...values: Array<string | number>) => values.forEach((value) => lines.push(String(value)));

  write("0", "SECTION", "2", "HEADER");
  write("9", "$ACADVER", "1", "AC1009");
  write("9", "$INSBASE", "10", "0.0", "20", "0.0", "30", "0.0");
  write("9", "$EXTMIN", "10", format(minX), "20", format(minY), "30", format(minZ));
  write("9", "$EXTMAX", "10", format(maxX), "20", format(maxY), "30", format(maxZ));
  write("0", "ENDSEC");

  write("0", "SECTION", "2", "TABLES");
  write("0", "TABLE", "2", "LTYPE", "70", "1");
  write("0", "LTYPE", "2", "CONTINUOUS", "70", "0", "3", "Solid line", "72", "65", "73", "0", "40", "0.0");
  write("0", "ENDTAB");
  write("0", "TABLE", "2", "LAYER", "70", "5");
  [
    ["0", 7],
    ["CROSS", 3],
    ["NAME", 1],
    ["ELEV", 5],
    ["CODE", 6],
  ].forEach(([name, color]) => {
    write("0", "LAYER", "2", name, "70", "0", "62", color, "6", "CONTINUOUS");
  });
  write("0", "ENDTAB");
  write("0", "TABLE", "2", "STYLE", "70", "1");
  write("0", "STYLE", "2", "STANDARD", "70", "0", "40", "0.0", "41", "1.0", "50", "0.0", "71", "0", "42", "1.0", "3", "txt", "4", "");
  write("0", "ENDTAB", "0", "ENDSEC");
  write("0", "SECTION", "2", "BLOCKS", "0", "ENDSEC");
  write("0", "SECTION", "2", "ENTITIES");

  points.forEach((point) => {
    const x = point.x;
    const y = point.y;
    const z = point.z;
    write("0", "LINE", "8", "CROSS", "10", format(x - crossSize), "20", format(y), "30", format(z), "11", format(x + crossSize), "21", format(y), "31", format(z));
    write("0", "LINE", "8", "CROSS", "10", format(x), "20", format(y - crossSize), "30", format(z), "11", format(x), "21", format(y + crossSize), "31", format(z));
  });

  const writeText = (layer: string, text: string, x: number, y: number) => {
    write("0", "TEXT", "8", layer, "10", format(x), "20", format(y), "30", "0.000", "40", format(textHeight), "1", safeDxfText(text), "7", "STANDARD");
  };

  points.forEach((point) => {
    const x = point.x + crossSize * 0.6;
    const y = point.y + crossSize * 0.3;
    if (point.name) writeText("NAME", point.name, x, y);
    writeText("ELEV", format(point.z), x, y - textHeight * 1.3);
    if (point.code) writeText("CODE", point.code, x, y - textHeight * 2.6);
  });

  write("0", "ENDSEC", "0", "EOF");
  return `${lines.join("\r\n")}\r\n`;
}

export function outputDxfName(sourceName: string): string {
  const base = sourceName.trim().replace(/\.[^.]+$/, "").replace(/[<>:"/\\|?*\u0000-\u001F]+/g, "_");
  return `${base || "survey_points"}.dxf`;
}
