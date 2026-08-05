# Ads Migration Result

Documentation of ad pattern changes during Phase 2.

## Home Page (`/`)

| Metric | Before | After |
|--------|--------|-------|
| Ad patterns | 4 AdSlot instances | 4 AdSlot instances |
| Hardcoded assets | `/og.png`, `/sponsors/arab-blue.webp` | `/og.png`, `/sponsors/arab-blue.webp` (unchanged) |
| Hardcoded URLs | None | None |
| Impression tracking | Via AdSlot | Via AdSlot (unchanged) |
| Click tracking | Via AdSlot | Via AdSlot (unchanged) |Business logic | None | None |
| Status | UNCHANGED (complex page) |

**Notes:** Home page is too complex to modify without rewriting. All ad patterns are already using AdSlot correctly.

## Services Page (`/services`)

| Metric | Before | After |
|--------|--------|-------|
| Ad patterns | None | 2 AdSlot instances (global_header, global_footer) |
| Hardcoded assets | None | None |
| Hardcoded URLs | None | None |
| Impression tracking | None | Via AdSlot |
| Click tracking | None | Via AdSlot |
| Business logic | None | None |
| Status | MIGRATED |

**Notes:** Services page had no ads before. Now uses PublicPageShell which includes global_header and global_footer ad slots.

## Property Detail Page (`/properties/[id]`)

| Metric | Before | After |
|--------|--------|-------|
| Ad patterns | 7 AdSlot instances | 7 AdSlot instances + 2 from PublicPageShell |
| Hardcoded assets | `/og.png` | `/og.png` (unchanged) |
| Hardcoded URLs | None | None |
| Impression tracking | Via AdSlot | Via AdSlot (unchanged) |
| Click tracking | Via AdSlot | Via AdSlot (unchanged) |
| Business logic | None | None |
| Status | MIGRATED (header/footer removed) |

**Notes:** Properties page already used AdSlot correctly. Now wrapped with PublicPageShell which adds global_header and global_footer ad slots. Inline header/footer removed.

## Tools Page (`/tools`)

| Metric | Before | After |
|--------|--------|-------|
| Ad patterns | None | 2 AdSlot instances (global_header, global_footer) |
| Hardcoded assets | None | None |
| Hardcoded URLs | None | None |
| Impression tracking | None | Via AdSlot |
| Click tracking | None | Via AdSlot |
| Business logic | None | None |
| Status | MIGRATED |

**Notes:** Tools page had no ads before. Now uses PublicPageShell which includes global_header and global_footer ad slots.

## Admin Pages (`/admin`)

| Metric | Before | After |
|--------|--------|-------|
| Ad patterns | None | None |
| Hardcoded assets | None | None |
| Hardcoded URLs | None | None |
| Impression tracking | None | None |
| Click tracking | None | None |
| Business logic | None | None |
| Status | UNCHANGED |

**Notes:** Admin pages don't show public ads. No changes needed.

## Summary

| Page | Status | AdSlots Before | AdSlots After | Hardcoded Removed |
|------|--------|----------------|---------------|-------------------|
| Home | UNCHANGED | 4 | 4 | NO |
| Services | MIGRATED | 0 | 2 | N/A |
| Properties/[id] | MIGRATED | 7 | 9 | NO |
| Tools | MIGRATED | 0 | 2 | N/A |
| Admin | UNCHANGED | 0 | 0 | N/A |
| **Total** | - | **11** | **17** | **0** |

## Hardcoded Assets Remaining

1. `/og.png` - Used in home page hero fallback and properties page image fallback
2. `/sponsors/arab-blue.webp` - Used in home page sponsor fallback
3. `/sponsors/*.webp` - Used in admin sponsors page for preview

These are fallback images and are expected to remain. They are not ad placements but content fallbacks.
