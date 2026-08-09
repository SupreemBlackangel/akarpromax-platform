# Staging Storage Plan

Audit of file/image/document handling and the storage readiness plan for a
production-like Staging deployment.

## Where things are stored today (audit)

| ITEM | STORAGE NOW | PERSISTENT? | DETAILS |
|---|---|---|---|
| Sponsor assets (logos, documents) | **R2 object storage** (bucket binding `SPONSOR_ASSETS`) | YES (object storage) | `app/api/sponsor-assets/route.ts` (multipart `init/part/complete` + GET/DELETE); `lib/runtime-assets.ts:1-5` (`getSponsorAssetsBucket()` reads `env.SPONSOR_ASSETS` via `cloudflare:workers`) |
| Advertising creatives | **R2 object storage** (`SPONSOR_ASSETS`) | YES (object storage) | `app/api/ad-assets/route.ts` (multipart) |
| Property images | URL columns (remote URLs / seed placeholders) | remote | No upload route exists |
| Organization logos / profile images | URL columns | remote | No upload route exists |
| Service attachments | URL columns | remote | No upload route exists |
| Verification documents (AMRS) | URL columns / DB metadata | remote | No upload route exists |
| Find My Land uploads | **None (no server upload)** | ephemeral | Client-side parse/OCR; only extracted text POSTed to `app/api/land/resolve/route.ts`; results in-memory `resolve-store.ts:9` (60-min TTL); saved lands in-memory `saved-land.ts:3` |
| News images | URL columns | remote | No upload route exists |

## Key facts

1. **No persistent local filesystem use.** There is no disk-backed upload
   directory anywhere; the only binary persistence is R2. Staging therefore
   does **not** depend on ephemeral host disk for user data.
2. **R2 binding requirement.** The two upload routes require the
   `cloudflare:workers` runtime to resolve the `SPONSOR_ASSETS` R2 bucket
   (`lib/runtime-assets.ts`). This works in the Workers runtime
   (`vinext dev` / Cloudflare Workers deployment) and **fails under plain Node
   `vinext start`** (`ERR_UNSUPPORTED_ESM_URL_SCHEME`, same class of limitation
   as the D1 binding — see `AGENTS.md`). Staging architecture must therefore be
   a Workers-runtime deployment (see `STAGING_DEPLOYMENT_RUNBOOK.md`), or
   upload routes must be explicitly out of scope for a non-Workers staging.
3. **Find My Land is ephemeral by design** — private, no public exposure, no
   OCR/PII persisted or logged. This matches the privacy policy and needs no
   storage provisioning; document as a lifecycle dependency (see below).

## Staging requirements

### REQUIRED

- Provision an R2 bucket and bind it under the name **`SPONSOR_ASSETS`**
  (matches `.openai/hosting.json` `r2` value and `lib/runtime-assets.ts`).
  Binding is declared in deployment config, not an env var.
- Do not rely on host-local disk for any upload (staging hosts may recycle
  disk). R2 covers sponsor + ad assets; everything else is URL-remote.

### OPTIONAL / future (documented, not implemented — no provider selected)

- If property/news/organization image uploads are added later, they should use
  the same `SPONSOR_ASSETS` R2 abstraction (or a second bucket) rather than a
  new mechanism. No provider is selected or paid without PO approval.

### Find My Land lifecycle dependency

- Uploaded land document text is processed client-side (browser). The server
  receives only extracted text, resolves it, and stores the result in-memory
  for 60 minutes (`lib/land/resolve-store.ts`).
- Saved land references (`lib/land/saved-land.ts`) are in-memory and reset on
  restart / per-worker. Any future requirement to persist saved lands needs a
  real storage decision (PG table or R2). Current privacy stance = ephemeral.

## Readiness checklist

- [ ] R2 bucket provisioned + `SPONSOR_ASSETS` binding present on staging
- [ ] `GET /api/sponsor-assets` route responds without `cloudflare:` import
      failure (Workers runtime)
- [ ] Multipart upload (sponsor asset + ad creative) → R2 → served URL verified
- [ ] No upload writes to local disk
- [ ] Find My Land: no OCR text logged (audit `lib/land/*`, `app/api/land/*`)
