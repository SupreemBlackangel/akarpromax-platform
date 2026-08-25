import { LandReference, SaveLandInput, SavedLand } from "./contracts";

const store = new Map<string, SavedLand>();
let lastCreatedAt = 0;

export function generateLandId(ownerId: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `land_${ownerId.slice(0, 6)}_${rand}`;
}

export function saveLand(input: SaveLandInput): SavedLand {
  const now = Math.max(Date.now(), lastCreatedAt + 1);
  lastCreatedAt = now;
  const land: SavedLand = {
    id: generateLandId(input.ownerId),
    ownerId: input.ownerId,
    title: input.title.trim(),
    location: input.location,
    areaSqm: input.areaSqm,
    reference: input.reference,
    notes: input.notes,
    source: input.source ?? "manual",
    createdAt: now,
    updatedAt: now,
  };
  store.set(land.id, land);
  return land;
}

export function getLand(id: string): SavedLand | null {
  return store.get(id) ?? null;
}

export function getLandsByOwner(ownerId: string): SavedLand[] {
  return Array.from(store.values())
    .filter((l) => l.ownerId === ownerId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function deleteLand(id: string, ownerId: string): boolean {
  const land = store.get(id);
  if (!land) return false;
  if (land.ownerId !== ownerId) return false;
  store.delete(id);
  return true;
}

export function clearLands(): void {
  store.clear();
}

export function countLands(): number {
  return store.size;
}

export function parseLandReference(reference: LandReference | undefined): LandReference | undefined {
  if (!reference) return undefined;
  const clean: LandReference = {};
  if (reference.parcelId) clean.parcelId = String(reference.parcelId);
  if (reference.planId) clean.planId = String(reference.planId);
  if (reference.plotId) clean.plotId = String(reference.plotId);
  if (reference.municipality) clean.municipality = String(reference.municipality);
  return Object.keys(clean).length > 0 ? clean : undefined;
}
