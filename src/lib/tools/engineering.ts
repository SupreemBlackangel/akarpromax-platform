export type UnitSystem = "metric" | "imperial";

export type ConcreteInput = { length: number; width: number; thickness: number };
export type ConcreteResult = { volumeM3: number; cementBags: number; sandTons: number; gravelTons: number; waterLiters: number };

export type BeamInput = { b: number; h: number; length: number };
export type BeamResult = { volumeM3: number; mainBars: number; stirrups: number; rebarKg: number; rebarDensity: number };

export type TileInput = { roomLength: number; roomWidth: number; tileLength: number; tileWidth: number; wastePercent: number };
export type TileResult = { area: number; tilesNeeded: number; adhesiveBags: number; groutKg: number };

export type BrickInput = { wallLength: number; wallHeight: number; brickLength: number; brickWidth: number; brickHeight: number; mortarThickness: number };
export type BrickResult = { bricksNeeded: number; cementBags: number; sandTons: number };

export type RebarInput = { barDiameter: number; barLength: number; count: number };
export type RebarResult = { barWeight: number; totalWeightKg: number; totalWeightTons: number };

export type PaintInput = { wallArea: number; ceilingArea: number; coats: number; coveragePerLiter: number };
export type PaintResult = { totalArea: number; litersNeeded: number; gallonsNeeded: number };

export type SlopeInput = { heightDiff: number; horizontalDistance: number };
export type SlopeResult = { slopePercent: number; slopeRatio: string; angleDegrees: number; slopeCategory: string };

export type MixInput = { volumeM3: number; ratio: [number, number, number] };
export type MixResult = { cementTons: number; sandTons: number; gravelTons: number; cementBags: number };

// Cement density: 1440 kg/m3, 1 bag = 50 kg
// Sand density: ~1600 kg/m3
// Gravel density: ~1500 kg/m3
// Water: 175 liters/m3 for standard mix

const CEMENT_BAG_KG = 50;
const SAND_DENSITY = 1600;
const GRAVEL_DENSITY = 1500;
const WATER_PER_M3 = 175;
const CEMENT_DENSITY = 1440;

export function calcConcrete(input: ConcreteInput): ConcreteResult {
  const volume = input.length * input.width * input.thickness;
  const cementBags = Math.ceil(volume * (CEMENT_DENSITY / CEMENT_BAG_KG));
  const sandTons = parseFloat(((volume * SAND_DENSITY) / 1000).toFixed(2));
  const gravelTons = parseFloat(((volume * GRAVEL_DENSITY) / 1000).toFixed(2));
  const waterLiters = Math.round(volume * WATER_PER_M3);
  return { volumeM3: parseFloat(volume.toFixed(3)), cementBags, sandTons, gravelTons, waterLiters };
}

export function calcBeam(input: BeamInput): BeamResult {
  const volume = input.b * input.h * input.length;
  const rebarDensity = 7850;
  const mainBars = Math.ceil((input.b * 100 + input.h * 100) / 50) * 2;
  const stirrupSpacing = 0.15;
  const stirrups = Math.ceil(input.length / stirrupSpacing) + 1;
  const perim = 2 * (input.b + input.h) - 0.08;
  const stirrupWeight = stirrups * perim * 0.888;
  const mainWeight = mainBars * input.length * getBarWeight(input.b > 0.3 ? 16 : 12);
  const rebarKg = parseFloat(((mainWeight + stirrupWeight) * rebarDensity / 1000).toFixed(1));
  return {
    volumeM3: parseFloat(volume.toFixed(3)),
    mainBars,
    stirrups,
    rebarKg: parseFloat(((mainWeight + stirrupWeight) * 0.001 * 7850).toFixed(1)),
    rebarDensity: parseFloat((rebarKg / Math.max(volume, 0.001)).toFixed(0)),
  };
}

export function calcTile(input: TileInput): TileResult {
  const roomArea = input.roomLength * input.roomWidth;
  const tileArea = (input.tileLength / 1000) * (input.tileWidth / 1000);
  const wasteFactor = 1 + input.wastePercent / 100;
  const tilesNeeded = Math.ceil((roomArea / tileArea) * wasteFactor);
  const adhesiveThickness = 0.005;
  const adhesiveVolume = roomArea * adhesiveThickness;
  const adhesiveBags = Math.ceil(adhesiveVolume / 0.02);
  const groutKg = parseFloat((roomArea * 0.5).toFixed(1));
  return { area: parseFloat(roomArea.toFixed(2)), tilesNeeded, adhesiveBags, groutKg };
}

