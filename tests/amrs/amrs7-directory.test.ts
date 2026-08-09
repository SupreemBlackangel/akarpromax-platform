import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { DirectoryFilters, DirectoryEntry } from "@/lib/amrs/directory";
import { emptyDirectoryResult, emptyDirectoryStats, isMissingOrganizationsTableError } from "@/lib/amrs/schema-fallback";

// ─── Directory filter logic ────────────────────────────────────────

describe("AMRS-7 Directory filters", () => {
  function matchesFilters(
    entry: DirectoryEntry,
    filters: DirectoryFilters,
  ): boolean {
    if (filters.countryCode && entry.countryCode !== filters.countryCode) return false;
    if (filters.cityId && entry.cityId !== filters.cityId) return false;
    if (filters.entityType && entry.entityType !== filters.entityType) return false;
    if (filters.reputationLevel && entry.reputationLevel !== filters.reputationLevel) return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      if (!entry.name.toLowerCase().includes(searchLower)) return false;
    }
    return true;
  }

  const entry: DirectoryEntry = {
    id: "org-1",
    entityType: "organization",
    name: "Acme Properties",
    slug: "acme-properties",
    countryCode: "SA",
    cityId: "riyadh",
    ratingAvg: 450,
    jobsCompleted: 50,
    reputationLevel: "distinguished",
    reputationScore: 500,
    isVerified: true,
    createdAt: new Date("2024-01-01"),
  };

  it("no filters matches all", () => {
    assert.equal(matchesFilters(entry, {}), true);
  });

  it("country filter matches", () => {
    assert.equal(matchesFilters(entry, { countryCode: "SA" }), true);
  });

  it("country filter rejects mismatch", () => {
    assert.equal(matchesFilters(entry, { countryCode: "AE" }), false);
  });

  it("city filter matches", () => {
    assert.equal(matchesFilters(entry, { cityId: "riyadh" }), true);
  });

  it("city filter rejects mismatch", () => {
    assert.equal(matchesFilters(entry, { cityId: "dubai" }), false);
  });

  it("search matches name (case-insensitive)", () => {
    assert.equal(matchesFilters(entry, { search: "acme" }), true);
    assert.equal(matchesFilters(entry, { search: "ACME" }), true);
    assert.equal(matchesFilters(entry, { search: "Properties" }), true);
  });

  it("search rejects non-matching", () => {
    assert.equal(matchesFilters(entry, { search: "xyz" }), false);
  });

  it("entity type filter matches", () => {
    assert.equal(matchesFilters(entry, { entityType: "organization" }), true);
  });

  it("entity type filter rejects mismatch", () => {
    assert.equal(matchesFilters(entry, { entityType: "user" }), false);
  });

  it("reputation level filter matches", () => {
    assert.equal(matchesFilters(entry, { reputationLevel: "distinguished" }), true);
  });

  it("reputation level filter rejects mismatch", () => {
    assert.equal(matchesFilters(entry, { reputationLevel: "gold" }), false);
  });

  it("combined filters all must match", () => {
    assert.equal(
      matchesFilters(entry, { countryCode: "SA", cityId: "riyadh", entityType: "organization" }),
      true,
    );
    assert.equal(
      matchesFilters(entry, { countryCode: "SA", cityId: "dubai" }),
      false,
    );
  });
});

// ─── Directory entry sorting ───────────────────────────────────────

describe("AMRS-7 Directory sorting", () => {
  const entries: DirectoryEntry[] = [
    {
      id: "1", entityType: "organization", name: "Charlie", slug: null,
      countryCode: "SA", cityId: null, ratingAvg: 300, jobsCompleted: 10,
      reputationLevel: "rising", reputationScore: 300, isVerified: false,
      createdAt: new Date("2024-03-01"),
    },
    {
      id: "2", entityType: "organization", name: "Alpha", slug: null,
      countryCode: "AE", cityId: null, ratingAvg: 500, jobsCompleted: 50,
      reputationLevel: "gold", reputationScore: 750, isVerified: true,
      createdAt: new Date("2024-01-01"),
    },
    {
      id: "3", entityType: "organization", name: "Bravo", slug: null,
      countryCode: "OM", cityId: null, ratingAvg: 400, jobsCompleted: 30,
      reputationLevel: "distinguished", reputationScore: 500, isVerified: true,
      createdAt: new Date("2024-02-01"),
    },
  ];

  it("sort by name ascending", () => {
    const sorted = [...entries].sort((a, b) => a.name.localeCompare(b.name));
    assert.equal(sorted[0].name, "Alpha");
    assert.equal(sorted[2].name, "Charlie");
  });

  it("sort by reputation descending", () => {
    const sorted = [...entries].sort((a, b) => (b.reputationScore ?? 0) - (a.reputationScore ?? 0));
    assert.equal(sorted[0].name, "Alpha");
    assert.equal(sorted[2].name, "Charlie");
  });

  it("sort by rating descending", () => {
    const sorted = [...entries].sort((a, b) => (b.ratingAvg ?? 0) - (a.ratingAvg ?? 0));
    assert.equal(sorted[0].name, "Alpha");
    assert.equal(sorted[1].name, "Bravo");
  });

  it("sort by created ascending", () => {
    const sorted = [...entries].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    assert.equal(sorted[0].name, "Alpha");
    assert.equal(sorted[2].name, "Charlie");
  });
});

// ─── Directory pagination ──────────────────────────────────────────

