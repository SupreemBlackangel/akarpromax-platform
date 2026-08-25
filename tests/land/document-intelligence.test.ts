import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  containsArabicDigits,
  normalizeArabicDigits,
  normalizeNumerals,
  normalizeNumericToken,
  parseAreaValue,
} from "@/lib/land/documents/numerals";
import {
  COUNTRY_PROFILES,
  GENERIC_PROFILE,
  OMAN_PROFILE,
  SAUDI_PROFILE,
  getCountryProfile,
  listCountryProfileCodes,
} from "@/lib/land/documents/profiles";
import {
  describeCountryDetection,
  detectDocumentCountry,
} from "@/lib/land/documents/country-detector";
import { detectDocumentType } from "@/lib/land/documents/document-type";
import {
  extractBearings,
  extractBoundaryDescription,
  extractDocumentedSegments,
  extractDocumentedSides,
} from "@/lib/land/documents/boundary-terms";

describe("Arabic numeral normalisation", () => {
  it("folds Arabic-Indic and Persian digits without touching the original", () => {
    const input = "المساحة ٦٠٠ متر مربع";
    const result = normalizeNumerals(input);
    assert.equal(result.text, "المساحة 600 متر مربع");
    assert.equal(result.original, input);
    assert.equal(result.hadArabicDigits, true);
    assert.equal(containsArabicDigits(input), true);
    assert.equal(containsArabicDigits("600"), false);
  });

  it("folds Persian digits", () => {
    assert.equal(normalizeArabicDigits("۲۵٫۴۰"), "25٫40");
  });

  it("resolves the Arabic decimal and thousands separators", () => {
    const result = normalizeNumerals("١٬٢٤٨٫٦٢");
    assert.equal(result.text, "1248.62");
  });

  it("leaves a Latin document unchanged", () => {
    const result = normalizeNumerals("AREA = 1,248.62 SQ. M.");
    assert.equal(result.text, "AREA = 1,248.62 SQ. M.");
    assert.equal(result.hadArabicDigits, false);
  });

  it("reads a numeric token whatever separators it uses", () => {
    assert.equal(normalizeNumericToken("1,248.62"), 1248.62);
    assert.equal(normalizeNumericToken("1.248,62"), 1248.62);
    assert.equal(normalizeNumericToken("1,234"), 1234);
    assert.equal(normalizeNumericToken("1,23"), 1.23);
    assert.equal(normalizeNumericToken("25.40"), 25.4);
    assert.equal(normalizeNumericToken("١٢٣٤٫٥٦"), 1234.56);
    assert.equal(normalizeNumericToken("-58.3816"), -58.3816);
    assert.equal(normalizeNumericToken("abc"), null);
  });
});

describe("Area value parsing", () => {
  it("reads square metres in both languages", () => {
    const arabic = parseAreaValue("١٬٢٥٠ متر مربع");
    assert.ok(arabic);
    assert.equal(arabic.squareMeters, 1250);
    assert.equal(arabic.unit, "m2");
    assert.equal(arabic.unitStated, true);

    const english = parseAreaValue("1,250.00 sq. m.");
    assert.ok(english);
    assert.equal(english.squareMeters, 1250);
  });

  it("converts a stated unit and only a stated unit", () => {
    const hectares = parseAreaValue("2.5 hectares");
    assert.ok(hectares);
    assert.equal(hectares.squareMeters, 25_000);
    assert.equal(hectares.unit, "ha");

    const dunam = parseAreaValue("3 دونم");
    assert.ok(dunam);
    assert.equal(dunam.squareMeters, 3000);

    const bare = parseAreaValue("600");
    assert.ok(bare);
    assert.equal(bare.squareMeters, 600);
    assert.equal(bare.unitStated, false, "an unstated unit must not be converted");
  });

  it("rejects a non-area value", () => {
    assert.equal(parseAreaValue("no number here"), null);
    assert.equal(parseAreaValue("0 م2"), null);
  });
});