export function calcBrick(input: BrickInput): BrickResult {
  const wallArea = input.wallLength * input.wallHeight;
  const brickUnitL = input.brickLength + input.mortarThickness;
  const brickUnitH = input.brickHeight + input.mortarThickness;
  const bricksPerM2 = 1 / ((brickUnitL / 1000) * (brickUnitH / 1000));
  const bricksNeeded = Math.ceil(wallArea * bricksPerM2);
  const cementTons = parseFloat(((bricksNeeded * 0.003) * (CEMENT_DENSITY / 1000)).toFixed(2));
  const sandTons = parseFloat(((bricksNeeded * 0.005) * (SAND_DENSITY / 1000)).toFixed(2));
  return { bricksNeeded, cementBags: Math.ceil(cementTons * 1000 / CEMENT_BAG_KG), sandTons };
}

const BAR_WEIGHTS: Record<number, number> = {
  6: 0.222, 8: 0.395, 10: 0.617, 12: 0.888, 14: 1.208,
  16: 1.578, 18: 1.998, 20: 2.466, 22: 2.984, 25: 3.853,
  28: 4.834, 32: 6.313,
};

export function getBarWeight(diameter: number): number {
  return BAR_WEIGHTS[diameter] ?? (diameter * diameter) / 162;
}

export function calcRebar(input: RebarInput): RebarResult {
  const barWeight = getBarWeight(input.barDiameter);
  const totalWeightKg = parseFloat((barWeight * input.barLength * input.count).toFixed(2));
  const totalWeightTons = parseFloat((totalWeightKg / 1000).toFixed(3));
  return { barWeight: parseFloat(barWeight.toFixed(3)), totalWeightKg, totalWeightTons };
}

export function calcPaint(input: PaintInput): PaintResult {
  const totalArea = input.wallArea + input.ceilingArea;
  const litersNeeded = parseFloat((totalArea * input.coats / input.coveragePerLiter).toFixed(2));
  const gallonsNeeded = parseFloat((litersNeeded / 3.785).toFixed(2));
  return { totalArea: parseFloat(totalArea.toFixed(2)), litersNeeded, gallonsNeeded };
}

export function calcSlope(input: SlopeInput): SlopeResult {
  if (input.horizontalDistance === 0) {
    return { slopePercent: 0, slopeRatio: "∞", angleDegrees: 90, slopeCategory: "عمودي" };
  }
  const ratio = input.heightDiff / input.horizontalDistance;
  const slopePercent = parseFloat((ratio * 100).toFixed(2));
  const angleDegrees = parseFloat((Math.atan(ratio) * (180 / Math.PI)).toFixed(2));
  const simplifiedRatio = simplifyRatio(input.horizontalDistance, input.heightDiff);
  let slopeCategory = "";
  if (slopePercent < 0.5) slopeCategory = "مسطح";
  else if (slopePercent < 2) slopeCategory = "منحدر خفيف";
  else if (slopePercent < 5) slopeCategory = "منحدر متوسط";
  else if (slopePercent < 10) slopeCategory = "منحدر حاد";
  else slopeCategory = "منحدر شديد";
  return { slopePercent, slopeRatio: `1:${simplifiedRatio}`, angleDegrees, slopeCategory };
}

function simplifyRatio(a: number, b: number): string {
  if (b === 0) return "∞";
  const r = a / b;
  if (r >= 100) return `${Math.round(r)}`;
  if (r >= 10) return parseFloat(r.toFixed(1)).toString();
  return parseFloat(r.toFixed(2)).toString();
}

const MIX_RATIOS: Record<string, [number, number, number]> = {
  "1:1.5:3": [1, 1.5, 3],
  "1:2:3": [1, 2, 3],
  "1:2:4": [1, 2, 4],
  "1:3:6": [1, 3, 6],
};

export function getMixRatios(): Record<string, [number, number, number]> {
  return MIX_RATIOS;
}

export function calcMixRatio(input: MixInput): MixResult {
  const [c, s, g] = input.ratio;
  const totalParts = c + s + g;
  const cementVolume = (c / totalParts) * input.volumeM3;
  const sandVolume = (s / totalParts) * input.volumeM3;
  const gravelVolume = (g / totalParts) * input.volumeM3;
  const cementTons = parseFloat(((cementVolume * CEMENT_DENSITY) / 1000).toFixed(2));
  const sandTons = parseFloat(((sandVolume * SAND_DENSITY) / 1000).toFixed(2));
  const gravelTons = parseFloat(((gravelVolume * GRAVEL_DENSITY) / 1000).toFixed(2));
  const cementBags = Math.ceil(cementTons * 1000 / CEMENT_BAG_KG);
  return { cementTons, sandTons, gravelTons, cementBags };
}
