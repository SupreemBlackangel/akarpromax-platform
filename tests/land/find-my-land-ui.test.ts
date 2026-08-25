import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const componentUrl = new URL("../../src/components/tools/FindMyLand.tsx", import.meta.url);
const stylesUrl = new URL("../../src/styles/find-my-land.css", import.meta.url);

async function readComponent(): Promise<string> {
  return readFile(componentUrl, "utf8");
}

async function readStyles(): Promise<string> {
  return readFile(stylesUrl, "utf8");
}

describe("Find My Land launch visuals", () => {
  it("uses the short flagship heading and one-line description", async () => {
    const source = await readComponent();
    assert.match(source, /title=\{t\("حدّد أرضك"/);
    assert.match(source, /ارفع الكروكي أو ملف PDF لاستخراج الإحداثيات ورسم حدود الأرض\./);
    assert.doesNotMatch(source, /تحليل الكروكي بالذكاء الاصطناعي/);
  });

  it("keeps the AI framing as a small badge rather than heading text", async () => {
    const source = await readComponent();
    assert.match(source, /fml-dropzone-badge/);
    assert.match(source, /تحليل ذكي/);
  });

  it("makes the upload area the primary element with click and drag support", async () => {
    const source = await readComponent();
    assert.match(source, /fml-dropzone/);
    assert.match(source, /اسحب الكروكي أو الملف هنا/);
    assert.match(source, /أو اختر ملفًا من جهازك/);
    assert.match(source, /PDF · PNG · JPG · JFIF · WEBP/);
    assert.match(source, /onDragOver=/);
    assert.match(source, /onDrop=/);
    assert.match(source, /fileInputRef\.current\?\.click\(\)/);

    const styles = await readStyles();
    assert.match(styles, /\.fml-dropzone[\s\S]*?min-height: 300px/);
  });

  it("reduces the explanatory copy to three short points", async () => {
    const source = await readComponent();
    assert.match(source, /fml-highlights/);
    assert.match(source, /استخراج الإحداثيات\./);
    assert.match(source, /تحويل WGS84 \/ UTM\./);
    assert.match(source, /رسم حدود الأرض على الخريطة\./);
    assert.doesNotMatch(source, /ماذا تستخرج الأداة؟/);
  });

  it("offers a focus mode that yields the page chrome to the tool", async () => {
    const source = await readComponent();
    assert.match(source, /dataset\.toolFocus = "on"/);
    assert.match(source, /setFocusMode/);
    assert.match(source, /fml-root--focus/);

    const styles = await readStyles();
    assert.match(styles, /body\[data-tool-focus="on"\] \.standard-public-ad-rail/);
    assert.match(styles, /body\[data-tool-focus="on"\] \.standard-public-ad-grid/);
  });

  it("collapses the platform navigation rail while a tool is open", async () => {
    const toolsClient = await readFile(new URL("../../src/components/tools/ToolsPageClient.tsx", import.meta.url), "utf8");
    assert.match(toolsClient, /defaultSidebarCollapsed=\{activeTool !== null\}/);

    const shell = await readFile(new URL("../../src/components/PublicPageShell.tsx", import.meta.url), "utf8");
    assert.match(shell, /defaultSidebarCollapsed/);
  });

  it("gives the map the dominant share of the result area", async () => {
    const styles = await readStyles();
    assert.match(styles, /\.fml-map[\s\S]*?height: clamp\(360px, 58vh, 620px\)/);
    assert.match(styles, /\.fml-root--focus \.fml-map[\s\S]*?height: clamp\(420px, 68vh, 760px\)/);
  });

  it("orders the result as verdict, summary, map, coordinates, actions", async () => {
    const source = await readComponent();
    const order = ["fml-verdict", "fml-summary", "fml-map-card", "fml-coords", "fml-actions"];
    let cursor = -1;
    for (const marker of order) {
      const index = source.indexOf(marker, cursor + 1);
      assert.ok(index > cursor, `${marker} is out of order in the result layout`);
      cursor = index;
    }
  });

  it("switches the coordinate table between WGS84 and UTM instead of stacking both", async () => {
    const source = await readComponent();
    assert.match(source, /coordinateView === "wgs84"/);
    assert.match(source, /setCoordinateView\("utm"\)/);
    assert.match(source, /role="tablist"/);
  });

  it("exposes a manual coordinate-system override with every UTM zone", async () => {
    const source = await readComponent();
    assert.match(source, /data-crs-override/);
    assert.match(source, /<option value="auto">/);
    assert.match(source, /<option value="wgs84">WGS84 \(Lat\/Lng\)<\/option>/);
    assert.match(source, /<option value="utm">UTM<\/option>/);
    assert.match(source, /aria-label="UTM Zone"/);
    assert.match(source, /UTM_ZONE_MAX - UTM_ZONE_MIN \+ 1/);
    assert.match(source, /<option value="N">N — /);
    assert.match(source, /<option value="S">S — /);
  });

  it("keeps the three plain-language verdicts", async () => {
    const source = await readComponent();
    assert.match(source, /تم التحليل بنجاح/);
    assert.match(source, /تحتاج الإحداثيات إلى مراجعة/);
    assert.match(source, /تعذر استخراج إحداثيات صالحة/);
  });

  it("renders every UI state separately rather than all at once", async () => {
    const source = await readComponent();
    assert.match(source, /stage === "idle" \|\| stage === "ready" \|\| stage === "error"/);
    assert.match(source, /stage === "reading" \|\| stage === "ocr" \|\| stage === "resolving"/);
    assert.match(source, /stage === "done" && analysis/);
    assert.match(source, /data-utm-selection-required/);
    assert.match(source, /data-coordinate-group-selection/);
  });

  it("keeps the analysis timeout and abort safeguards", async () => {
    const source = await readComponent();
    assert.match(source, /MAX_FILE_SIZE\s*=\s*20\s*\*\s*1024\s*\*\s*1024/);
    assert.match(source, /ANALYSIS_TIMEOUT_MS\s*=\s*60_000/);
    assert.match(source, /new AbortController\(\)/);
    assert.match(source, /controller\.abort\(\)/);
  });
});

describe("Find My Land professional result", () => {
  it("names the country and the document type before the geometry", async () => {
    const source = await readComponent();
    assert.match(source, /data-document-intelligence/);
    assert.match(source, /DOCUMENT_KIND_COPY/);
    assert.match(source, /SEQUENCE_EVIDENCE_COPY/);
    assert.match(source, /الدولة/);
    assert.match(source, /نوع المستند/);
  });

  it("compares the calculated area against the registered one", async () => {
    const source = await readComponent();
    assert.match(source, /data-area-comparison/);
    assert.match(source, /المساحة المحسوبة/);
    assert.match(source, /المساحة المسجلة/);
    assert.match(source, /الفرق/);
    assert.match(source, /areaVerdictCopy/);

    const styles = await readStyles();
    assert.match(styles, /\.fml-area-check--match/);
    assert.match(styles, /\.fml-area-check--review/);
    assert.match(styles, /\.fml-area-check--mismatch/);
  });

  it("offers a proposed corner order without applying it", async () => {
    const source = await readComponent();
    assert.match(source, /data-suggested-sequence/);
    assert.match(source, /تم العثور على ترتيب محتمل للحدود/);
    assert.match(source, /اعتماد الترتيب المقترح/);
    assert.match(source, /confirmedOrder/);
  });

  it("keeps the extraction evidence behind an advanced panel", async () => {
    const source = await readComponent();
    assert.match(source, /data-evidence-inspector/);
    assert.match(source, /<details className="fml-advanced" data-evidence-inspector>/);
    assert.match(source, /تفاصيل الاستخراج/);
    // Source page, row, original values and confidence are all inspectable.
    assert.match(source, /vertex\.page/);
    assert.match(source, /vertex\.rowIndex/);
    assert.match(source, /vertex\.sourceText/);
    assert.match(source, /vertex\.confidence/);
  });

  it("shows the measured length beside the documented one for every edge", async () => {
    const source = await readComponent();
    assert.match(source, /segment\.documentLengthMeters/);
    assert.match(source, /segment\.deviationMeters/);
    assert.match(source, /segment\.bearingDegrees/);
    assert.match(source, /fml-segment-deviation--ok/);
  });

  it("exports the result as structured data", async () => {
    const source = await readComponent();
    assert.match(source, /const exportPayload = useMemo/);
    assert.match(source, /"akarpromax\.find-my-land"/);
    assert.match(source, /wgs84: coordinateRows\.map/);
    assert.match(source, /utm: utmRows\.map/);
    assert.match(source, /documentOrder:/);
    assert.match(source, /confirmedByUser:/);
    assert.match(source, /تصدير البيانات/);
  });

  it("carries a quiet timestamp and disclaimer, not a banner", async () => {
    const source = await readComponent();
    assert.match(source, /fml-footnote/);
    assert.match(source, /تحليل آلي للمراجعة — لا يحل محل الوثيقة الرسمية\./);
    assert.match(source, /analysedAt/);

    const styles = await readStyles();
    assert.match(styles, /\.fml-footnote[\s\S]*?font-size: 11px/);
  });
});

describe("Find My Land responsive and RTL safety", () => {
  it("scrolls wide tables inside their own container", async () => {
    const styles = await readStyles();
    assert.match(styles, /\.fml-table-wrap[\s\S]*?overflow-x: auto/);
  });

  it("adapts the layout at small viewport widths", async () => {
    const styles = await readStyles();
    assert.match(styles, /@media \(max-width: 720px\)/);
    assert.match(styles, /\.fml-map\s*\{\s*height:\s*380px/);
  });

  it("uses logical properties so Arabic RTL mirrors correctly", async () => {
    const styles = await readStyles();
    for (const physical of [/[^-]margin-left:/, /[^-]margin-right:/, /[^-]padding-left:/, /[^-]padding-right:/]) {
      assert.doesNotMatch(styles, physical, `physical spacing property found: ${physical}`);
    }
    assert.match(styles, /margin-inline/);
    assert.match(styles, /padding-inline/);
    assert.match(styles, /inset-inline-end/);
  });

  it("passes the document direction into the tool shell", async () => {
    const source = await readComponent();
    assert.match(source, /const dir = locale === "ar" \? "rtl" : "ltr"/);
    assert.match(source, /dir=\{dir\}/);
  });
});

describe("Find My Land has no regional coordinate defaults", () => {
  const engineFiles = [
    "../../lib/geo/utm.ts",
    "../../lib/geo/crs.ts",
    "../../lib/geo/coordinate-parsing.ts",
    "../../lib/geo/evidence-extraction.ts",
    "../../lib/land/intelligence/crs-detector.ts",
    "../../lib/land/intelligence/resolver.ts",
    "../../src/lib/tools/land-analysis.ts",
    "../../src/components/tools/FindMyLand.tsx",
  ];

  it("never falls back to a fixed zone anywhere in the coordinate path", async () => {
    for (const relative of engineFiles) {
      const source = await readFile(new URL(relative, import.meta.url), "utf8");
      // Default-value fallbacks to a Gulf zone, in any of the forms they take.
      assert.doesNotMatch(source, /\?\?\s*3[5-9]\b/, `${relative} defaults to a fixed zone`);
      assert.doesNotMatch(source, /\|\|\s*3[5-9]\b/, `${relative} defaults to a fixed zone`);
      assert.doesNotMatch(source, /\breturn\s+3[5-9]\s*;/, `${relative} returns a fixed zone`);
      assert.doesNotMatch(source, /\b(?:defaultZone|fallbackZone|DEFAULT_ZONE|FALLBACK_ZONE)\b/, `${relative} carries a default-zone identifier`);
      assert.doesNotMatch(source, /zone\s*>=\s*3[0-9]\s*&&\s*zone\s*<=\s*[34][0-9]/, `${relative} clamps to a regional zone band`);
      assert.doesNotMatch(source, /Saudi Arabia only/i, `${relative} declares a Saudi-only scope`);
    }
  });

  it("keeps the widened-zone assignments limited to the documented UTM exceptions", async () => {
    const utm = await readFile(new URL("../../lib/geo/utm.ts", import.meta.url), "utf8");
    // Zones 31/32/33/35/37 are assigned only inside the Norway and Svalbard
    // exception blocks defined by the UTM specification.
    const assignments = Array.from(utm.matchAll(/zone = (\d{1,2});/g)).map((match) => match[1]);
    assert.deepEqual(assignments.sort(), ["31", "32", "33", "35", "37"]);
    assert.match(utm, /South-west Norway: zone 32 is widened westward/);
    assert.match(utm, /Svalbard: zones 31\/33\/35\/37 are widened/);
  });

  it("supports the full 1-60 zone range in the engine", async () => {
    const utm = await readFile(new URL("../../lib/geo/utm.ts", import.meta.url), "utf8");
    assert.match(utm, /UTM_ZONE_MIN = 1/);
    assert.match(utm, /UTM_ZONE_MAX = 60/);
    assert.match(utm, /UTM_NORTH_EPSG_BASE = 32600/);
    assert.match(utm, /UTM_SOUTH_EPSG_BASE = 32700/);
  });
});
