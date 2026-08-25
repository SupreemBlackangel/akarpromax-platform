import {
  AdapterHints,
  ConfidenceLevel,
  CoordinateGroupSummary,
  CountryDocumentAdapter,
  CRSDetector,
  CoordinateEvidenceDetail,
  GeocodingProvider,
  LandDocumentClassifier,
  LandGeoEvidence,
  LandLocationResult,
  ResolveStatus,
} from "./contracts";
import type { TextExtractionMethod } from "@/lib/geo/contracts";
import { checkDocumentSecurity, checkRelevanceGate, UploadMetadata } from "@/lib/geo/security-gate";
import { extractText } from "@/lib/geo/text-extraction";
import { extractGeoEvidence, extractZoneLessUtmRows, type ZoneLessUtmRow } from "@/lib/geo/evidence-extraction";
import { validateGeometry } from "@/lib/geo/geometry";
import { LAND_CLASSIFIER } from "./classifier";
import { UNKNOWN_COUNTRY_ADAPTER, adapterForCountry } from "./adapters";
import { LAND_CRS_DETECTOR, toWgs84Point } from "./crs-detector";
import { chooseInitialUtmZone } from "../product-policy";
import {
  isHemisphere,
  isValidUtmZone,
  isWithinUtmLatitudeBand,
  utmEpsgCode,
  utmToWgs84Result,
  type Hemisphere,
} from "@/lib/geo/utm";
import { protectCoordinateOrder } from "./coordinate-protection";
import { buildLandGeometry } from "./geometry-builder";
import { computeBoundaryConfidence, computeLocationConfidence } from "./confidence";
import { DEFAULT_GEOCODING_PROVIDER, bestCandidate } from "./geocoding-provider";
import { buildLandAnalysisStrategy } from "./strategy";
import { detectDocumentCountry } from "@/lib/land/documents/country-detector";
import { detectDocumentType } from "@/lib/land/documents/document-type";
import { extractBoundaryDescription } from "@/lib/land/documents/boundary-terms";
import { normalizeNumerals, parseAreaValue } from "@/lib/land/documents/numerals";
import { extractParcelCandidates, extractSurveyTables, type ParcelCandidate } from "./patterns";
import {
  analyseBoundary,
  reorderVertices,
  type SourceVertex,
} from "@/lib/land/boundary/parcel-boundary";
import { reconstructLayout, type LayoutTable, type PositionedItem } from "./layout";
import { extractTablesFromLayout, type LayoutTableReading } from "./table-extraction";
import { buildRowAccount, emptyRowAccount, mergeRowAccounts, type RejectedRow, type RowAccount } from "./row-accounting";
import { reconcileCandidates, type EvidenceSource, type SourceReading } from "./consensus";

export interface ResolveInput {
  metadata: UploadMetadata;
  ocrText?: string;
  visionText?: string;
  ocrConfidence?: number;
  countryCode?: string;
  utmZone?: number;
  utmHemisphere?: "N" | "S";
  /**
   * Forces the interpretation of the document's coordinates. `auto` keeps the
   * detector's own decision; the explicit values let a user correct it.
   */
  crsMode?: "auto" | "wgs84" | "utm";
  /** Id of the coordinate cluster the user picked when a document has several. */
  coordinateGroupId?: string;
  /**
   * Per-page text, so each piece of evidence can be traced to its page and a
   * table split across pages still reads as one table.
   */
  pages?: readonly string[];
  /**
   * Text with its position on the page, from the PDF text layer or from an OCR
   * pass that reports word boxes. Both arrive in the same shape on purpose:
   * the layout reader, the table reader and the semantic roles downstream of
   * them do not know or care which produced a given word.
   *
   * Supplying this lets the engine read a table by its columns instead of by
   * the order a PDF happened to emit its glyphs in, which is the difference
   * between reading a survey schedule and reading a bag of numbers.
   */
  positionedItems?: readonly PositionedItem[];
  /**
   * Survey rows the OCR pipeline itself had to reject — a cell whose passes
   * disagreed, or that no pass could read. They join the document's row
   * account so an OCR conflict can never silently shrink a parcel.
   */
  ocrRejections?: readonly RejectedRow[];
  /**
   * A corner order the user reviewed and accepted. Applied only to the drawing
   * and the measurements; the documented order is always kept in the record.
   */
  confirmedOrder?: readonly number[];
  classifier?: LandDocumentClassifier;
  adapter?: CountryDocumentAdapter;
  crsDetector?: CRSDetector;
  geocodingProvider?: GeocodingProvider;
}

export interface ResolveDeps {
  classifier: LandDocumentClassifier;
  adapter: CountryDocumentAdapter;
  crsDetector: CRSDetector;
  geocodingProvider: GeocodingProvider;
}

export function resolveDeps(input: ResolveInput): ResolveDeps {
  return {
    classifier: input.classifier ?? LAND_CLASSIFIER,
    adapter: input.adapter ?? (input.countryCode ? adapterForCountry(input.countryCode) : UNKNOWN_COUNTRY_ADAPTER),
    crsDetector: input.crsDetector ?? LAND_CRS_DETECTOR,
    geocodingProvider: input.geocodingProvider ?? DEFAULT_GEOCODING_PROVIDER,
  };
}

type ExtractedCoordinateEvidence = ReturnType<typeof extractGeoEvidence>["explicitCoordinates"][number];

