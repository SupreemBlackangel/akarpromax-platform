import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { saveLand, getLand, getLandsByOwner, deleteLand, clearLands } from "@/lib/land/saved-land";
import {
  createSharePayload,
  buildMapViewUrl,
  buildDirections,
  buildListingDraft,
  validateShareToken,
} from "@/lib/land/share";
import {
  haversineKm,
  findSurveyors,
  DEFAULT_SURVEYOR_QUERY,
  reputationRank,
} from "@/lib/land/surveyor-discovery";
import {
  createQuoteRequest,
  getQuote,
  updateQuoteStatus,
  clearQuotes,
  QUOTE_SERVICE_LABELS,
  isValidQuoteService,
} from "@/lib/land/quote";
import { runLandFlow, requestSurveyorQuote, buildLandFlow } from "@/lib/land/flow";
import { SurveyorCandidate, SaveLandInput } from "@/lib/land/contracts";

const RIYADH = { lat: 24.7136, lon: 46.6753 };

function sampleLandInput(overrides: Partial<SaveLandInput> = {}): SaveLandInput {
  return {
    ownerId: "user_123",
    title: "أرضي",
    location: {
      point: RIYADH,
      countryCode: "SA",
      city: "الرياض",
      district: "العليا",
    },
    areaSqm: 500,
    reference: { parcelId: "1234", planId: "5678" },
    source: "coordinates",
    ...overrides,
  };
}

function surveyor(id: string, overrides: Partial<SurveyorCandidate> = {}): SurveyorCandidate {
  return {
    id,
    name: `Surveyor ${id}`,
    role: "surveyor",
    location: { lat: 24.72, lon: 46.68 },
    isAvailable: true,
    isVerified: true,
    reputationLevel: "distinguished",
    reputationScore: 600,
    ratingAvg: 4.5,
    jobsCompleted: 120,
    ...overrides,
  };
}

describe("Land Saved Store", () => {
  beforeEach(() => {
    clearLands();
  });

  it("saves a land and returns an id", () => {
    const land = saveLand(sampleLandInput());
    assert.match(land.id, /^land_/);
    assert.equal(land.ownerId, "user_123");
    assert.equal(land.title, "أرضي");
  });

  it("gets a land by id", () => {
    const land = saveLand(sampleLandInput());
    const fetched = getLand(land.id);
    assert.ok(fetched);
    assert.equal(fetched!.location.point.lat, RIYADH.lat);
  });

  it("lists lands per owner sorted newest first", () => {
    saveLand(sampleLandInput({ title: "أرض أولى" }));
    const second = saveLand(sampleLandInput({ title: "أرض ثانية" }));
    const lands = getLandsByOwner("user_123");
    assert.equal(lands.length, 2);
    assert.equal(lands[0].id, second.id);
  });

  it("does not list lands of other owners", () => {
    saveLand(sampleLandInput());
    assert.equal(getLandsByOwner("other_user").length, 0);
  });

  it("deletes only own lands", () => {
    const land = saveLand(sampleLandInput());
    assert.equal(deleteLand(land.id, "other_user"), false);
    assert.equal(deleteLand(land.id, "user_123"), true);
    assert.equal(getLand(land.id), null);
  });

  it("stores source default to manual", () => {
    const land = saveLand(sampleLandInput({ source: undefined }));
    assert.equal(land.source, "manual");
  });
});