describe("Country profile registry", () => {
  it("registers the Gulf and neighbouring profiles", () => {
    const codes = listCountryProfileCodes();
    for (const code of ["SA", "OM", "AE", "QA", "BH", "KW", "JO", "EG", "TR"]) {
      assert.ok(codes.includes(code), `${code} profile missing`);
    }
  });

  it("falls back to the generic profile, never to a country", () => {
    assert.equal(getCountryProfile(undefined).countryCode, "UNKNOWN");
    assert.equal(getCountryProfile("ZZ").countryCode, "UNKNOWN");
    assert.equal(GENERIC_PROFILE.bounds, undefined);
    assert.equal(GENERIC_PROFILE.countryNames.length, 0);
  });

  it("gives every profile the universal wording plus its own", () => {
    for (const profile of COUNTRY_PROFILES) {
      assert.ok(profile.coordinateLabels.includes("easting"), `${profile.countryCode} coordinate labels`);
      assert.ok(profile.areaLabels.includes("المساحة"), `${profile.countryCode} area labels`);
      assert.ok(profile.documentFamilies.length > 0, `${profile.countryCode} families`);
      assert.ok(profile.label.ar && profile.label.en, `${profile.countryCode} label`);
    }
  });

  it("never pins a country that spans several zones to one UTM zone", () => {
    assert.deepEqual([...(SAUDI_PROFILE.crsHints.utmZones ?? [])], [36, 37, 38, 39]);
    assert.deepEqual([...(OMAN_PROFILE.crsHints.utmZones ?? [])], [39, 40]);
  });
});

describe("Country detection", () => {
  it("detects Saudi Arabia from its authority with high confidence", () => {
    const detection = detectDocumentCountry({
      text: "المملكة العربية السعودية - وزارة العدل - صك إلكتروني - مدينة الرياض - رقم القطعة 1173",
    });
    assert.equal(detection.countryCode, "SA");
    assert.equal(detection.level, "HIGH");
    assert.ok(detection.evidence.some((hit) => hit.kind === "AUTHORITY"));
    assert.match(describeCountryDetection(detection, "en"), /Saudi Arabia — High confidence/);
  });

  it("detects Oman from its ministry and governorate", () => {
    const detection = detectDocumentCountry({
      text: "سلطنة عمان - وزارة الإسكان والتخطيط العمراني - محافظة مسقط - ولاية بوشر - رقم القسيمة 45",
    });
    assert.equal(detection.countryCode, "OM");
    assert.equal(detection.level, "HIGH");
    assert.match(describeCountryDetection(detection, "ar"), /عُمان/);
  });

  it("detects Oman from an English survey document", () => {
    const detection = detectDocumentCountry({
      text: "SULTANATE OF OMAN - MINISTRY OF HOUSING - MUSCAT GOVERNORATE - LAND SURVEY PLAN",
    });
    assert.equal(detection.countryCode, "OM");
    assert.ok(detection.level === "HIGH" || detection.level === "MEDIUM");
  });

  it("returns UNKNOWN rather than guessing a country", () => {
    const detection = detectDocumentCountry({
      text: "LAND SURVEY REPORT\nP1 24.713600 N 46.675300 E\nP2 24.713900 N 46.675300 E",
    });
    assert.notEqual(detection.level, "HIGH");
    assert.equal(detection.profile.countryCode, detection.countryCode);
    assert.match(describeCountryDetection(detection, "en"), /Country uncertain|confidence/);
  });

  it("never uses Saudi Arabia as a fallback for an unrelated document", () => {
    const detection = detectDocumentCountry({ text: "Generic engineering note with no place names." });
    assert.equal(detection.countryCode, "UNKNOWN");
    assert.equal(detection.level, "UNKNOWN");
  });

  it("treats coordinates as corroboration, never as proof on their own", () => {
    // A point inside the Saudi envelope, with no textual evidence at all.
    const detection = detectDocumentCountry({
      text: "boundary schedule",
      points: [{ lat: 24.7136, lon: 46.6753 }],
    });
    assert.notEqual(detection.level, "HIGH");
    assert.notEqual(detection.level, "MEDIUM");
  });

  it("trusts an explicitly supplied country", () => {
    const detection = detectDocumentCountry({ text: "no evidence", countryCode: "OM" });
    assert.equal(detection.countryCode, "OM");
    assert.equal(detection.userSupplied, true);
    assert.equal(detection.level, "HIGH");
  });

  it("keeps a close second country visible", () => {
    const detection = detectDocumentCountry({
      text: "المملكة العربية السعودية والإمارات العربية المتحدة - اتفاقية حدود",
    });
    assert.ok(detection.runnersUp.length >= 1);
  });
});

