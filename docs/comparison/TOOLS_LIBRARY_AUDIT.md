# Tools Library Audit

**Mode:** PLAN (read-only). Static audit of tool-facing libraries in both projects.

---

## 1. Library inventory (reference)

| Lib | Version | Purpose | Notes |
|---|---|---|---|
| proj4 | 2.20.6 | coordinate transforms | needed by coord tool |
| leaflet | 1.9.4 + react-leaflet 4.2 | maps | deed tool |
| tesseract.js | 7.0.0 | OCR (pdf→word) | worker-based |
| dxf-parser | 1.1.2 | DXF parsing | in reference deps |
| jspdf | 4.2.1 | PDF export | tools + billing |
| pdf-lib | 1.17.1 | PDF manipulation | |
| jszip | 3.10.1 | archives | |
| html2canvas | 1.4.1 | canvas snapshot | |
| three / @react-three/fiber / drei | 0.183/8.18/9.122 | 3D previews | heavy |
| onnxruntime-web | 1.26 | ML inference | not tool-specific today |
| archiver | 7.0.1 | server-side zip | |

## 2. Library inventory (target)

| Lib | Version | Purpose | Notes |
|---|---|---|---|
| proj4 | 2.21.0 (+@types) | coordinate transforms | coord tool |
| leaflet | 1.9.4 (+@types) | maps | landmapper |
| tesseract.js | 7.0.0 | OCR | pdf2word |
| pdfjs-dist | 6.2.108 | PDF render/parse | pdf2word |
| mammoth | 1.12.0 | DOCX read | pdf2word |
| docx | 9.7.1 | DOCX write | pdf2word + docs |

## 3. Gap & duplication analysis

| Need | Reference | Target | Verdict |
|---|---|---|---|
| DXF export | dxf-parser (parse) — export inline | custom `PointsToDxf` + cad export | Target covers; KEEP |
| DXF preview/validation | none | `cad/*` | Target-only value; KEEP |
| PDF export | jspdf | none | OPTIONAL MERGE (approval item) if tools/contracts need PDF generation |
| PDF manipulation | pdf-lib | pdfjs-dist (render/parse only) | If needed, add pdf-lib (approval item) |
| 3D preview | three/fiber/drei | none | REBUILD_FROM_BEHAVIOR or drop (product decision) |
| ML inference | onnxruntime-web | none | DO_NOT_MIGRATE (no active consumer) |
| Zip/archive | jszip/archiver | none | OPTIONAL (approval item) |
| Canvas snapshot | html2canvas | none | OPTIONAL |
| DOCX | docx (target) + mammoth (target) | mammoth+docx | KEEP target pair; reference had docx in target deps list only |

## 4. Duplicate-provider risk
- Reference mixes `pdfjs-dist` (render) + `pdf-lib` (edit) + `jspdf` (generate) — three PDF libs. Directive: single-provider preference → if PDF generation becomes a feature, choose ONE (recommend `pdf-lib` for manipulation or `pdfjs-dist` for render; do not adopt all three).
- Reference three.js stack has no consumer at target scope — do not import.
- `onnxruntime-web` (ML) and `web-push` (push) — no target consumer; exclude unless feature approved.

## 5. Decisions
- **KEEP** target tool libs (proj4, leaflet, tesseract.js, pdfjs-dist, mammoth, docx). REUSE_AS_IS.
- **MERGE (conditional, approval):** `pdf-lib` OR `jspdf` for PDF generation ONLY if a concrete feature (contract export) is approved. **ADAPT.**
- **DO_NOT_MIGRATE:** three/fiber/drei, onnxruntime-web, jszip, archiver, html2canvas unless a feature explicitly needs them.

**Decision:** KEEP target; avoid library sprawl; add PDF-gen lib only on approved feature (single-provider rule).
