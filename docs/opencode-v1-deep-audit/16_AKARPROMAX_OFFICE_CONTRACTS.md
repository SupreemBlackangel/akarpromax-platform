# 16_AKARPROMAX_OFFICE_CONTRACTS.md
# AkarProMax Office & Contracts Audit

**Audit Date:** 2026-08-19  
**Mode:** READ-ONLY

---

## 1. AkarApp_LIVE Structure

### 1.1 Solution Structure

| Directory | Purpose |
|---|---|
| `cs/` | C# source files |
| `webui/` | Web UI files |
| `dist/` | Build output |
| `Localization/` | Localization resources |
| `runtimes/` | .NET runtimes |

### 1.2 Key Components

| Component | Purpose |
|---|---|
| WebView2 | Embedded browser |
| C# Backend | WPF application |
| SQLite | Local database |
| Web UI | React frontend |

---

## 2. V1 Desktop API

### 2.1 Endpoints

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/api/desktop/version` | GET | No | Latest version |
| `/api/desktop/subscription-status` | GET | Signature | Subscription check |
| `/api/desktop/sync` | POST | Yes | Property sync |
| `/api/desktop/properties/draft` | POST | Yes | Submit property |
| `/api/desktop/property-requests` | GET | Yes | Fetch requests |
| `/api/desktop/news-ticker` | GET | No | Fetch news |
| `/api/desktop/ads/placement/:zone` | GET | No | Fetch ads |
| `/api/desktop/ads/:id/view` | POST | No | Track impression |
| `/api/desktop/ads/:id/click` | POST | No | Track click |
| `/api/desktop/license/validate` | POST | Yes | Validate license |
| `/api/desktop/license/reset-hwid` | POST | Yes | Reset HWID |
| `/api/desktop/sync/ads` | GET | Yes | Sync ads |
| `/api/desktop/sync/batch` | POST | Yes | Batch sync |
| `/api/desktop/free-trial-license` | POST | No | Free trial |

**Source:** `server/api/src/routes/desktop.ts`

### 2.2 Features

| Feature | Implementation | Evidence |
|---|---|---|
| License validation | HWID-bound | `software_licenses` table |
| HWID binding | Hardware ID | `software_licenses.hwid` |
| HWID reset | Admin function | `api/desktop.ts` |
| Free trial | 30-day trial | `api/desktop.ts` |
| Subscription status | Signature-verified | `api/desktop.ts` |
| Property sync | Full sync | `api/desktop.ts` |
| Property draft | Submit property | `api/desktop.ts` |
| Ad sync | Offline ads | `api/desktop.ts` |
| News sync | News ticker | `api/desktop.ts` |
| Batch sync | Bulk operations | `api/desktop.ts` |
| Version check | Update check | `api/desktop.ts` |
| Force update | Mandatory update | `desktop_versions` table |

---

## 3. V2.0 Office Integration

### 3.1 Phase 2C Status

V2.0 has Phase 2C Property Sync:

| Feature | Status | Evidence |
|---|---|---|
| Device pairing | PASS | `lib/integration/pairing.ts` |
| Device auth | PASS | `lib/integration/pairing.ts` |
| Heartbeat | PASS | `lib/integration/pairing.ts` |
| Property push | PASS | `lib/integration/sync.ts` |
| Property update | PASS | `lib/integration/sync.ts` |
| Web display | PASS | `lib/integration/sync.ts` |
| Web update | PASS | `lib/integration/sync.ts` |
| Desktop pull | PASS | `lib/integration/sync.ts` |

### 3.2 Office API

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/api/office/v1/ads` | GET | Device | Office ads |
| `/api/office/v1/sync` | POST | Device | Office sync |

**Source:** `app/api/office/v1/`

---

## 4. V1 Contract System

### 4.1 Contract Generator

V1 had bilingual contract generation:

| Component | File | Purpose |
|---|---|---|
| ContractGenerator | `ContractGenerator.tsx` | Contract generation |
| BilingualPDFContract | `BilingualPDFContract.tsx` | Bilingual PDF |
| ContractPackager | `ContractPackager.tsx` | Contract packaging |

### 4.2 Contract Features

| Feature | Description |
|---|---|
| Bilingual | Arabic/English |
| BOQ integration | Bill of Quantities |
| MEP integration | Mechanical/Electrical/Plumbing |
| Legal templates | Standard clauses |
| PDF generation | PDF output |

---

## 5. Recommended Office Architecture

### 5.1 Office Integration Levels

| Level | Description | Status |
|---|---|---|
| Level 1 | Device pairing + heartbeat | DONE (Phase 2A/2B) |
| Level 2 | Property sync | DONE (Phase 2C) |
| Level 3 | Media sync | DONE (Phase 2D) |
| Level 4 | Ad sync | MISSING |
| Level 5 | News sync | MISSING |
| Level 6 | License management | MISSING |
| Level 7 | Offline support | MISSING |

### 5.2 Contract System

| Feature | Priority | Description |
|---|---|---|
| Template management | MEDIUM | Contract templates |
| Bilingual support | HIGH | Arabic/English |
| BOQ integration | MEDIUM | Bill of Quantities |
| PDF generation | HIGH | PDF output |
| Digital signatures | LOW | E-signature support |

---

## 6. V1 Office Features Missing in V2.0

| Feature | V1 Status | V2.0 Status | Gap |
|---|---|---|---|
| License validation | FULL | PARTIAL | MEDIUM |
| HWID binding | FULL | PARTIAL | MEDIUM |
| HWID reset | FULL | MISSING | MEDIUM |
| Free trial | FULL | MISSING | MEDIUM |
| Subscription status | FULL | MISSING | MEDIUM |
| Ad sync | FULL | MISSING | MEDIUM |
| News sync | FULL | MISSING | LOW |
| Batch sync | FULL | MISSING | LOW |
| Version check | FULL | MISSING | LOW |
| Force update | FULL | MISSING | LOW |
| Contract generator | FULL | MISSING | MEDIUM |
| Bilingual contracts | FULL | MISSING | MEDIUM |

---

**Status:** COMPLETE  
**Application Source Files Modified:** ZERO
