import type { CadPoint, CadUnit } from "./types";

export type ViewTransform = {
  scale: number;
  originX: number;
  originY: number;
};

export function screenToCadPoint(
  point: { x: number; y: number },
  transform: ViewTransform,
): CadPoint {
  const x = (point.x - transform.originX) / transform.scale;
  const y = (transform.originY - point.y) / transform.scale;
  return { x, y, z: 0 };
}

export function cadToScreenPoint(
  point: CadPoint,
  transform: ViewTransform,
): { x: number; y: number } {
  const x = transform.originX + point.x * transform.scale;
  const y = transform.originY - point.y * transform.scale;
  return { x, y };
}

export function flipCadY(point: CadPoint): CadPoint {
  return { x: point.x, y: -point.y, z: point.z ?? 0 };
}

export const UNIT_TO_MM: Record<CadUnit, number> = {
  mm: 1,
  cm: 10,
  m: 1000,
  inch: 25.4,
  foot: 304.8,
};

export const UNIT_INSUNITS: Record<CadUnit, number> = {
  mm: 4,
  cm: 5,
  m: 6,
  inch: 1,
  foot: 2,
};

export function convertToMm(value: number, from: CadUnit): number {
  return value * UNIT_TO_MM[from];
}

export function convertFromMm(valueMm: number, to: CadUnit): number {
  return valueMm / UNIT_TO_MM[to];
}

export function convertDrawingUnits(
  value: number,
  from: CadUnit,
  to: CadUnit,
): number {
  if (from === to) return value;
  return convertFromMm(convertToMm(value, from), to);
}

export function computeBounds(entities: { points: CadPoint[] }[], fallback: { minX: number; maxX: number; minY: number; maxY: number } = { minX: -10, maxX: 10, minY: -10, maxY: 10 }) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let hasPoints = false;

  for (const entity of entities) {
    for (const p of entity.points) {
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
      hasPoints = true;
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
  }

  if (!hasPoints) return fallback;
  if (minX === maxX) maxX = minX + 1;
  if (minY === maxY) maxY = minY + 1;
  return { minX, maxX, minY, maxY };
}

export function roundTo(value: number, decimals = 4): number {
  const f = Math.pow(10, decimals);
  return Math.round(value * f) / f;
}
