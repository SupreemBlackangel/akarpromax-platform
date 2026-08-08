# Find My Land — UI Component

`src/components/tools/FindMyLand.tsx` — export `FindMyLand({ locale })`.

## Registration

- `src/data/toolsData.ts` — `findmyland` `ToolDefinition` (category
  `surveying`, status `new`, AR/EN/TR names + descriptions, icon `📍`).
- `src/components/tools/ToolsPageClient.tsx` — lazy `TOOL_COMPONENTS` entry:
  `findmyland: lazy(() => import(".../FindMyLand").then(m => ({ default: m.FindMyLand })))`.
- Renders on `/tools?tool=findmyland`.

## Layout

Wrapped in `ToolCalculatorShell` (title/subtitle, RTL-aware) with a two-column
result grid:

- **Left column**: original file preview, status banner (colored by tone:
  ok/warn/bad), lat/lon + address + plan/parcel + document category,
  confidence badges, extraction-method badges (OCR/AI/geocoded), warnings,
  follow-up actions, OCR text (collapsible), analysis steps (collapsible),
  copy-WGS84 action via `ToolSecondaryActions`.
- **Right column**: Leaflet map with a marker at center and an optional
  polygon for the geometry. Empty state when no center exists.

## Stages

`idle → loading → ocr → resolving → done | error` with a progress bar.

## Text extraction

Mirrors `LandMapper`:

- Images → tesseract.js `"ara+eng"`.
- PDFs → pdfjs-dist native text (max 5 pages); if <30 non-whitespace chars,
  falls back to OCR of rendered pages.

The extracted text is sent to `POST /api/land/resolve` as `nativeText` and/or
`ocrText` (both optional as long as at least one is a string).

## Hand-off actions

- **Save land** — `POST /api/land`; `ownerId` from
  `localStorage["ap_owner_id"]` or `"guest"`.
- **Share link + QR** — `POST /api/land/[id]/share` (no mode) → url + qrPayload.
- **Directions** — same route with `mode: "directions"` → external link.
- **Listing** — same route with `mode: "listing"` → draft preview.
- **Discover surveyors** — `GET /api/land/discover-surveyors?lat=..&lon=..`.
- **Request quote** — `POST /api/land/[id]/surveyors/quote`.

## i18n

`t(ar, en, tr)` helper picks by `locale`. Status and confidence labels are
localized tables. All interactive elements honor the `min-h-[44px]` / focus-ring
accessibility convention used across the tools.

## Copy behavior

Share URL / QR payload / WGS84 coordinates copy via `navigator.clipboard`
with a "✓" confirmation using unique indices (900/901/902).