const DIRECT_COORDINATE_CONTEXT =
  /(?:coordinates?|latitude|longitude|\blat\b|\blon\b|\blng\b|easting|northing|احداثيات|الإحداثيات|الموقع|خط\s*العرض|خط\s*الطول|شرقيات|شماليات)\s*[:：=#\-]?\s*(?:P|Point|نقطة)?\s*\d*\s*[:：=#\-]?\s*$/i;

function hasLocalCoordinateContext(text: string, raw: string): boolean {
  const index = text.indexOf(raw);
  if (index < 0) return false;
  const directPrefix = text.slice(Math.max(0, index - 64), index);
  return DIRECT_COORDINATE_CONTEXT.test(directPrefix);
}

/** Largest span a single parcel's unlabelled coordinate cluster may cover. */
const CLUSTER_SPAN_DEGREES = 0.25;
/** Smallest cluster that can stand on its own as a boundary. */
const MIN_CLUSTER_POINTS = 3;

interface UnlabelledCluster {
  id: string;
  members: ExtractedCoordinateEvidence[];
  center: { lat: number; lon: number };
  spanDegrees: number;
}

/**
 * Groups unlabelled decimal pairs into geographic clusters. Clustering is
 * single-linkage on the {@link CLUSTER_SPAN_DEGREES} envelope, so unrelated
 * number groups in the same document never merge into one boundary.
 */
function clusterUnlabelledEvidence(
  evidence: readonly ExtractedCoordinateEvidence[],
  adapter: CountryDocumentAdapter,
): UnlabelledCluster[] {
  const usable = evidence
    .filter((item) => item.point)
    .map((item) => ({ item, protectedPoint: protectCoordinateOrder(item.point!, adapter) }))
    .filter((entry) => entry.protectedPoint.orderConfidence >= 0.5);

  const clusters: { members: ExtractedCoordinateEvidence[]; points: { lat: number; lon: number }[] }[] = [];
  for (const { item, protectedPoint } of usable) {
    const point = protectedPoint.point;
    const target = clusters.find((cluster) => cluster.points.every((other) => (
      Math.abs(other.lat - point.lat) <= CLUSTER_SPAN_DEGREES
      && Math.abs(other.lon - point.lon) <= CLUSTER_SPAN_DEGREES
    )));
    if (target) {
      target.members.push(item);
      target.points.push(point);
    } else {
      clusters.push({ members: [item], points: [point] });
    }
  }

  return clusters.map((cluster, index) => {
    const latitudes = cluster.points.map((point) => point.lat);
    const longitudes = cluster.points.map((point) => point.lon);
    return {
      id: `group-${index + 1}`,
      members: cluster.members,
      center: {
        lat: latitudes.reduce((sum, value) => sum + value, 0) / latitudes.length,
        lon: longitudes.reduce((sum, value) => sum + value, 0) / longitudes.length,
      },
      spanDegrees: Math.max(
        Math.max(...latitudes) - Math.min(...latitudes),
        Math.max(...longitudes) - Math.min(...longitudes),
      ),
    };
  });
}

export interface CoordinateFilterResult {
  accepted: ExtractedCoordinateEvidence[];
  rejectedCount: number;
  /**
   * Pairs the admission gate ruled out as measurements rather than positions.
   * They are not coordinate candidates at all, so they are counted apart from
   * the coordinates that were merely set aside.
   */
  nonCoordinateCount: number;
  /** Why each was ruled out, for the review view. */
  nonCoordinateReasons: string[];
  /** Candidate clusters, reported only when the document holds more than one. */
  groups: CoordinateGroupSummary[];
  /** True when several clusters qualify and none was chosen by the user. */
  selectionRequired: boolean;
}

export function filterCoordinateEvidence(
  text: string,
  allEvidence: readonly ExtractedCoordinateEvidence[],
  adapter: CountryDocumentAdapter,
  selectedGroupId?: string,
): CoordinateFilterResult {
  // A pair the admission gate rejected is a side length, a setback or an area
  // that happens to look like a latitude. It never becomes a candidate, never
  // forms a group, and never reaches the map.
  const nonCoordinates = allEvidence.filter((item) => item.admission === "REJECT");
  const evidence = allEvidence.filter((item) => item.admission !== "REJECT");

  const unlabelled = evidence.filter((item) => item.source === "unlabelled-decimal");
  const clusters = clusterUnlabelledEvidence(unlabelled, adapter);
  const qualifying = clusters.filter((cluster) => cluster.members.length >= MIN_CLUSTER_POINTS);

  const groups: CoordinateGroupSummary[] = qualifying.map((cluster) => ({
    id: cluster.id,
    pointCount: cluster.members.length,
    center: cluster.center,
    spanDegrees: cluster.spanDegrees,
  }));

  const chosen = selectedGroupId
    ? qualifying.find((cluster) => cluster.id === selectedGroupId)
    : qualifying.length === 1
      ? qualifying[0]
      : undefined;

  // More than one plausible cluster is never merged: the user picks one.
  const selectionRequired = qualifying.length > 1 && chosen === undefined;
  const acceptedCluster = new Set(chosen?.members ?? []);

  const accepted = evidence.filter((item) => (
    item.source !== "unlabelled-decimal"
    || (!selectionRequired && (hasLocalCoordinateContext(text, item.raw) || acceptedCluster.has(item)))
  ));

  return {
    accepted,
    rejectedCount: evidence.length - accepted.length,
    nonCoordinateCount: nonCoordinates.length,
    nonCoordinateReasons: [...new Set(nonCoordinates.map((item) => item.admissionReason ?? "not a coordinate"))],
    groups: qualifying.length > 1 ? groups : [],
    selectionRequired,
  };
}

export function buildLandGeoEvidence(
  explicitCoordinates: CoordinateEvidenceDetail[],
  hints: AdapterHints,
): LandGeoEvidence {
  return {
    explicitCoordinates,
    coordinatePairs: explicitCoordinates
      .filter((c) => c.parsedLat !== undefined && c.parsedLon !== undefined)
      .map((c) => ({ lat: c.parsedLat as number, lon: c.parsedLon as number })),
    parcels: hints.parcels,
    addresses: hints.addresses,
    country: hints.country,
    region: hints.region,
    city: hints.city,
    district: hints.district,
    street: hints.street,
    landmarks: hints.landmarks,
    sourceReferences: hints.sourceReferences,
  };
}

export function extractParcelIdentifiers(
  hints: AdapterHints,
  geo: ReturnType<typeof extractGeoEvidence>,
): { parcelId?: string; planId?: string; plotId?: string } | undefined {
  const parcelId = hints.parcels.find((p) => p.parcelId)?.parcelId ?? geo.parcels.find((p) => p.parcelId)?.parcelId;
  const planId = hints.parcels.find((p) => p.planId)?.planId ?? geo.parcels.find((p) => p.planId)?.planId;
  const plotId = hints.parcels.find((p) => p.plotId)?.plotId ?? geo.parcels.find((p) => p.plotId)?.plotId;
  if (!parcelId && !planId && !plotId) return undefined;
  return { parcelId, planId, plotId };
}

function emptyEvidence(): LandGeoEvidence {
  return {
    explicitCoordinates: [],
    coordinatePairs: [],
    parcels: [],
    addresses: [],
    landmarks: [],
    sourceReferences: [],
  };
}

/**
 * Infers a UTM CRS from the document's country, worldwide.
 *
 * All 120 zone/hemisphere combinations are tried against the country envelope
 * and the result is used only when exactly one of them fits. Without a country
 * envelope, or with a tie, nothing is inferred and the user is asked instead.
 */
function inferUtmCrs(
  rows: readonly ZoneLessUtmRow[],
  adapter: CountryDocumentAdapter,
): { zone: number; hemisphere: Hemisphere } | undefined {
  if (!adapter.bounds) return undefined;

  const ranked: { zone: number; hemisphere: Hemisphere; plausible: number }[] = [];
  for (const hemisphere of ["N", "S"] as const) {
    for (let zone = 1; zone <= 60; zone += 1) {
      const plausible = rows.reduce((count, row) => {
        const converted = utmToWgs84Result(row.easting, row.northing, zone, hemisphere);
        return count + (converted.ok && adapter.isPlausiblePoint(converted.value) ? 1 : 0);
      }, 0);
      if (plausible > 0) ranked.push({ zone, hemisphere, plausible });
    }
  }

  ranked.sort((left, right) => right.plausible - left.plausible);
  const best = ranked[0];
  const second = ranked[1];
  if (!best || best.plausible === 0 || best.plausible === second?.plausible) return undefined;
  return { zone: best.zone, hemisphere: best.hemisphere };
}

/**
 * Maps a character offset in the joined document text back to its page.
 *
 * Extraction runs over the whole document so a table split across a page break
 * still reads as one table; this restores the page for each piece of evidence
 * afterwards.
 */
function buildPageLocator(
  pages: readonly string[] | undefined,
  joinerLength = 1,
): (offset: number) => number | undefined {
  if (!pages || pages.length === 0) return () => undefined;
  const bounds: number[] = [];
  let cursor = 0;
  for (const page of pages) {
    cursor += page.length;
    bounds.push(cursor);
    cursor += joinerLength;
  }
  return (offset: number) => {
    if (offset < 0) return undefined;
    for (let index = 0; index < bounds.length; index += 1) {
      if (offset <= bounds[index]) return index + 1;
    }
    return pages.length;
  };
}

export async function resolveLandDocument(input: ResolveInput): Promise<LandLocationResult> {
  const deps = resolveDeps(input);
  const steps: string[] = [];
  const warnings: string[] = [];
  let strategyText = "";
  let strategyRows: ZoneLessUtmRow[] = [];
  let strategyInferredUtmZone: number | undefined = undefined;
  let strategySelectedUtmZone: number | undefined = undefined;
  let strategyUtmZoneSource: "DOCUMENT" | "USER" | "OMAN_DEFAULT" | "COUNTRY_INFERENCE" | undefined = undefined;
  let strategyCrsSelectionRequired = false;
  let strategyGeometryValid = false;
  // Audit trail attached to every exit, including the early ones: a caller
  // must be able to ask "how many rows were there" whatever the verdict.
  const audit: {
    rowAccount?: RowAccount;
    layoutTables?: LandLocationResult["layoutTables"];
    readerAgreement?: LandLocationResult["readerAgreement"];
  } = {};

  const finalize = (result: LandLocationResult): LandLocationResult => ({
    ...result,
    rowAccount: result.rowAccount ?? audit.rowAccount,
    layoutTables: result.layoutTables ?? audit.layoutTables,
    readerAgreement: result.readerAgreement ?? audit.readerAgreement,
    strategy: buildLandAnalysisStrategy({
      status: result.status,
      documentConfidence: result.document.classificationConfidence,
      extractionMethod: result.extraction.method,
      ocrUsed: result.extraction.ocrUsed,
      ocrConfidence: result.extraction.ocrConfidence,
      crsConfidence: result.crsConfidence,
      evidence: result.evidence,
      geometry: result.geometry,
      geometryValid: strategyGeometryValid,
      adapter: deps.adapter,
      sourceText: strategyText,
      zoneLessRows: strategyRows,
      inferredUtmZone: strategyInferredUtmZone,
      selectedUtmZone: strategySelectedUtmZone,
      utmZoneSource: strategyUtmZoneSource,
      crsSelectionRequired: strategyCrsSelectionRequired,
      candidatesCount: result.candidates.length,
      geocodingScore: result.candidates.length
        ? Math.max(...result.candidates.map((candidate) => candidate.score ?? 0))
        : undefined,
    }),
  });

  steps.push("security gate");
  const security = checkDocumentSecurity(input.metadata);
  if (!security.passed) {
    steps.push(`security gate failed: ${security.reason}`);
    return finalize({
      status: "INVALID_DOCUMENT",
      locationConfidence: "UNRESOLVED",
      boundaryConfidence: "UNRESOLVED",
      crsConfidence: "UNKNOWN",
      evidence: emptyEvidence(),
      candidates: [],
      warnings: [security.reason ?? "SECURITY_REJECTED"],
      document: { category: "UNKNOWN_LAND_DOCUMENT", classificationConfidence: 0 },
      extraction: { method: "none", charCount: 0, ocrUsed: false, ocrConfidence: input.ocrConfidence, aiUsed: false, geocodingUsed: false },
      steps,
    });
  }

  steps.push("text extraction");
  const extraction = extractText({
    nativeText: input.metadata.nativeText,
    ocrText: input.ocrText,
    visionText: input.visionText,
  });
  const text = extraction.text;
  strategyText = text;
  const method = extraction.method as TextExtractionMethod;
  const ocrUsed = method === "ocr" || Boolean(input.ocrText?.trim());

  if (text.length === 0) {
    steps.push("no extractable text");
    return finalize({
      status: "INVALID_DOCUMENT",
      locationConfidence: "UNRESOLVED",
      boundaryConfidence: "UNRESOLVED",
      crsConfidence: "UNKNOWN",
      evidence: emptyEvidence(),
      candidates: [],
      warnings: ["no text extracted; OCR may be required for scanned documents"],
      document: { category: "UNKNOWN_LAND_DOCUMENT", classificationConfidence: 0 },
      extraction: { method, charCount: 0, ocrUsed, ocrConfidence: input.ocrConfidence, aiUsed: false, geocodingUsed: false },
      steps,
    });
  }

  // `crsMode` is the user's manual override of the detected system and is read
  // before the document gate, because choosing WGS84 suppresses grid reading.
  const crsMode = input.crsMode ?? "auto";

  // --- Document intelligence -------------------------------------------
  // Country first, then the document family within that country's profile.
  // Neither is allowed to be a guess: an unproven country falls back to the
  // generic profile and the generic core still does the work.
  steps.push("document intelligence");
  const numerals = normalizeNumerals(text);
  const countryDetection = detectDocumentCountry({
    text: numerals.text,
    metadataText: input.metadata.fileName,
    countryCode: input.countryCode,
  });
  const profile = countryDetection.profile;
  const documentType = detectDocumentType(numerals.text, profile);
  steps.push(`country=${countryDetection.countryCode} (${countryDetection.level}) type=${documentType.kind}`);

  // A detected country narrows the plausibility envelope, so it is only allowed
  // to do so when the evidence is strong. Otherwise the neutral adapter stands.
  if (!input.adapter && !input.countryCode && countryDetection.level === "HIGH") {
    deps.adapter = adapterForCountry(countryDetection.countryCode);
    steps.push(`adapter switched to ${deps.adapter.countryCode} on high-confidence country evidence`);
  }

  const boundaryDescription = extractBoundaryDescription(numerals.text);
  const statedAreaMatch = /(?:المساحه|المساحة|اجمالي\s*المساحه|إجمالي\s*المساحة|\bAREA\b|\bTOTAL\s+AREA\b)\s*(?:=|:|：)?\s*([\d][\d.,]*\s*(?:\S{0,12}))/i
    .exec(numerals.text);
  const statedArea = statedAreaMatch ? parseAreaValue(statedAreaMatch[1]) ?? undefined : undefined;
  const pageLocator = buildPageLocator(input.pages);

  steps.push("relevance gate");
  const relevance = checkRelevanceGate(text, 2);
  const classification = deps.classifier.classify(text);
  // A document that contains a real coordinate table is a survey document
  // whatever words it uses. A bare `LINE / EASTING / NORTHING / DIST` sheet
  // carries none of the usual land vocabulary, and it is still a parcel.
  const structuralSurveyTables = crsMode === "wgs84" ? [] : extractSurveyTables(numerals.text);
  const isLandLike =
    relevance.passed ||
    classification.category !== "UNKNOWN_LAND_DOCUMENT" ||
    deps.adapter.relevanceScore(text) >= 2 ||
    structuralSurveyTables.length > 0 ||
    documentType.kind === "COORDINATE_SCHEDULE";
  if (structuralSurveyTables.length > 0) {
    steps.push(`structural survey table(s) found: ${structuralSurveyTables.length}`);
  }

  if (!isLandLike) {
    steps.push("document is not land-related");
    return finalize({
      status: "NOT_LAND_DOCUMENT",
      locationConfidence: "UNRESOLVED",
      boundaryConfidence: "UNRESOLVED",
      crsConfidence: "UNKNOWN",
      evidence: emptyEvidence(),
      candidates: [],
      warnings: ["document does not appear to be a land/property document"],
      document: { category: classification.category, classificationConfidence: classification.confidence },
      extraction: { method, charCount: extraction.charCount, ocrUsed, ocrConfidence: input.ocrConfidence, aiUsed: false, geocodingUsed: false },
      steps,
    });
  }

  steps.push("adapter hints");
  const hints = deps.adapter.extractHints(text);

  steps.push("deterministic evidence extraction");
  const geoEvidence = extractGeoEvidence(text);
  const filteredCoordinates = filterCoordinateEvidence(
    text,
    geoEvidence.explicitCoordinates,
    deps.adapter,
    input.coordinateGroupId,
  );
  const coordinateEvidence = [...filteredCoordinates.accepted];
  if (filteredCoordinates.rejectedCount > 0) {
    warnings.push(`${filteredCoordinates.rejectedCount} unlabelled numeric pairs ignored because this document does not identify them as coordinates`);
    steps.push(`ignored ambiguous numeric pairs: ${filteredCoordinates.rejectedCount}`);
  }
  if (filteredCoordinates.nonCoordinateCount > 0) {
    steps.push(
      `${filteredCoordinates.nonCoordinateCount} numeric pair(s) read as measurements, not positions: `
      + filteredCoordinates.nonCoordinateReasons.join("; "),
    );
  }
  if (filteredCoordinates.selectionRequired) {
    warnings.push(`${filteredCoordinates.groups.length} separate coordinate groups found; choose one before mapping`);
    steps.push(`coordinate group selection required (${filteredCoordinates.groups.length} groups)`);
  }
  const strictGridRows = crsMode === "wgs84" ? [] : extractZoneLessUtmRows(text);

  // The universal pattern engine reads column headings, so it covers layouts
  // the strict `NORTHING EASTING` reader cannot — `EASTING` first, Arabic
  // headings, `From/To` edges. It is consulted when the strict reader finds
  // nothing, and its rows then go through exactly the same zone-selection and
  // conversion safety as any other survey table.
  const parcelCandidates: ParcelCandidate[] = crsMode === "wgs84"
    ? []
    : extractParcelCandidates(numerals.text, {
        utmZone: isValidUtmZone(input.utmZone) ? input.utmZone : undefined,
        utmHemisphere: isHemisphere(input.utmHemisphere) ? input.utmHemisphere : undefined,
      });
  // --- Layout-aware reading ---------------------------------------------
  // Flat text is one representation of the page, and a lossy one: a PDF emits
  // its glyphs in whatever order it likes, so a four-row schedule can arrive
  // as four eastings, then four northings, then four side lengths. Reading the
  // same page by its columns recovers the table the reader can see.
  const layoutTables: LayoutTable[] = crsMode === "wgs84" || !input.positionedItems?.length
    ? []
    : reconstructLayout(input.positionedItems);
  const layoutReadings: LayoutTableReading[] = layoutTables.length === 0
    ? []
    : extractTablesFromLayout(layoutTables, {
        documentText: numerals.text,
        countryCode: countryDetection.countryCode,
        declaredZone: input.utmZone,
        hemisphere: input.utmHemisphere,
      });
  if (layoutTables.length > 0) {
    steps.push(`layout reconstruction: ${layoutTables.length} page(s), ${layoutTables.reduce((total, table) => total + table.rows.length, 0)} rows`);
  }
  for (const reading of layoutReadings) {
    steps.push(
      `layout table on page ${reading.page}: ${reading.rows.length} coordinate row(s), `
      + `${reading.kind.toLowerCase()}, axes ${reading.axis.confident ? "resolved" : "unresolved"} (${reading.evidence.join("; ")})`,
    );
    warnings.push(...reading.warnings);
  }
  const layoutAccount: RowAccount = layoutReadings.length
    ? mergeRowAccounts(layoutReadings.map((reading) => reading.account))
    : emptyRowAccount();
  const layoutGrid = layoutReadings
    .filter((reading) => reading.kind === "PROJECTED" && reading.rows.length >= 2)
    .sort((left, right) => right.rows.length - left.rows.length)[0];

  const patternGridCandidate = parcelCandidates.find(
    (candidate) =>
      candidate.crs?.kind === "utm"
      && candidate.vertices.length >= 2
      && candidate.vertices.every((vertex) => vertex.easting !== undefined && vertex.northing !== undefined),
  );

  // Both readers can see the same table. The strict reader carries the OCR
  // digit repair, so it wins a tie; but only a reading whose edges actually
  // chain from corner to corner can be trusted with the corner numbers.
  const strictChains = strictGridRows.length >= 2
    && strictGridRows.every((row, index) => row.lineEnd === strictGridRows[(index + 1) % strictGridRows.length].lineStart);
  const gridCandidate = strictChains && strictGridRows.length >= (patternGridCandidate?.vertices.length ?? 0)
    ? undefined
    : patternGridCandidate;

  const flatRows: ZoneLessUtmRow[] = gridCandidate === undefined
    ? strictGridRows
    : gridCandidate
      ? gridCandidate.table.rows.map((row) => ({
          lineStart: row.fromPoint,
          lineEnd: row.toPoint ?? row.fromPoint,
          northing: row.northing as number,
          easting: row.easting as number,
          distance: row.distance,
          raw: row.raw,
          northingToken: String(row.northing),
          eastingToken: String(row.easting),
        }))
      : [];
  if (gridCandidate && flatRows.length >= 2) {
    steps.push(
      `survey table read by the pattern engine: ${gridCandidate.table.headingRaw} (${gridCandidate.sequenceEvidence})`,
    );
  }

  // The layout reader is preferred over the flat-text readers when it accounts
  // for more rows, because a reader that sees more of the table has lost less
  // of it. It never silently replaces a longer flat reading.
  const layoutRows: ZoneLessUtmRow[] = layoutGrid
    ? layoutGrid.rows.map((row, index) => ({
        lineStart: row.fromPoint ?? row.pointId ?? String(index + 1),
        lineEnd: row.toPoint ?? row.fromPoint ?? String(index + 2),
        northing: row.secondary,
        easting: row.primary,
        distance: row.distance,
        raw: row.raw,
        northingToken: String(row.secondary),
        eastingToken: String(row.primary),
      }))
    : [];
  const useLayoutRows = layoutRows.length >= 2 && layoutRows.length > flatRows.length;
  const zoneLessRows: ZoneLessUtmRow[] = useLayoutRows ? layoutRows : flatRows;
  if (useLayoutRows) {
    steps.push(
      `survey table read from the page layout: ${layoutGrid?.headerText ?? "unheaded columns"} `
      + `(${layoutRows.length} rows; flat text read ${flatRows.length})`,
    );
    if (layoutGrid && !layoutGrid.axis.confident) {
      warnings.push("the coordinate axes of the layout table are unconfirmed; the result needs review before it is used");
    }
  }
  strategyRows = zoneLessRows;

  audit.layoutTables = layoutReadings.map((reading) => ({
    page: reading.page,
    kind: reading.kind,
    heading: reading.headerText,
    rowCount: reading.rows.length,
    detectedRows: reading.account.detectedRows,
    axisConfident: reading.axis.confident,
    axisEvidence: reading.evidence,
  }));

  audit.rowAccount = layoutAccount.detectedRows > 0 ? layoutAccount : undefined;

  const initialCoordinateDetails: CoordinateEvidenceDetail[] = coordinateEvidence.map((ce) => ({
    source: ce.source,
    text: ce.raw,
    raw: ce.raw,
    orderConfidence: 1,
    crsHint: ce.crs,
  }));

  steps.push("crs detection");
  const detectedCrs = deps.crsDetector.detect(text, initialCoordinateDetails);
  const validUserZone = isValidUtmZone(input.utmZone) ? input.utmZone : undefined;
  const validUserHemisphere: Hemisphere | undefined = isHemisphere(input.utmHemisphere)
    ? input.utmHemisphere
    : undefined;

  // A user choice always wins over inference; inference runs only when neither
  // the document nor the user supplied a zone.
  const zoneDecision = zoneLessRows.length >= 2 && detectedCrs.zone === undefined && validUserZone === undefined
    ? chooseInitialUtmZone({
        text,
        countryCode: deps.adapter.countryCode,
        rows: zoneLessRows,
        inferFallback: () => inferUtmCrs(zoneLessRows, deps.adapter)?.zone,
      })
    : { zone: undefined, source: "NONE" as const };
  const inferredCrs = zoneDecision.zone !== undefined
    ? { zone: zoneDecision.zone, hemisphere: "N" as const }
    : undefined;
  let selectedUtmZone: number | undefined;
  let selectedHemisphere: Hemisphere | undefined;
  let utmZoneSource: "DOCUMENT" | "USER" | "OMAN_DEFAULT" | "COUNTRY_INFERENCE" | "NONE" = "NONE";

  const userZoneApplies = validUserZone !== undefined
    && (zoneLessRows.length >= 2 || crsMode === "utm" || detectedCrs.kind === "utm");

  if (userZoneApplies) {
    selectedUtmZone = validUserZone;
    selectedHemisphere = validUserHemisphere ?? "N";
    utmZoneSource = "USER";
  } else if (zoneLessRows.length >= 2 && detectedCrs.zone !== undefined) {
    selectedUtmZone = detectedCrs.zone;
    selectedHemisphere = detectedCrs.northernHemisphere ? "N" : "S";
    utmZoneSource = "DOCUMENT";
  } else if (inferredCrs !== undefined) {
    selectedUtmZone = inferredCrs.zone;
    selectedHemisphere = inferredCrs.hemisphere;
    utmZoneSource = zoneDecision.source === "OMAN_DEFAULT" ? "OMAN_DEFAULT" : "COUNTRY_INFERENCE";
  }

  strategyInferredUtmZone = utmZoneSource === "COUNTRY_INFERENCE" ? selectedUtmZone : undefined;
  strategySelectedUtmZone = selectedUtmZone;
  strategyUtmZoneSource = utmZoneSource === "NONE" ? undefined : utmZoneSource;
  strategyCrsSelectionRequired = (zoneLessRows.length >= 2 || crsMode === "utm")
    && selectedUtmZone === undefined;

  if (selectedUtmZone !== undefined && selectedHemisphere !== undefined) {
    for (const row of zoneLessRows) {
      coordinateEvidence.push({
        format: "utm",
        raw: `${selectedUtmZone}${selectedHemisphere} ${row.easting.toFixed(3)} ${row.northing.toFixed(3)}`,
        crs: "utm",
        source: "survey-table",
      });
    }
    if (utmZoneSource === "COUNTRY_INFERENCE") {
      warnings.push(`UTM zone ${selectedUtmZone} inferred from document country bounds`);
    }
    // Oman Zone 40N is a product default, not an uncertainty warning.  It is
    // recorded in the strategy/CRS source and the UI exposes a direct 40/39
    // switch that reuses these extracted rows without re-running OCR.
    if (utmZoneSource === "OMAN_DEFAULT") {
      steps.push("Oman cadastral product default applied: UTM 40N (user override 39N available)");
    }
    if (zoneLessRows.some((row) => row.ocrCorrected)) {
      warnings.push("survey-table OCR ambiguities corrected against declared side lengths and area");
    }
    steps.push(`zone-less survey table resolved as UTM ${selectedUtmZone}${selectedHemisphere} from ${utmZoneSource} (${zoneLessRows.length} rows)`);
  } else if (zoneLessRows.length >= 2) {
    warnings.push("survey coordinate table found; select UTM zone and hemisphere before map placement");
  }

  const coordinateDetails: CoordinateEvidenceDetail[] = coordinateEvidence.map((ce) => ({
    source: ce.source,
    text: ce.raw,
    raw: ce.raw,
    orderConfidence: 1,
    crsHint: ce.crs,
  }));
  const crs = crsMode === "wgs84"
    ? {
        ...detectedCrs,
        kind: "wgs84" as const,
        zone: undefined,
        northernHemisphere: true,
        confidence: "DETECTED" as const,
        reason: "coordinate system set to WGS84 by the user",
      }
    : selectedUtmZone !== undefined
      ? {
          ...detectedCrs,
          kind: "utm" as const,
          zone: selectedUtmZone,
          northernHemisphere: selectedHemisphere !== "S",
          confidence: utmZoneSource === "DOCUMENT" ? detectedCrs.confidence : "PROBABLE" as const,
          reason: utmZoneSource === "USER"
            ? "UTM zone and hemisphere supplied by the user"
            : utmZoneSource === "OMAN_DEFAULT"
              ? "Oman cadastral product default: UTM zone 40N"
              : utmZoneSource === "COUNTRY_INFERENCE"
                ? "UTM zone inferred uniquely from document-country bounds"
                : detectedCrs.reason,
        }
      : detectedCrs;
  // A UTM CRS declared inside the coordinate rows themselves is surfaced too,
  // so the UI can always name the CRS it converted from.
  const documentZone = crs.kind === "utm" && isValidUtmZone(crs.zone) ? crs.zone : undefined;
  const documentHemisphere: Hemisphere | undefined = documentZone === undefined
    ? undefined
    : crs.northernHemisphere ? "N" : "S";
  const resolvedZone = selectedUtmZone ?? documentZone;
  const resolvedHemisphere = selectedHemisphere ?? documentHemisphere;
  const crsSelection = zoneLessRows.length >= 2 || resolvedZone !== undefined || crsMode === "utm"
    ? {
        required: strategyCrsSelectionRequired,
        zone: resolvedZone,
        hemisphere: resolvedHemisphere,
        source: utmZoneSource === "NONE" && resolvedZone !== undefined
          ? ("DOCUMENT" as const)
          : utmZoneSource,
        epsg: resolvedZone !== undefined && resolvedHemisphere !== undefined
          ? utmEpsgCode(resolvedZone, resolvedHemisphere)
          : undefined,
      }
    : undefined;
  steps.push(`crs=${crs.kind} confidence=${crs.confidence}`);

  // Each accepted corner keeps its provenance: the row it came from, the page
  // it was on, the values as documented, and which parser read it.
  const sourceVertices: SourceVertex[] = [];
  // Every candidate row that does not become a vertex is written down with a
  // reason. Nothing may leave this loop by falling through it.
  const conversionRejections: RejectedRow[] = [];

  for (const [candidateIndex, ce] of coordinateEvidence.entries()) {
    const converted = toWgs84Point(ce.raw, ce.format, crs.kind, crs.zone, crs.northernHemisphere);
    if (!converted) {
      conversionRejections.push({
        rowIndex: candidateIndex,
        reason: crs.kind === "unknown" ? "CRS_UNRESOLVED" : "CONVERSION_FAILED",
        detail: `could not convert "${ce.raw}" (${ce.format}) to WGS84`,
        raw: ce.raw,
      });
      continue;
    }
    const protectedPoint = protectCoordinateOrder(converted, deps.adapter);
    if (protectedPoint.orderConfidence === 0) {
      conversionRejections.push({
        rowIndex: candidateIndex,
        reason: "FAILED_SANITY_CHECK",
        detail: `the converted point contradicts the document's own evidence: ${ce.raw}`,
        raw: ce.raw,
      });
      continue;
    }

    const utmRow = ce.format === "utm"
      ? /(\d{1,2})\s*([NSns])\s*(\d{5,6}(?:\.\d+)?)\s*[,;\s]\s*(\d{6,7}(?:\.\d+)?)/.exec(ce.raw)
      : null;
    const label = `P${sourceVertices.length + 1}`;
    const surveyRow = ce.source === "survey-table" ? zoneLessRows[sourceVertices.length] : undefined;
    const detail: CoordinateEvidenceDetail = {
      source: ce.source,
      page: pageLocator(text.indexOf(ce.raw)),
      text: ce.raw,
      raw: ce.raw,
      parsedLat: protectedPoint.point.lat,
      parsedLon: protectedPoint.point.lon,
      orderConfidence: protectedPoint.orderConfidence,
      crsHint: ce.crs ?? crs.kind,
      label,
      pointNumber: surveyRow?.lineStart,
      rowIndex: sourceVertices.length,
      originalEasting: utmRow ? Number.parseFloat(utmRow[3]) : undefined,
      originalNorthing: utmRow ? Number.parseFloat(utmRow[4]) : undefined,
      originalZone: utmRow ? Number.parseInt(utmRow[1], 10) : undefined,
      originalHemisphere: utmRow ? (utmRow[2].toUpperCase() === "S" ? "S" : "N") : undefined,
    };

    if (protectedPoint.orderConfidence < 0.5) {
      warnings.push(`coordinate rejected by sanity validation: ${ce.raw}`);
      conversionRejections.push({
        rowIndex: candidateIndex,
        reason: "FAILED_SANITY_CHECK",
        detail: `sanity validation rejected the converted point: ${ce.raw}`,
        raw: ce.raw,
      });
    } else {
      coordinateDetails.push(detail);
      warnings.push(...protectedPoint.warnings);
      sourceVertices.push({
        index: sourceVertices.length,
        label,
        pointNumber: detail.pointNumber,
        page: detail.page,
        rowIndex: detail.rowIndex,
        sourceText: ce.raw,
        original: {
          easting: detail.originalEasting,
          northing: detail.originalNorthing,
          zone: detail.originalZone,
          hemisphere: detail.originalHemisphere,
          latitude: ce.format !== "utm" ? protectedPoint.point.lat : undefined,
          longitude: ce.format !== "utm" ? protectedPoint.point.lon : undefined,
        },
        point: protectedPoint.point,
        crs: (ce.crs ?? crs.kind) === "utm" ? "utm" : "wgs84",
        confidence: protectedPoint.orderConfidence,
        extractedBy: `${ce.source}/${deps.adapter.countryCode}`,
        warnings: protectedPoint.warnings,
      });
    }
  }

  // --- Final row accounting ---------------------------------------------
  // Detected rows come from the most complete reader; accepted rows are the
  // vertices that survived. buildRowAccount reconciles the two and records an
  // explicit entry for anything the loops above did not explain, so a corner
  // can never disappear between the table and the map.
  const crsBlockedRows = zoneLessRows.length >= 2 && selectedUtmZone === undefined
    ? zoneLessRows.map((row, index): RejectedRow => ({
        rowIndex: index,
        reason: "CRS_UNRESOLVED",
        detail: "no coordinate reference system was established, so this grid row could not be converted",
        raw: row.raw,
      }))
    : [];
  const ocrRejectedRows = input.ocrRejections?.length ?? 0;
  const detectedForAccount = Math.max(
    layoutAccount.detectedRows,
    zoneLessRows.length + ocrRejectedRows,
    coordinateEvidence.length,
  );
  const finalRowAccount = detectedForAccount > 0
    ? mergeRowAccounts([
        buildRowAccount({
          detectedRows: detectedForAccount,
          parsedRows: coordinateEvidence.length,
          acceptedRows: sourceVertices.length,
          rejections: [
            ...layoutAccount.rejections,
            ...conversionRejections,
            ...crsBlockedRows,
            ...(input.ocrRejections ?? []),
          ],
        }),
      ])
    : undefined;
  if (finalRowAccount) {
    audit.rowAccount = finalRowAccount;
    steps.push(`row accounting: ${finalRowAccount.summary}`);
    if (finalRowAccount.reviewRequired) {
      warnings.push(finalRowAccount.summary);
      for (const rejection of finalRowAccount.rejections.slice(0, 8)) {
        warnings.push(`row ${rejection.rowIndex >= 0 ? rejection.rowIndex + 1 : "?"}: ${rejection.reason} — ${rejection.detail ?? "no detail"}`);
      }
    }
  }

  // What each independent reader saw. Consensus can never raise a verdict; it
  // exists so a reader that lost a row is impossible to ignore.
  const winningSource: EvidenceSource = useLayoutRows
    ? "native_layout"
    : gridCandidate
      ? "table_detector"
      : strictGridRows.length > 0
        ? "native_text"
        : "regex_labelled";
  const acceptedPoints = new Map<string, { lat: number; lon: number }>(
    sourceVertices.map((vertex) => [vertex.label, vertex.point]),
  );
  const readerSightings: SourceReading[] = ([
    { source: "native_text" as EvidenceSource, detectedRows: strictGridRows.length },
    { source: "table_detector" as EvidenceSource, detectedRows: patternGridCandidate?.vertices.length ?? 0 },
    { source: "native_layout" as EvidenceSource, detectedRows: layoutAccount.detectedRows },
    { source: "regex_labelled" as EvidenceSource, detectedRows: coordinateEvidence.length },
  ] as const)
    .filter((reading) => reading.detectedRows > 0)
    .map((reading) => ({
      source: reading.source,
      detectedRows: reading.detectedRows,
      points: reading.source === winningSource ? acceptedPoints : new Map(),
    }));
  if (readerSightings.length > 0) {
    const agreement = reconcileCandidates(
      readerSightings.some((reading) => reading.points.size > 0)
        ? readerSightings
        : readerSightings.map((reading, index) => (index === 0 ? { ...reading, points: acceptedPoints } : reading)),
    );
    audit.readerAgreement = {
      verdict: agreement.verdict,
      sources: agreement.sourceRowCounts.map((entry) => ({ source: entry.source, detectedRows: entry.detectedRows })),
    };
    for (const warning of agreement.warnings) {
      if (!warnings.includes(warning)) warnings.push(warning);
    }
  }

  const evidence = buildLandGeoEvidence(coordinateDetails, hints);
  const geometryResult = buildLandGeometry(evidence.coordinatePairs, deps.adapter);
  warnings.push(...geometryResult.warnings);

  // Repeated corners are not new vertices, but the document did contain them,
  // so the count is reported for audit instead of being silently dropped.
  const distinctKeys = new Set(evidence.coordinatePairs.map((point) => `${point.lat.toFixed(9)},${point.lon.toFixed(9)}`));
  const duplicateSourcePoints = evidence.coordinatePairs.length - distinctKeys.size;
  if (duplicateSourcePoints > 0) {
    warnings.push(`${duplicateSourcePoints} duplicate point(s) present in the source document`);
  }

  // Valid WGS84 outside the UTM band stays WGS84. No misleading grid values
  // are invented for polar locations.
  const utmOutOfRange = evidence.coordinatePairs.length > 0
    && evidence.coordinatePairs.some((point) => !isWithinUtmLatitudeBand(point.lat));
  if (utmOutOfRange) {
    warnings.push("location is outside the standard UTM latitude band; WGS84 is kept and no UTM grid is produced");
  }

  const coordinateGroups = filteredCoordinates.groups.length > 0 ? filteredCoordinates.groups : undefined;
  const coordinateGroupSelectionRequired = filteredCoordinates.selectionRequired || undefined;

  // --- Parcel reconstruction -------------------------------------------
  // The documented order is measured as written. A user-confirmed order is
  // applied on top of it for the drawing, never in place of the record.
  const orderConfirmedByUser = Boolean(input.confirmedOrder && input.confirmedOrder.length > 0);
  const analysedVertices = orderConfirmedByUser
    ? reorderVertices(sourceVertices, input.confirmedOrder as number[])
    : sourceVertices;
  // Edge lengths printed per corner pair are exact evidence and outrank the
  // cardinal side descriptions when both are present.
  const documentedEdges = zoneLessRows.length >= 2
    ? zoneLessRows
        .filter((row) => row.distance !== undefined)
        .map((row) => ({ from: row.lineStart, to: row.lineEnd, meters: row.distance as number }))
    : [];

  const boundary = sourceVertices.length > 0
    ? analyseBoundary({
        vertices: analysedVertices,
        statedArea,
        documentedSides: boundaryDescription.sides,
        documentedEdges,
        isPlausiblePoint: deps.adapter.bounds ? (point) => deps.adapter.isPlausiblePoint(point) : undefined,
        countryLabel: deps.adapter.countryCode,
      })
    : undefined;

  if (boundary?.planeExtentWarning) {
    warnings.push("parcel extent is too large for a single survey plane; measurements are approximate");
  }
  if (boundary?.suggestedSequence) {
    warnings.push("an alternative boundary order was found; it needs confirmation before it is used");
  }
  if (boundary?.areaComparison && boundary.areaComparison.verdict !== "MATCH") {
    warnings.push(
      `computed area differs from the registered area by ${boundary.areaComparison.differencePercent.toFixed(2)}%`,
    );
  }
  if (boundary?.sideLengthComparison && boundary.sideLengthComparison.verdict === "MISMATCH") {
    warnings.push("documented side lengths do not match the coordinates");
  }

  const surveyTables = parcelCandidates.map((candidate) => ({
    id: candidate.id,
    heading: candidate.table.headingRaw,
    rowCount: candidate.vertices.length,
    sequenceEvidence: candidate.sequenceEvidence,
    closed: candidate.closed,
    crs: candidate.crs?.kind ?? "utm",
    zone: candidate.crs?.zone,
    hemisphere: candidate.crs?.hemisphere,
    epsg: candidate.crs?.epsg,
    crsSelectionRequired: candidate.crsSelectionRequired,
    score: candidate.score,
  }));

  const documentIntelligence = {
    country: {
      code: countryDetection.countryCode,
      label: profile.label,
      confidence: countryDetection.confidence,
      level: countryDetection.level,
      userSupplied: countryDetection.userSupplied,
      evidence: countryDetection.evidence.map((hit) => ({ kind: hit.kind, term: hit.term })),
    },
    documentType: {
      familyId: documentType.familyId,
      kind: documentType.kind,
      label: documentType.label,
      confidence: documentType.confidence,
      level: documentType.level,
      matchedKeywords: documentType.matchedKeywords,
    },
    adapter: deps.adapter.countryCode,
    pageCount: input.pages?.length ?? 1,
    arabicNumerals: numerals.hadArabicDigits,
    surveyTables,
  };

  const parcel = boundary
    ? {
        vertices: analysedVertices,
        boundary,
        documented: {
          sides: boundaryDescription.sides,
          segments: boundaryDescription.segments,
          bearings: boundaryDescription.bearings.map((bearing) => ({
            degrees: bearing.degrees,
            raw: bearing.raw,
          })),
          area: statedArea
            ? {
                squareMeters: statedArea.squareMeters,
                statedValue: statedArea.statedValue,
                unit: statedArea.unit,
                unitStated: statedArea.unitStated,
                raw: statedArea.raw,
              }
            : undefined,
        },
        orderConfirmedByUser,
        sequenceEvidence: gridCandidate?.sequenceEvidence
          ?? (strictGridRows.length >= 2 ? "EXPLICIT_LINE_TOPOLOGY" : "ORDERED_COORDINATE_TABLE"),
        closedByTopology: gridCandidate?.closed ?? false,
      }
    : undefined;

  const crsConfidence = crs.confidence;
  let candidates: import("@/lib/geo/contracts").GeocodeCandidate[] = [];
  let status: ResolveStatus;
  let locationConfidence: ConfidenceLevel;
  let boundaryConfidence: ConfidenceLevel;
  let center = geometryResult.center ?? null;
  let resolvedAddress: string | undefined;
  let geocodingUsed = false;

  if (evidence.coordinatePairs.length > 0) {
    steps.push(`explicit coordinates resolved (${evidence.coordinatePairs.length})`);
    const geometryValid = geometryResult.geometry
      ? validateGeometry(geometryResult.geometry, deps.adapter.countryCode).valid
      : false;
    strategyGeometryValid = geometryValid;

    if (crsConfidence === "UNKNOWN") {
      status = "PARTIALLY_RESOLVED";
      steps.push("explicit coords but CRS unknown -> partially resolved");
    } else {
      status = "RESOLVED_EXPLICIT_COORDINATES";
    }

    locationConfidence = computeLocationConfidence({
      evidence,
      crsConfidence,
      geometryType: geometryResult.geometry?.type === "linestring" ? undefined : geometryResult.geometry?.type,
      geometryValid,
      candidatesCount: 0,
    });
    boundaryConfidence = computeBoundaryConfidence({
      evidence,
      crsConfidence,
      geometryType: geometryResult.geometry?.type === "linestring" ? undefined : geometryResult.geometry?.type,
      geometryValid,
      candidatesCount: 0,
    });

    return finalize({
      status,
      center: center ?? evidence.coordinatePairs[0],
      geometry: geometryResult.geometry,
      locationConfidence,
      boundaryConfidence,
      crsConfidence,
      crsSelection,
      utmOutOfRange: utmOutOfRange || undefined,
      duplicateSourcePoints: duplicateSourcePoints || undefined,
      coordinateGroups,
      coordinateGroupSelectionRequired,
      documentIntelligence,
      parcel,
      resolvedAddress,
      parcelIdentifiers: extractParcelIdentifiers(hints, geoEvidence),
      evidence,
      candidates,
      warnings,
      document: { category: classification.category, classificationConfidence: classification.confidence },
      extraction: { method, charCount: extraction.charCount, ocrUsed, ocrConfidence: input.ocrConfidence, aiUsed: false, geocodingUsed },
      steps,
    });
  }

  if (coordinateGroupSelectionRequired) {
    steps.push("coordinate group selection required before conversion");
    return finalize({
      status: "PARTIALLY_RESOLVED",
      locationConfidence: "UNRESOLVED",
      boundaryConfidence: "UNRESOLVED",
      crsConfidence,
      crsSelection,
      utmOutOfRange: utmOutOfRange || undefined,
      duplicateSourcePoints: duplicateSourcePoints || undefined,
      coordinateGroups,
      coordinateGroupSelectionRequired,
      documentIntelligence,
      parcel,
      parcelIdentifiers: extractParcelIdentifiers(hints, geoEvidence),
      evidence,
      candidates: [],
      warnings,
      document: { category: classification.category, classificationConfidence: classification.confidence },
      extraction: { method, charCount: extraction.charCount, ocrUsed, ocrConfidence: input.ocrConfidence, aiUsed: false, geocodingUsed: false },
      steps,
    });
  }

  if (strategyCrsSelectionRequired) {
    steps.push("UTM zone/hemisphere selection required before conversion");
    return finalize({
      status: "PARTIALLY_RESOLVED",
      locationConfidence: "UNRESOLVED",
      boundaryConfidence: "UNRESOLVED",
      crsConfidence,
      crsSelection,
      utmOutOfRange: utmOutOfRange || undefined,
      duplicateSourcePoints: duplicateSourcePoints || undefined,
      coordinateGroups,
      coordinateGroupSelectionRequired,
      documentIntelligence,
      parcel,
      parcelIdentifiers: extractParcelIdentifiers(hints, geoEvidence),
      evidence,
      candidates: [],
      warnings,
      document: { category: classification.category, classificationConfidence: classification.confidence },
      extraction: { method, charCount: extraction.charCount, ocrUsed, ocrConfidence: input.ocrConfidence, aiUsed: false, geocodingUsed: false },
      steps,
    });
  }

  steps.push("no explicit coordinates -> geocoding path");
  geocodingUsed = true;
  candidates = await deps.geocodingProvider.searchCandidates(evidence);
  steps.push(`geocoding candidates: ${candidates.length}`);

  const best = await bestCandidate(candidates);
  const parcelCount = hints.parcels.length + geoEvidence.parcels.length;

  if (best && best.point.lat !== 0 && best.point.lon !== 0) {
    const protectedPoint = protectCoordinateOrder(best.point, deps.adapter);
    if (protectedPoint.orderConfidence > 0) {
      center = protectedPoint.point;
      resolvedAddress = best.label;
      const bestScore = best.score ?? 0;
      if (bestScore >= 0.8) {
        status = "RESOLVED_GEOCODED";
        locationConfidence = "HIGH";
      } else if (candidates.length > 1) {
        status = "NEEDS_USER_CONFIRMATION";
        locationConfidence = "MEDIUM";
      } else {
        status = "RESOLVED_GEOCODED";
        locationConfidence = "MEDIUM";
      }
      boundaryConfidence = "UNRESOLVED";
    } else {
      status = "UNRESOLVED";
      locationConfidence = "UNRESOLVED";
      boundaryConfidence = "UNRESOLVED";
    }
  } else if (parcelCount > 0) {
    status = "PARTIALLY_RESOLVED";
    locationConfidence = "LOW";
    boundaryConfidence = "UNRESOLVED";
    warnings.push("parcel/plan identifiers present but no resolvable coordinates");
  } else {
    status = "UNRESOLVED";
    locationConfidence = "UNRESOLVED";
    boundaryConfidence = "UNRESOLVED";
    warnings.push("no resolvable geographic evidence found");
  }

  return finalize({
    status,
    center: center ?? undefined,
    geometry: undefined,
    locationConfidence,
    boundaryConfidence,
    crsConfidence,
    crsSelection,
    resolvedAddress,
    parcelIdentifiers: extractParcelIdentifiers(hints, geoEvidence),
    evidence,
    candidates,
    warnings,
    document: { category: classification.category, classificationConfidence: classification.confidence },
    extraction: { method, charCount: extraction.charCount, ocrUsed, ocrConfidence: input.ocrConfidence, aiUsed: false, geocodingUsed },
    steps,
  });
}
