# Current UI Inventory

Audit of all UI components, pages, and layouts in the project.

## Layouts

| File | Type | Lines | Notes |
|------|------|-------|-------|
| `app/layout.tsx` | Root Layout | 53 | Single layout for all pages, themeBootScript, Arabic RTL, metadata |

## Pages

| File | Type | Lines | Layout | Notes |
|------|------|-------|--------|-------|
| `app/page.tsx` | Home | 545 | Root | PublicPageShell needed |
| `app/services/page.tsx` | Services | 320 | Root | PublicPageShell needed |
| `app/properties/[id]/page.tsx` | Property Detail | ~400 | Root | PublicPageShell needed |
| `app/tools/page.tsx` | Tools | ~150 | Root | PublicPageShell needed, Deferred Module |
| `app/admin/page.tsx` | Admin Dashboard | ~200 | Root | AdminLayout needed |
| `app/admin/**/*.tsx` | Admin Pages (14) | varies | Root | AdminLayout needed |

## Shared Components

| File | Type | Lines | Usage | Action |
|------|------|-------|-------|--------|
| `src/components/Brand.tsx` | Logo/Brand | 10 | Header branding | KEEP — Core component |
| `src/components/NewsTicker.tsx` | News Ticker | 89 | Homepage ticker | KEEP — Core component |
| `src/components/AdSlot.tsx` | Ad Slot | 294 | All ad placements | STANDARDIZE — Core component |
| `src/components/FloatingAdSlotActions.tsx` | Floating Actions | 238 | Ad interactions | KEEP — Core component |
| `src/components/AccountDialog.tsx` | Auth Dialog | 915 | Login/Register | KEEP — Legacy exception ARCH-LEGACY-019 |
| `src/components/AdRequestDialog.tsx` | Ad Request | ~200 | Admin | KEEP — Core component |
| `src/components/CountryFlag.tsx` | Country Flag | ~50 | Location display | KEEP — Utility component |
| `src/components/LocationChip.tsx` | Location Chip | ~30 | Location display | KEEP — Utility component |
| `src/components/LocationPicker.tsx` | Location Picker | ~100 | Forms | KEEP — Utility component |
| `src/components/PermissionGuard.tsx` | Permission Guard | ~50 | Auth gates | KEEP — Core component |
| `src/components/SponsorIdentity.tsx` | Sponsor Identity | ~100 | Sponsor display | KEEP — Core component |

## Tool Components (Deferred Module)

| File | Type | Lines | Action |
|------|------|-------|--------|
| `src/components/tools/AreaCalculator.tsx` | Calculator | ~150 | DEFER — Tools module |
| `src/components/tools/BeamCalc.tsx` | Calculator | ~120 | DEFER — Tools module |
| `src/components/tools/BrickCalc.tsx` | Calculator | ~100 | DEFER — Tools module |
| `src/components/tools/Calculator.tsx` | Calculator | ~80 | DEFER — Tools module |
| `src/components/tools/ConcreteCalc.tsx` | Calculator | ~120 | DEFER — Tools module |
| `src/components/tools/CoordinateConverter.tsx` | Converter | ~100 | DEFER — Tools module |
| `src/components/tools/LandMapper.tsx` | Mapper | ~150 | DEFER — Tools module |
| `src/components/tools/MixRatioCalc.tsx` | Calculator | ~100 | DEFER — Tools module |
| `src/components/tools/NumInput.tsx` | Input | ~30 | DEFER — Tools module |
| `src/components/tools/PaintCalc.tsx` | Calculator | ~100 | DEFER — Tools module |
| `src/components/tools/PdfToWord.tsx` | Converter | ~150 | DEFER — Tools module |
| `src/components/tools/PointsToDxf.tsx` | Converter | ~120 | DEFER — Tools module |
| `src/components/tools/RebarCalc.tsx` | Calculator | ~150 | DEFER — Tools module |
| `src/components/tools/SlopeCalc.tsx` | Calculator | ~100 | DEFER — Tools module |
| `src/components/tools/TileCalc.tsx` | Calculator | ~100 | DEFER — Tools module |
| `src/components/tools/ToolsGate.tsx` | Gate | ~50 | DEFER — Tools module |
| `src/components/tools/ToolsPageClient.tsx` | Client | ~100 | DEFER — Tools module |

## Types

| File | Type | Lines | Notes |
|------|------|-------|-------|
| `src/types/site.ts` | Site Types | ~100 | Locale, ViewerContext, Translation |

## Constants

| File | Type | Lines | Notes |
|------|------|-------|-------|
| `src/constants/advertising.ts` | Ad Constants | ~500 | 47 placements, AdPlacement type |

## Data

| File | Type | Lines | Notes |
|------|------|-------|-------|
| `src/data/translations.ts` | Translations | ~200 | Multi-language support |
| `src/data/locations.ts` | Locations | ~300 | Country/city data |

## Summary

- **Total Components:** 29 (12 shared + 17 tools)
- **Total Pages:** 20+ (1 root + 1 services + 1 properties + 1 tools + 14+ admin)
- **Layouts:** 1 (root only — needs 4 layouts)
- **Core Components:** Brand, NewsTicker, AdSlot, FloatingAdSlotActions, AccountDialog, AdRequestDialog, CountryFlag, LocationChip, LocationPicker, PermissionGuard, SponsorIdentity
- **Deferred Components:** All 17 tool components

## Phase 2 Actions

1. **Wrap pages with PublicPageShell:** Home, Services, Properties/[id], Tools
2. **Create AdminLayout:** Wrap admin pages
3. **Standardize AdSlot:** Consistent styling across all placements
4. **Create Shared UI Foundation:** Button, Input, Card, Modal, Badge
5. **Reduce Navigation:** Core navigation only in shell
