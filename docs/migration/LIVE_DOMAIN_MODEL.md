# The live domain model, recovered from the data

Derived on 2026-09-02 from a working installation's
`%LOCALAPPDATA%\AkarApp\AkarData`. Structure and field names only — no record
contents were read or copied.

**This document exists because the SPA's source is gone.** With no code to read
and no XAML to read, the data files are the only complete, machine-readable
specification of what the product users run actually models. They are the
starting point for the rewrite.

---

## Entities

Field types are as observed. `str` covers dates and enums, because the store has
no types.

| Store key | Shape | Fields |
|---|---|---|
| `akar_v2_clients` | array | `id, type, title, firstName, fatherName, motherName, surname, dob, nationality, idNumber, profession, financialCapacity, physicalAddress, status, addresses[], phones[], profilePicture, createdAt` |
| `akar_properties` | array | `id, remoteId, type, category, subCategory, title, displayName, description, status, lifecycle, ownerType, trueOwnerName, mandatedAgentName, address, city, district, neighborhood, coordinates[], coordinatesLegacy{}, mapUrl, boundaries{}, area{}, totalArea, rooms, bathrooms, price, askingPrice, currency, offer{}, sections[], photos[], videos[], media[], documents[], attachments[], financialRecords[], __fromPlatform, createdAt, updatedAt` |
| `akar_v2_users` | array | `id, username, fullName, email, phone, role, department, position, permissions[], passwordHash, avatarUrl, isActive, lastLogin, createdAt` |
| `akar_v2_ledger_transactions` | array | `id, type, status, propertyId, propertyTitle, grossAmount, commissionAmount, commissionNote, netAmount, description, createdAt` |
| `akar_v2_ledger_entries` | array | `id, transactionId, relatedTransactionId, type, direction, amount, clientId, clientName, propertyId, propertyTitle, ownershipPct, description, createdAt` |
| `akar_v2_requests` | array | `id, clientId, clientName, clientPhone, targetType, targetCity, targetPriceMin, targetPriceMax, notes, isActive, createdAt` |
| `akar_v2_contract_clauses` | array | `id, contractId, libraryItemId, title, body, order, isEdited` |
| `akar_v2_clause_library` | array | 9 fields — reusable clause templates |
| `akar_v2_timeline` | array | `id, clientId, agentName, noteText, rating, tags[], createdAt` |
| `akar_v2_b2b_listings` | array | `id, agencyName, agencyLogo, agencyPhone, propertyType, propertyCity, priceSAR, description, postedAt` |
| `akar_v2_b2c_leads` | array | `id, title, targetType, targetCity, budgetSAR, notes, claimedBy[], postedAt` |
| `akar_published_properties` | array | `propertyId, remoteId, status, syncStatus, publishedAt, publishedBy, publishAttempts, lastAttemptAt, lastSuccessfulSyncAt, hasSuccessfulSync, selectedPhotos[], selectedVideo, seoTitle, seoDescription, websiteUrl, viewCount, inquiryCount` |
| `akar_v2_agency_settings` | object | `name, address, phone, email, website, taxNumber, description, logoUrl, +6` |
| `akar_office_profile` | object | `name, country, governorate, city, phone, whatsapp, email, logoData, +2` |
| `akar_v2_system_preferences` | object | 18 keys |
| `akar_v2_backup_settings` | object | 11 keys |
| `akar_v2_dropdown_lists` | object | 3 lookup lists |
| `akar_geo_v2`, `akar_location_v4`, `akar_lang`, `akar_sidebar_v2` | mixed | UI and location state |
| `user_token`, `akar_device_installation_id`, `akar_website_api_settings` | mixed | credentials and device identity |

Empty on this installation but defined: `akar_v2_contracts`, `akar_v2_invoices`,
`akar_v2_addresses`, `akar_v2_poa`, `akar_v2_property_requests`,
`akar_v2_group_members`, `akram_projects`.

`akar_v2_contract_counter` is a bare integer — a sequence held in a file, with
no atomicity across processes.

---

## The finding that shapes the rewrite

**99.9% of the data is base64 images inlined into the documents.**

| Document | Total | The one field | Share |
|---|---|---|---|
| `akar_v2_clients` | 1,242,483 B | `profilePicture` — 1,241,692 B | **99.94%** |
| `akar_v2_agency_settings` | 2,776,030 B | `logoUrl` — 2,775,536 B | **99.98%** |
| `akar_office_profile` | 194,463 B | `logoData` — 194,205 B | **99.87%** |

The clients document holds **two records** and weighs 1.2 MB. Every other field
across both records totals under 800 bytes.

### Why that matters more than it looks

The store rewrites a whole document on every save. So **editing a client's phone
number rewrites every profile picture in the file.**

With two clients that is 1.2 MB per keystroke-save. At two hundred clients it is
on the order of 120 MB rewritten for every edit — and the same volume copied
again by each day's first snapshot. The application does not merely get slower as
the office grows; it degrades quadratically against the thing the business wants
most, which is more clients.

It also widens the corruption window that
[ADR-002](./ADR-002-live-data-store.md) is about: the longer a write takes, the
larger the target for an interruption. The atomic write now makes that
survivable, but the right fix is for the write to be small.

### Consequence

**Binary must live outside the records.** Files on disk or database BLOBs,
referenced by id, loaded on demand. This is not an optimisation to schedule
later — it is the difference between a product that scales with the business and
one that fights it, and the rewrite is the moment it costs nothing to fix.

---

## Other observations worth carrying forward

- **No referential integrity anywhere.** `clientId`, `propertyId`, `transactionId`
  are strings pointing into other files with nothing enforcing that the target
  exists. Denormalised copies (`clientName`, `propertyTitle`) are kept alongside
  the ids, so they can and will drift apart.
- **`passwordHash` sits in `akar_v2_users`** alongside everything else, in a
  plain file with no protection beyond the filesystem. Worth a decision.
- **Money is stored as `int`** — presumably minor units, but nothing records
  that. `priceSAR` and `budgetSAR` hardcode a currency in the field *name* while
  `akar_properties` carries a separate `currency` field. That inconsistency
  should not be carried into a schema.
- **`ownershipPct` is a float on ledger entries** — the same concept the SQLite
  triggers guard at 100% (see
  [DOMAIN_RULES_IN_DATABASE.md](./DOMAIN_RULES_IN_DATABASE.md)), enforced there
  and not here.
- **Timestamps are strings** with no recorded timezone.
- `coordinates[]` and `coordinatesLegacy{}` coexist, as do `photos[]`,
  `videos[]`, `media[]` and `attachments[]` — evidence of migrations that were
  started and not finished. The rewrite should land on one of each.

---

## How to use this

1. **It is the schema input.** The SQLite target already has tables for most of
   these; this maps the live shape onto them and shows where they disagree.
2. **It is the parity checklist.** Every field here is one a user can see or
   edit today. A rewritten screen that drops one is a regression.
3. **It is not sufficient on its own.** It captures *what is stored*, not *what
   is computed, validated or displayed*. Those still have to come from running
   the application — which remains possible, and is the next thing to do.

## Not established

- Which fields are required, and which are computed rather than entered.
- What the `status` and `lifecycle` string values may be — only the values
  present on this installation were seen, and it is one office's data.
- Whether the empty stores are unused features or simply unused here.
