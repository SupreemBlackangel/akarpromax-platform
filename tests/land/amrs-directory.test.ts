import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  discoverSurveyorsFromDirectory,
  mapDirectoryEntryToSurveyor,
  SurveyorDirectorySource,
} from "@/lib/land/amrs-directory";
import { DirectoryEntry } from "@/lib/amrs/directory";

function directoryEntry(id: string, overrides: Partial<DirectoryEntry> = {}): DirectoryEntry {
  return {
    id,
    entityType: "organization",
    name: `Org ${id}`,
    slug: null,
    countryCode: "SA",
    cityId: "riyadh",
    ratingAvg: null,
    jobsCompleted: null,
    reputationLevel: null,
    reputationScore: null,
    isVerified: false,
    createdAt: new Date(),
    ...overrides,
  };
}

describe("AMRS Directory -> Surveyor Adapter", () => {
  it("maps a directory entry into a surveyor candidate", () => {
    const entry = directoryEntry("org_1", { isVerified: true, reputationLevel: "gold", reputationScore: 750 });
    const candidate = mapDirectoryEntryToSurveyor(entry);
    assert.equal(candidate.id, "org_1");
    assert.equal(candidate.role, "surveyor");
    assert.equal(candidate.isVerified, true);
    assert.equal(candidate.reputationLevel, "gold");
    assert.equal(candidate.reputationScore, 750);
    assert.equal(candidate.countryCode, "SA");
  });

  it("does not fabricate reputation when the directory does not provide it", () => {
    const entry = directoryEntry("org_2");
    const candidate = mapDirectoryEntryToSurveyor(entry);
    assert.equal(candidate.reputationLevel, undefined);
    assert.equal(candidate.reputationScore, undefined);
    assert.equal(candidate.isVerified, false);
  });

  it("discovers surveyors through the real searchDirectory source shape", async () => {
    const source: SurveyorDirectorySource = {
      search: async (filters) => {
        assert.equal(filters.search, "surveyor");
        assert.equal(filters.entityType, "organization");
        return {
          entries: [
            directoryEntry("org_a", { countryCode: "SA", isVerified: true, reputationScore: 600, reputationLevel: "distinguished" }),
            directoryEntry("org_b", { countryCode: "SA", isVerified: false, reputationScore: 400, reputationLevel: "rising" }),
            directoryEntry("org_c", { countryCode: "SA", isVerified: false }),
          ],
          total: 3,
        };
      },
    };

    const result = await discoverSurveyorsFromDirectory(
      { lat: 24.7136, lon: 46.6753 },
      { limit: 10 },
      source,
    );

    assert.equal(result.total, 1);
    assert.equal(result.candidates.length, 1);
    assert.equal(result.candidates[0].id, "org_a");
    assert.equal(result.candidates[0].reputationLevel, "distinguished");
  });

  it("filters out unverified surveyors by default", async () => {
    const source: SurveyorDirectorySource = {
      search: async () => ({
        entries: [
          directoryEntry("org_a", { isVerified: true }),
          directoryEntry("org_b", { isVerified: false }),
        ],
        total: 2,
      }),
    };

    const result = await discoverSurveyorsFromDirectory(
      { lat: 24.7136, lon: 46.6753 },
      {},
      source,
    );

    assert.equal(result.total, 1);
    assert.equal(result.candidates[0].id, "org_a");
  });

  it("respects onlyVerified=false to keep newcomer organizations visible", async () => {
    const source: SurveyorDirectorySource = {
      search: async () => ({
        entries: [directoryEntry("org_b", { isVerified: false })],
        total: 1,
      }),
    };

    const result = await discoverSurveyorsFromDirectory(
      { lat: 24.7136, lon: 46.6753 },
      { onlyVerified: false, sortBy: "reputation" },
      source,
    );

    assert.equal(result.total, 1);
    assert.equal(result.candidates[0].isVerified, false);
  });

  it("passes countryCode filter to the directory", async () => {
    let sawCountry: string | undefined;
    const source: SurveyorDirectorySource = {
      search: async (filters) => {
        sawCountry = filters.countryCode;
        return { entries: [directoryEntry("org_a", { isVerified: true })], total: 1 };
      },
    };

    await discoverSurveyorsFromDirectory({ lat: 24.7136, lon: 46.6753 }, { countryCode: "SA" }, source);
    assert.equal(sawCountry, "SA");
  });
});
