import { getDb } from '@/lib/db';
import { countries, governorates, cities, districts, streets } from '@/lib/db/schemas/geo-schema';
import type { GeoProvider } from '@/lib/services/geo/geo-contract';
import { eq, asc, and } from 'drizzle-orm';

// `implements` makes TypeScript prove structurally, at the definition site,
// that this service satisfies the /api/geo contract. No cast is needed at the
// call site. geo-contract.ts has no imports, so there is no dependency cycle.
export class GeoService implements GeoProvider {
  async getCountries() {
    const { db, end } = getDb();
    try {
      return await db
        .select()
        .from(countries)
        .where(eq(countries.isActive, true))
        .orderBy(asc(countries.displayOrder));
    } finally {
      await end();
    }
  }

  async getGovernorates(countryId: string) {
    const { db, end } = getDb();
    try {
      return await db
        .select()
        .from(governorates)
        .where(and(eq(governorates.countryId, countryId), eq(governorates.isActive, true)))
        .orderBy(asc(governorates.displayOrder));
    } finally {
      await end();
    }
  }

  async getCities(governorateId: string) {
    const { db, end } = getDb();
    try {
      return await db
        .select()
        .from(cities)
        .where(and(eq(cities.governorateId, governorateId), eq(cities.isActive, true)))
        .orderBy(asc(cities.displayOrder));
    } finally {
      await end();
    }
  }

  async getDistricts(cityId: string) {
    const { db, end } = getDb();
    try {
      return await db
        .select()
        .from(districts)
        .where(and(eq(districts.cityId, cityId), eq(districts.isActive, true)))
        .orderBy(asc(districts.displayOrder));
    } finally {
      await end();
    }
  }

  async getStreets(districtId: string) {
    const { db, end } = getDb();
    try {
      return await db
        .select()
        .from(streets)
        .where(and(eq(streets.districtId, districtId), eq(streets.isActive, true)))
        .orderBy(asc(streets.displayOrder));
    } finally {
      await end();
    }
  }

  async getLocationHierarchy(countryId?: string, governorateId?: string, cityId?: string, districtId?: string) {
    const result: Record<string, unknown> = {};
    if (countryId) {
      const list = await this.getCountries();
      result.country = list.find((c) => c.id === countryId);
    }
    if (countryId && governorateId) {
      result.governorates = await this.getGovernorates(countryId);
      const list = result.governorates as Array<{ id: string }>;
      result.governorate = list.find((g) => g.id === governorateId);
    }
    if (governorateId && cityId) {
      result.cities = await this.getCities(governorateId);
      const list = result.cities as Array<{ id: string }>;
      result.city = list.find((c) => c.id === cityId);
    }
    if (cityId && districtId) {
      result.districts = await this.getDistricts(cityId);
      const list = result.districts as Array<{ id: string }>;
      result.district = list.find((d) => d.id === districtId);
    }
    return result;
  }
}