describe("Document type detection", () => {
  it("identifies a Saudi electronic deed", () => {
    const detection = detectDocumentType(
      "صك إلكتروني - وزارة العدل - رقم الصك 123456789 - اسم المالك",
      SAUDI_PROFILE,
    );
    assert.equal(detection.kind, "PROPERTY_DEED");
    assert.equal(detection.level, "HIGH");
    assert.ok(detection.matchedKeywords.length > 0);
  });

  it("identifies an Omani ownership document", () => {
    const detection = detectDocumentType(
      "سلطنة عمان - سند ملكية - وزارة الإسكان - رقم القسيمة 45",
      OMAN_PROFILE,
    );
    assert.equal(detection.kind, "PROPERTY_DEED");
  });

  it("identifies a survey report", () => {
    const detection = detectDocumentType("تقرير مساحي - الرفع المساحي - مساح معتمد", SAUDI_PROFILE);
    assert.equal(detection.kind, "SURVEY_REPORT");
  });

  it("identifies a bare coordinate table from its structure alone", () => {
    const detection = detectDocumentType(
      ["LINE NORTHING EASTING", "1 2 2533105.07 559322.22", "2 3 2533124.65 559326.26", "3 4 2533118.59 559355.64"].join("\n"),
      GENERIC_PROFILE,
    );
    assert.equal(detection.kind, "COORDINATE_SCHEDULE");
    assert.ok(detection.confidence >= 0.5);
  });

  it("returns an unknown type rather than a wrong one", () => {
    const detection = detectDocumentType("Invoice for consulting services", GENERIC_PROFILE);
    assert.equal(detection.kind, "UNKNOWN_SURVEY_DOCUMENT");
    assert.equal(detection.level, "UNKNOWN");
  });

  it("works for an unrecognised country through the generic profile", () => {
    const detection = detectDocumentType("CADASTRAL SURVEY REPORT - surveyor certificate", GENERIC_PROFILE);
    assert.equal(detection.kind, "SURVEY_REPORT");
  });
});

describe("Boundary description extraction", () => {
  it("reads Arabic cardinal side lengths", () => {
    const sides = extractDocumentedSides(
      ["الحد الشمالي بطول 25.40 م", "الحد الجنوبي بطول 25.40 م", "الحد الشرقي بطول 20.00 م", "الحد الغربي بطول 20.00 م"].join("\n"),
    );
    assert.equal(sides.length, 4);
    assert.equal(sides.find((side) => side.direction === "N")?.lengthMeters, 25.4);
    assert.equal(sides.find((side) => side.direction === "E")?.lengthMeters, 20);
  });

  it("reads Arabic-Indic digits in side lengths", () => {
    const sides = extractDocumentedSides("الحد الشمالي بطول ٢٥٫٤٠ م");
    assert.equal(sides.length, 1);
    assert.equal(sides[0].lengthMeters, 25.4);
  });

  it("reads English cardinal side lengths", () => {
    const sides = extractDocumentedSides(
      ["North boundary: 25.40 m", "South boundary: 25.40 m", "East boundary: 20.00 m", "West boundary: 20.00 m"].join("\n"),
    );
    assert.equal(sides.length, 4);
    assert.equal(sides.find((side) => side.direction === "W")?.lengthMeters, 20);
  });

  it("reads from/to segment statements in both languages", () => {
    const arabic = extractDocumentedSegments("من النقطة 1 إلى النقطة 2 بطول 25.40 م");
    assert.equal(arabic.length, 1);
    assert.equal(arabic[0].from, "1");
    assert.equal(arabic[0].to, "2");
    assert.equal(arabic[0].lengthMeters, 25.4);

    const english = extractDocumentedSegments("from point 3 to point 4 length 20.00 m");
    assert.equal(english.length, 1);
    assert.equal(english[0].from, "3");
    assert.equal(english[0].to, "4");
  });

  it("reads quadrant bearings as whole-circle azimuths", () => {
    const [northEast] = extractBearings("N 35° 00' E");
    assert.ok(northEast);
    assert.ok(Math.abs(northEast.degrees - 35) < 1e-9);

    const [southWest] = extractBearings("S 40° 00' W");
    assert.ok(southWest);
    assert.ok(Math.abs(southWest.degrees - 220) < 1e-9);

    const [northWest] = extractBearings("N 10° 00' W");
    assert.ok(northWest);
    assert.ok(Math.abs(northWest.degrees - 350) < 1e-9);
  });

  it("reads a whole-circle azimuth", () => {
    const [bearing] = extractBearings("Azimuth 142°30'");
    assert.ok(bearing);
    assert.ok(Math.abs(bearing.degrees - 142.5) < 1e-9);
  });

  it("returns nothing when a document states no boundary wording", () => {
    const description = extractBoundaryDescription("P1 24.713600 N 46.675300 E");
    assert.equal(description.sides.length, 0);
    assert.equal(description.segments.length, 0);
    assert.equal(description.bearings.length, 0);
  });
});