describe("Land Share & Map", () => {
  it("creates a share payload with url and token", () => {
    const land = saveLand(sampleLandInput());
    const share = createSharePayload(land, { baseUrl: "http://localhost:3000" });
    assert.match(share.url, /^http:\/\/localhost:3000\/land\//);
    assert.match(share.shareToken, /^share_/);
    assert.ok(share.expiresAt > Date.now());
  });

  it("qrPayload embeds coordinates", () => {
    const land = saveLand(sampleLandInput());
    const share = createSharePayload(land, { baseUrl: "http://localhost:3000" });
    const payload = JSON.parse(share.qrPayload);
    assert.equal(payload.t, "land");
    assert.ok(Math.abs(payload.lat - RIYADH.lat) < 0.001);
  });

  it("share token validation accepts valid token", () => {
    assert.equal(validateShareToken("share_land123_abc123xyz"), true);
    assert.equal(validateShareToken("evil"), false);
    assert.equal(validateShareToken(null), false);
  });

  it("builds an OSM map url", () => {
    const url = buildMapViewUrl(RIYADH);
    assert.match(url, /openstreetmap\.org/);
    assert.ok(url.includes("24.713600"));
  });

  it("builds OSM directions by default", () => {
    const directions = buildDirections({ lat: 24.7, lon: 46.6 }, RIYADH);
    assert.equal(directions.provider, "osm");
    assert.match(directions.url, /openstreetmap\.org\/directions/);
  });

  it("builds Google directions when requested", () => {
    const directions = buildDirections({ lat: 24.7, lon: 46.6 }, RIYADH, "google");
    assert.equal(directions.provider, "google");
    assert.match(directions.url, /google\.com\/maps\/dir/);
  });

  it("builds a listing draft with tags", () => {
    const land = saveLand(sampleLandInput());
    const draft = buildListingDraft(land);
    assert.match(draft.title, /أرضي/);
    assert.ok(draft.tags.some((t) => t === "500m2"));
    assert.ok(draft.tags.some((t) => t === "قطعة 1234"));
    assert.match(draft.description, /خط العرض/);
  });
});

describe("Land Surveyor Discovery", () => {
  it("computes haversine distance", () => {
    const km = haversineKm({ lat: 0, lon: 0 }, { lat: 0, lon: 1 });
    assert.ok(km > 100 && km < 120);
  });

  it("filters pool to surveyor role only", () => {
    const pool = [
      surveyor("s1"),
      surveyor("s2", { role: "architect" }),
      surveyor("s3", { role: "surveyor" }),
    ];
    const result = findSurveyors(pool, { landPoint: RIYADH });
    assert.equal(result.total, 2);
  });

  it("excludes unavailable surveyors by default", () => {
    const pool = [
      surveyor("s1"),
      surveyor("s2", { isAvailable: false }),
    ];
    const result = findSurveyors(pool, { landPoint: RIYADH });
    assert.equal(result.total, 1);
    assert.equal(result.candidates[0].id, "s1");
  });

  it("excludes unverified surveyors by default", () => {
    const pool = [
      surveyor("s1"),
      surveyor("s2", { isVerified: false }),
    ];
    const result = findSurveyors(pool, { landPoint: RIYADH });
    assert.equal(result.total, 1);
  });

  it("filters by max distance radius", () => {
    const pool = [
      surveyor("nearby", { location: { lat: 24.72, lon: 46.68 } }),
      surveyor("far", { location: { lat: 21.5, lon: 39.2 } }),
    ];
    const result = findSurveyors(pool, { landPoint: RIYADH, maxDistanceKm: 50 });
    assert.equal(result.total, 1);
    assert.equal(result.candidates[0].id, "nearby");
  });

  it("annotates distance in km", () => {
    const pool = [surveyor("s1", { location: { lat: 24.72, lon: 46.68 } })];
    const result = findSurveyors(pool, { landPoint: RIYADH });
    assert.ok(result.candidates[0].distanceKm !== undefined);
    assert.ok(result.candidates[0].distanceKm! < 5);
  });

  it("sorts by reputation by default", () => {
    const pool = [
      surveyor("gold", { reputationLevel: "gold", reputationScore: 800 }),
      surveyor("new", { reputationLevel: "new", reputationScore: 100 }),
    ];
    const result = findSurveyors(pool, { landPoint: RIYADH });
    assert.equal(result.candidates[0].id, "gold");
  });

  it("sorts by distance when requested", () => {
    const pool = [
      surveyor("far", { location: { lat: 24.75, lon: 46.7 } }),
      surveyor("near", { location: { lat: 24.714, lon: 46.676 } }),
    ];
    const result = findSurveyors(pool, { landPoint: RIYADH, sortBy: "distance" });
    assert.equal(result.candidates[0].id, "near");
  });

  it("sorts by rating when requested", () => {
    const pool = [
      surveyor("low", { ratingAvg: 3 }),
      surveyor("high", { ratingAvg: 5 }),
    ];
    const result = findSurveyors(pool, { landPoint: RIYADH, sortBy: "rating" });
    assert.equal(result.candidates[0].id, "high");
  });

  it("filters by min reputation score", () => {
    const pool = [
      surveyor("low", { reputationScore: 300 }),
      surveyor("high", { reputationScore: 900 }),
    ];
    const result = findSurveyors(pool, { landPoint: RIYADH, minReputationScore: 500 });
    assert.equal(result.total, 1);
    assert.equal(result.candidates[0].id, "high");
  });

  it("respects the limit", () => {
    const pool = [surveyor("a"), surveyor("b"), surveyor("c")];
    const result = findSurveyors(pool, { landPoint: RIYADH, limit: 2 });
    assert.equal(result.candidates.length, 2);
    assert.equal(result.total, 3);
  });

  it("can disable verification filter explicitly", () => {
    const pool = [surveyor("v"), surveyor("u", { isVerified: false })];
    const result = findSurveyors(pool, { landPoint: RIYADH, onlyVerified: false });
    assert.equal(result.total, 2);
  });

  it("reputationRank falls back to level index", () => {
    assert.ok(reputationRank("gold", undefined) > reputationRank("new", undefined));
    assert.equal(reputationRank(undefined, undefined), 0);
    assert.equal(reputationRank("promax", 950), 950);
  });

  it("default query uses surveyor role and verified+available", () => {
    assert.equal(DEFAULT_SURVEYOR_QUERY.role, "surveyor");
    assert.equal(DEFAULT_SURVEYOR_QUERY.onlyAvailable, true);
    assert.equal(DEFAULT_SURVEYOR_QUERY.onlyVerified, true);
  });
});

describe("Land Quote Request", () => {
  beforeEach(() => {
    clearQuotes();
  });

  it("creates a pending quote", () => {
    const land = saveLand(sampleLandInput());
    const quote = createQuoteRequest({
      landId: land.id,
      surveyorId: "s1",
      requesterId: "user_123",
      service: "boundary_survey",
    });
    assert.equal(quote.status, "pending");
    assert.equal(quote.currency, "SAR");
    assert.equal(quote.service, "boundary_survey");
  });

  it("fetches a quote by id", () => {
    const land = saveLand(sampleLandInput());
    const quote = createQuoteRequest({ landId: land.id, surveyorId: "s1", requesterId: "u" });
    assert.ok(getQuote(quote.id));
  });

  it("update status requires the surveyor", () => {
    const land = saveLand(sampleLandInput());
    const quote = createQuoteRequest({ landId: land.id, surveyorId: "s1", requesterId: "u" });
    assert.equal(updateQuoteStatus(quote.id, "accepted", "other"), null);
    const updated = updateQuoteStatus(quote.id, "accepted", "s1");
    assert.equal(updated!.status, "accepted");
  });

  it("validates quote services", () => {
    assert.equal(isValidQuoteService("measurement"), true);
    assert.equal(isValidQuoteService("nope"), false);
    assert.equal(isValidQuoteService(undefined), true);
  });

  it("provides Arabic service labels", () => {
    assert.equal(QUOTE_SERVICE_LABELS.measurement, "قياس المساحة");
    assert.equal(QUOTE_SERVICE_LABELS.boundary_survey, "مسح الحدود");
  });

  it("requestSurveyorQuote rejects missing land", () => {
    const result = requestSurveyorQuote({
      landId: "land_nope",
      surveyorId: "s1",
      requesterId: "u",
    });
    assert.equal(result.ok, false);
    assert.equal(result.error, "LAND_NOT_FOUND");
  });

  it("requestSurveyorQuote rejects invalid service", () => {
    const land = saveLand(sampleLandInput());
    const result = requestSurveyorQuote({
      landId: land.id,
      surveyorId: "s1",
      requesterId: "u",
      service: "bogus",
    });
    assert.equal(result.ok, false);
    assert.equal(result.error, "INVALID_QUOTE_SERVICE");
  });

  it("Find My Land posts a valid quote service understood by the API", async () => {
    const source = await readFile(new URL("../../src/components/tools/FindMyLand.tsx", import.meta.url), "utf8");
    assert.match(source, /service:\s*"boundary_survey"/);
    assert.doesNotMatch(source, /service:\s*"land-survey"/);
  });

  it("Find My Land launch UI keeps upload, timeout, CRS choice, RTL, and explicit verdict safeguards", async () => {
    const source = await readFile(new URL("../../src/components/tools/FindMyLand.tsx", import.meta.url), "utf8");
    assert.match(source, /MAX_FILE_SIZE\s*=\s*20\s*\*\s*1024\s*\*\s*1024/);
    assert.match(source, /onDragOver=/);
    assert.match(source, /onDrop=/);
    assert.match(source, /ANALYSIS_TIMEOUT_MS\s*=\s*60_000/);
    assert.match(source, /new AbortController\(\)/);
    assert.match(source, /controller\.abort\(\)/);
    assert.match(source, /aria-label="UTM Zone"/);
    assert.match(source, /utmHemisphereInput/);
    assert.match(source, /dir=\{dir\}/);
    assert.match(source, /تم التحليل بنجاح/);
    assert.match(source, /تحتاج الإحداثيات إلى مراجعة/);
    assert.match(source, /تعذر استخراج إحداثيات صالحة/);
  });

  it("requestSurveyorQuote rejects invalid budget", () => {
    const land = saveLand(sampleLandInput());
    const result = requestSurveyorQuote({
      landId: land.id,
      surveyorId: "s1",
      requesterId: "u",
      budgetMin: 5000,
      budgetMax: 1000,
    });
    assert.equal(result.ok, false);
    assert.equal(result.error, "INVALID_BUDGET");
  });
});

describe("Land Flow Orchestration", () => {
  beforeEach(() => {
    clearLands();
  });

  it("runs the full land flow end to end", () => {
    const pool = [
      surveyor("s1", { reputationScore: 900, location: { lat: 24.72, lon: 46.68 } }),
      surveyor("s2", { isAvailable: false }),
    ];
    const result = runLandFlow(sampleLandInput(), pool, { landPoint: RIYADH }, {
      baseUrl: "http://localhost:3000",
      userLocation: { lat: 24.7, lon: 46.6 },
    });

    assert.match(result.land.id, /^land_/);
    assert.match(result.mapUrl, /openstreetmap/);
    assert.match(result.shareUrl, /\/land\//);
    assert.match(result.qrPayload, /"t":"land"/);
    assert.match(result.directionsUrl, /directions/);
    assert.match(result.listingDraft.title, /أرضي/);
    assert.equal(result.surveyors.length, 1);
    assert.equal(result.surveyors[0].id, "s1");
  });

  it("buildLandFlow surfaces only verified+available nearby surveyors", () => {
    const land = saveLand(sampleLandInput());
    const pool = [
      surveyor("near-verified", { location: { lat: 24.715, lon: 46.677 } }),
      surveyor("far-verified", { location: { lat: 22.0, lon: 50.0 } }),
      surveyor("unverified", { isVerified: false, location: { lat: 24.714, lon: 46.676 } }),
    ];
    const result = buildLandFlow(land, pool, { landPoint: RIYADH, maxDistanceKm: 20 }, {
      baseUrl: "http://localhost:3000",
    });
    assert.equal(result.surveyors.length, 1);
    assert.equal(result.surveyors[0].id, "near-verified");
  });

  it("quote follows surveyor discovery in flow", () => {
    const land = saveLand(sampleLandInput());
    const quoteRes = requestSurveyorQuote({
      landId: land.id,
      surveyorId: "s1",
      requesterId: "user_123",
      service: "valuation",
      budgetMin: 500,
      budgetMax: 1500,
    });
    assert.equal(quoteRes.ok, true);
    assert.equal(quoteRes.quote!.service, "valuation");
  });
});