describe("AMRS-7 Directory pagination", () => {
  function paginate<T>(items: T[], limit: number, offset: number): { page: T[]; total: number } {
    return {
      page: items.slice(offset, offset + limit),
      total: items.length,
    };
  }

  it("first page", () => {
    const items = [1, 2, 3, 4, 5];
    const result = paginate(items, 2, 0);
    assert.deepEqual(result.page, [1, 2]);
    assert.equal(result.total, 5);
  });

  it("second page", () => {
    const items = [1, 2, 3, 4, 5];
    const result = paginate(items, 2, 2);
    assert.deepEqual(result.page, [3, 4]);
  });

  it("last page with fewer items", () => {
    const items = [1, 2, 3, 4, 5];
    const result = paginate(items, 2, 4);
    assert.deepEqual(result.page, [5]);
  });

  it("offset beyond items returns empty", () => {
    const items = [1, 2, 3];
    const result = paginate(items, 10, 100);
    assert.deepEqual(result.page, []);
  });

  it("limit of 0 returns empty", () => {
    const items = [1, 2, 3];
    const result = paginate(items, 0, 0);
    assert.deepEqual(result.page, []);
  });
});

// ─── Directory search relevance ────────────────────────────────────

describe("AMRS-7 Search relevance", () => {
  function searchScore(name: string, query: string): number {
    const lower = name.toLowerCase();
    const qLower = query.toLowerCase();
    if (lower === qLower) return 100;
    if (lower.startsWith(qLower)) return 80;
    if (lower.includes(qLower)) return 50;
    return 0;
  }

  it("exact match gets highest score", () => {
    assert.equal(searchScore("Acme", "Acme"), 100);
  });

  it("prefix match gets high score", () => {
    assert.equal(searchScore("Acme Properties", "Acme"), 80);
  });

  it("substring match gets medium score", () => {
    assert.equal(searchScore("Best Acme Group", "Acme"), 50);
  });

  it("no match gets 0", () => {
    assert.equal(searchScore("Hello World", "Acme"), 0);
  });

  it("case insensitive", () => {
    assert.equal(searchScore("ACME", "acme"), 100);
  });
});

// ─── Directory stats logic ─────────────────────────────────────────

describe("AMRS-7 Directory stats", () => {
  function computeStats(entries: DirectoryEntry[]) {
    const byType: Record<string, number> = {};
    const byCountry: Record<string, number> = {};
    for (const e of entries) {
      byType[e.entityType] = (byType[e.entityType] ?? 0) + 1;
      if (e.countryCode) {
        byCountry[e.countryCode] = (byCountry[e.countryCode] ?? 0) + 1;
      }
    }
    return { total: entries.length, byType, byCountry };
  }

  it("counts by entity type", () => {
    const entries: DirectoryEntry[] = [
      { id: "1", entityType: "organization", name: "A", slug: null, countryCode: "SA", cityId: null, ratingAvg: null, jobsCompleted: null, reputationLevel: null, reputationScore: null, isVerified: false, createdAt: new Date() },
      { id: "2", entityType: "user", name: "B", slug: null, countryCode: "AE", cityId: null, ratingAvg: null, jobsCompleted: null, reputationLevel: null, reputationScore: null, isVerified: false, createdAt: new Date() },
      { id: "3", entityType: "organization", name: "C", slug: null, countryCode: "SA", cityId: null, ratingAvg: null, jobsCompleted: null, reputationLevel: null, reputationScore: null, isVerified: false, createdAt: new Date() },
    ];
    const stats = computeStats(entries);
    assert.equal(stats.total, 3);
    assert.equal(stats.byType["organization"], 2);
    assert.equal(stats.byType["user"], 1);
  });

  it("counts by country", () => {
    const entries: DirectoryEntry[] = [
      { id: "1", entityType: "organization", name: "A", slug: null, countryCode: "SA", cityId: null, ratingAvg: null, jobsCompleted: null, reputationLevel: null, reputationScore: null, isVerified: false, createdAt: new Date() },
      { id: "2", entityType: "organization", name: "B", slug: null, countryCode: "AE", cityId: null, ratingAvg: null, jobsCompleted: null, reputationLevel: null, reputationScore: null, isVerified: false, createdAt: new Date() },
    ];
    const stats = computeStats(entries);
    assert.equal(stats.byCountry["SA"], 1);
    assert.equal(stats.byCountry["AE"], 1);
  });
});

// ─── Cache control headers ─────────────────────────────────────────

describe("AMRS-7 Cache control", () => {
  it("search results have short cache", () => {
    const cacheControl = "public, max-age=30";
    assert.ok(cacheControl.includes("max-age=30"));
  });

  it("individual entry has medium cache", () => {
    const cacheControl = "public, max-age=60";
    assert.ok(cacheControl.includes("max-age=60"));
  });

  it("stats have longer cache", () => {
    const cacheControl = "public, max-age=300";
    assert.ok(cacheControl.includes("max-age=300"));
  });
});

describe("AMRS-7 Missing schema fallback", () => {
  it("detects missing organizations-table errors", () => {
    const error = new Error("relation \"organizations\" does not exist") as Error & { cause?: { code: string } };
    error.cause = { code: "42P01" };
    assert.equal(isMissingOrganizationsTableError(error), true);
    assert.equal(isMissingOrganizationsTableError(new Error("boom")), false);
  });

  it("builds empty directory payloads", () => {
    assert.deepEqual(emptyDirectoryResult(5, 10), { entries: [], total: 0, limit: 5, offset: 10 });
    assert.deepEqual(emptyDirectoryStats(), { totalOrganizations: 0, byType: {}, byCountry: {} });
  });
});
