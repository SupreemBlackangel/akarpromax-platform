# Database inventory — AkarProMax Office (local SQLite)

`AkarApp_LIVE/AkarDB.sqlite`, read read-only on 2026-09-02. Entity Framework
Core 8.0.4 over `Microsoft.Data.Sqlite`.

This is a development/seed database: reference data is populated, transactional
tables are empty. It is **not** the production data of any office installation —
each installation carries its own file — so row counts below describe this copy
only and must not be read as production volumes.

## Business rules enforced in the database

Five triggers carry real business rules. Any migration must preserve them, and
they are the kind of logic that is invisible from application code:

- `trg_max_2_lead_claims`
- `trg_ownership_100pct_insert`
- `trg_ownership_100pct_update`
- `trg_prevent_timeline_delete`
- `trg_prevent_timeline_update`

- **Ownership must total 100%** — enforced on insert and on update.
- **At most two lead claims** per lead.
- **The client timeline is append-only** — updates and deletes are blocked.

## Tables

54 tables, 29 indexes, 5 triggers, 0 views.

| Table | Columns | Foreign keys | Rows (this copy) |
|---|---|---|---|
| `AdCampaigns` | 13 | 0 | 0 |
| `AdImpressions` | 4 | 1 | 0 |
| `AgencyLedger` | 17 | 2 | 0 |
| `Branches` | 7 | 0 | 1 |
| `ClientAddressPhotos` | 5 | 1 | 0 |
| `ClientAddresses` | 6 | 1 | 0 |
| `ClientGroupMembers` | 15 | 1 | 0 |
| `ClientLedger` | 17 | 2 | 0 |
| `ClientOffers` | 11 | 2 | 0 |
| `ClientPhones` | 7 | 1 | 0 |
| `ClientRequests` | 21 | 1 | 0 |
| `ClientTimeline` | 10 | 1 | 0 |
| `Clients` | 57 | 0 | 3 |
| `CloudSyncQueue` | 10 | 0 | 0 |
| `CoBrokingRequests` | 11 | 1 | 0 |
| `ContractClauses` | 6 | 1 | 0 |
| `ContractMembers` | 3 | 2 | 0 |
| `ContractTemplates` | 6 | 0 | 3 |
| `Contracts` | 57 | 2 | 0 |
| `Coordinates` | 5 | 1 | 0 |
| `CountryConfigs` | 8 | 0 | 8 |
| `DashboardAlerts` | 12 | 0 | 0 |
| `ESignatures` | 12 | 1 | 0 |
| `HandoverSchedules` | 6 | 1 | 0 |
| `LeadClaims` | 10 | 1 | 0 |
| `LegalClauses` | 7 | 0 | 0 |
| `LookupCategories` | 2 | 0 | 19 |
| `LookupItems` | 6 | 1 | 106 |
| `MaintenanceTickets` | 20 | 3 | 0 |
| `OfficeAuthContracts` | 23 | 1 | 0 |
| `Ownerships` | 7 | 2 | 0 |
| `PostDatedChecks` | 16 | 3 | 0 |
| `PowersOfAttorney` | 16 | 1 | 0 |
| `Properties` | 68 | 2 | 0 |
| `PropertyAmenities` | 4 | 1 | 0 |
| `PropertyAttachments` | 8 | 1 | 0 |
| `PropertyBounds` | 9 | 1 | 0 |
| `PropertyBrokers` | 8 | 0 | 0 |
| `PropertyGisPolygons` | 12 | 1 | 0 |
| `PropertyInstallments` | 5 | 1 | 0 |
| `PropertyLegalStatus` | 11 | 1 | 0 |
| `PublicLeads` | 14 | 0 | 0 |
| `RadarMatches` | 8 | 2 | 0 |
| `RentInstallments` | 12 | 1 | 0 |
| `SaleContracts` | 41 | 0 | 0 |
| `SaleInstallments` | 6 | 1 | 0 |
| `Settings` | 46 | 0 | 0 |
| `StaffCommissions` | 13 | 0 | 0 |
| `TaxFeeTypes` | 9 | 0 | 3 |
| `TechnicianDirectory` | 10 | 0 | 0 |
| `Treasury` | 6 | 0 | 0 |
| `Units` | 8 | 1 | 0 |
| `UserRolePermissions` | 6 | 1 | 0 |
| `Users` | 15 | 0 | 3 |
