# Tools Security Audit

**Mode:** PLAN (read-only). Static review of the tools vertical in both projects.

---

## 1. Reference tool security posture

| Concern | Status | Detail |
|---|---|---|
| Public access | tools route is public (no auth) | `/tools` unguarded in `App.tsx` |
| Client-side file processing | OCR/PDF in browser via tesseract.js (WASM) | No server upload; lower data-exfiltration surface, but no server validation either |
| Deed/geodata inputs | leaflet polygon input | No server persistence — benign |
| Encoding | AR/EN strings garbled in file (`�?` glyphs) | Corruption risk: broken i18n strings, no injection |
| Secrets | none in tool code | clean |

## 2. Target tool security posture

| Concern | Status | Detail |
|---|---|---|
| Access control | `ToolsGate` — session-required (loading/unauthenticated/forbidden/granted) | Gated tools; aligns with auth posture |
| Lazy loading | heavy deps only load on `/tools` | reduced attack surface for non-tool pages |
| File processing | `PdfToWord`/`cad` process client-side; `ToolFileDropzone` validates | ADD explicit size/type caps + magic-byte validation (Phase 6 hardening) |
| OCR privacy | tesseract.js runs locally | good (no file exfiltration) |
| CAD persistence | `cad/*` D1-backed | ADD server-side file type/size validation + sanitized storage keys |
| Proj4/leaflet | pure client math | benign |

## 3. Shared recommendations (Phase 6 hardening)
1. **File upload hardening:** enforce max size (e.g. 10 MB), allowed MIME + magic-byte check, random storage keys, no path traversal in D1 keys.
2. **Rate limit** any tool endpoint that persists (cad import), mirroring auth rate-limit pattern.
3. **Worker isolation:** keep tesseract/pdfjs in web workers; set `crossOriginIsolated` headers only if COOP/COEP enabled deliberately.
4. **Remove garbled strings** in any ported reference tool code — re-key i18n through target `lib/i18n`.

## 4. Verdict
- **KEEP** target gating + lazy loading. REUSE_AS_IS.
- **ADAPT** reference tool behavior with server-side validation added during port.
- **DO_NOT_MIGRATE** public unguarded `/tools` or garbled-string code.

**Decision:** KEEP target posture; add upload validation + rate limits in Phase 6.
