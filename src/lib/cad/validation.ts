import type {
  CadDocumentModel,
  CadEntity,
  CadPolyline,
  CadValidationIssue,
} from "./types";

export function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

export function validateCadDocument(doc: CadDocumentModel): CadValidationIssue[] {
  const issues: CadValidationIssue[] = [];

  if (!doc.drawingName || doc.drawingName.trim().length === 0) {
    issues.push({ level: "warning", message: "Drawing name is empty." });
  }

  const layerNames = new Set(doc.layers.map((l) => l.name.trim()));
  for (const layer of doc.layers) {
    if (!layer.name || layer.name.trim().length === 0) {
      issues.push({ level: "error", message: "Layer has an empty name." });
    }
  }

  doc.entities.forEach((entity, index) => {
    const label = `${entity.type}[${index}]`;
    switch (entity.type) {
      case "LINE": {
        if (!isFiniteNumber(entity.start.x) || !isFiniteNumber(entity.start.y) || !isFiniteNumber(entity.end.x) || !isFiniteNumber(entity.end.y)) {
          issues.push({ level: "error", message: `${label}: non-finite coordinate.`, entityIndex: index });
        }
        break;
      }
      case "LWPOLYLINE": {
        validatePolyline(entity, label, index, issues);
        break;
      }
      case "CIRCLE": {
        if (!isFiniteNumber(entity.radius) || entity.radius <= 0) {
          issues.push({ level: "error", message: `${label}: radius must be > 0.`, entityIndex: index });
        }
        break;
      }
      case "ARC": {
        if (!isFiniteNumber(entity.radius) || entity.radius <= 0) {
          issues.push({ level: "error", message: `${label}: radius must be > 0.`, entityIndex: index });
        }
        break;
      }
      case "TEXT":
      case "MTEXT": {
        if (!entity.text || entity.text.trim().length === 0) {
          issues.push({ level: "warning", message: `${label}: empty text.`, entityIndex: index });
        }
        break;
      }
      case "HATCH": {
        if (entity.boundary.length < 3) {
          issues.push({ level: "error", message: `${label}: hatch needs at least 3 boundary points.`, entityIndex: index });
        }
        break;
      }
      case "DIMENSION": {
        if (!isFiniteNumber(entity.start.x) || !isFiniteNumber(entity.end.x)) {
          issues.push({ level: "error", message: `${label}: non-finite coordinate.`, entityIndex: index });
        }
        break;
      }
      case "POINT": {
        if (!isFiniteNumber(entity.position.x) || !isFiniteNumber(entity.position.y)) {
          issues.push({ level: "error", message: `${label}: non-finite coordinate.`, entityIndex: index });
        }
        break;
      }
    }

    if (!layerNames.has(entity.layer)) {
      issues.push({ level: "warning", message: `${label}: references unknown layer "${entity.layer}".`, entityIndex: index });
    }
  });

  return issues;
}

function validatePolyline(
  poly: CadPolyline,
  label: string,
  index: number,
  issues: CadValidationIssue[],
) {
  if (poly.points.length < 2) {
    issues.push({ level: "error", message: `${label}: polyline needs at least 2 points.`, entityIndex: index });
    return;
  }
  for (let i = 0; i < poly.points.length; i++) {
    const p = poly.points[i];
    if (!isFiniteNumber(p.x) || !isFiniteNumber(p.y)) {
      issues.push({ level: "error", message: `${label}: point ${i} has non-finite coordinate.`, entityIndex: index });
      return;
    }
  }
  for (let i = 1; i < poly.points.length; i++) {
    const a = poly.points[i - 1];
    const b = poly.points[i];
    if (a.x === b.x && a.y === b.y) {
      issues.push({ level: "warning", message: `${label}: duplicate consecutive point at ${i}.`, entityIndex: index });
    }
  }
}

export function removeDuplicateConsecutivePoints(points: { x: number; y: number }[]): { x: number; y: number }[] {
  const result: { x: number; y: number }[] = [];
  for (const p of points) {
    const last = result[result.length - 1];
    if (!last || last.x !== p.x || last.y !== p.y) {
      result.push(p);
    }
  }
  return result;
}

export function sanitizeCadDocument(doc: CadDocumentModel): CadDocumentModel {
  const entities = doc.entities
    .map((entity) => {
      if (entity.type === "LWPOLYLINE") {
        const cleaned = removeDuplicateConsecutivePoints(entity.points);
        return { ...entity, points: cleaned } as CadEntity;
      }
      if (entity.type === "HATCH") {
        const cleaned = removeDuplicateConsecutivePoints(entity.boundary);
        return { ...entity, boundary: cleaned } as CadEntity;
      }
      return entity;
    })
    .filter((entity) => {
      if (entity.type === "LWPOLYLINE") return entity.points.length >= 2;
      return true;
    });

  return { ...doc, entities };
}

export function hasErrors(issues: CadValidationIssue[]): boolean {
  return issues.some((i) => i.level === "error");
}

export function shoelaceArea(points: { x: number; y: number }[]): number {
  if (points.length < 3) return 0;
  let sum = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    sum += p1.x * p2.y - p2.x * p1.y;
  }
  return Math.abs(sum) / 2;
}
