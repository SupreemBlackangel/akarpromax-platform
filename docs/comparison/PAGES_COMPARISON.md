# Pages Comparison

**Mode:** PLAN (read-only). Reference = 123 page files, Target = 37 page routes.

---

## 1. Page inventory

### Reference pages (grouped)
- **Landing/pages:** Home, About, Contact, JoinFounders, LandingProfessionals, LandingOffices, LandingCorporates, Pricing, PricingComingSoon, not-found.
- **Property vertical:** Properties, PropertyDetail, SubmitProperty, MyPropertyRequests, OfficeDetail, Offices, OfficeRequests, Estates.
- **Marketplace/blog:** Blog, BlogPostDetail, WriteBlog, FreeResources, Suppliers, SupplierDetail.
- **Licensing/software:** Software, Download, BuyLicense, VerifyLicense, Software(?), Advertise, ProjectVerify.
- **Services:** OtherServices, ServiceDetail, ServiceHub(+Page dup), MyServiceDashboard, VehicleServices, ArchitecturalConsultant (arch-ai), UpgradeToArtisan, ConsultantDashboard.
- **Auctions/tenders:** Auctions, AuctionDetail, AuctionFAQ, AuctionTerms, AuctionStats, AuctionHistory, DashboardAuctions, DashboardBids, Tenders, TenderDetail, TenderCreate, DashboardTenders, DashboardTenderBids, MarketHistory, InvestmentRadar.
- **Account:** Dashboard(+Page dup), DashboardProfile, InboxPage, Messages, Profile(+Page dup), Register, Login, DevLogin, ResetPassword, VerifyEmail, ForgotPasswordModal (component), Subscribe, PaymentReturn.
- **Companies/channels:** MyCompanies, CreateCompany, PartnerPortal, PartnerDashboard, MarketerRegister/Profile/Proposals/Contracts/AdminMarketers, AvailableProperties, AdvertiserProposals/Contracts.
- **Technician/artisan:** TechnicianInbox, TechnicianSettings, ArtisanDashboard, MyCompanies.
- **Admin (32):** ActivityLog, Ads, Analytics, Artisans, Auctions, Blog, Categories, Chat, Content, Discounts, EliteLeads, Emperor, FreeResources, LicenseKeys, Lookups, MarketRates, Matchmaking, Membership, Moderators, NewsTicker, Notifications, Payments, Plans, Properties, RelistMonitoring, Reports, SEO, ServiceMarket, ServiceReviews, Services, Settings, SoftwareLicenses, Tenders, Tickets, Users, UsersPage, Verification.

### Target pages
- **Public:** `/` (home), `/properties/[id]`, `/services`, `/services/catalog/[code]`, `/service-requests/new|/[id](+|/offer)`, `/providers/apply|[id]`, `/tools`.
- **Workspace/Account:** `(account)`, `(workspace)`, `/dashboard/services/*` (9 subpages).
- **Admin:** dashboard, users, roles, ads, news, i18n, services, reports, settings, sponsors (+5 subpages).

## 2. Page-level parity

| Reference page | Target | Verdict |
|---|---|---|
| Home | `/` | MERGE — rebuild home sections from reference (hero, ads, offices/properties/featured, ticker) |
| Properties + PropertyDetail | `/properties/[id]` (detail only) | MERGE — port listing index + detail; SubmitProperty → account flow |
| Offices | — | REBUILD (public office directory) |
| Blog + detail + write | — | REBUILD (CMS admin + public) |
| Services/ServiceHub | `/services*`, `/dashboard/services/*`, `/admin/services` | MERGE — target already deeper; port ServiceHub extras |
| Auctions + Tenders | — | REBUILD_FROM_BEHAVIOR (REST version) |
| Tools | `/tools` (19 tool components) | MERGE — compare TOOLS_COMPARISON.md |
| Pricing/Subscribe/Payments | — | REBUILD (commercial flows) |
| Licensing/Software/Download | — | REBUILD (license-key system) |
| Suppliers | — | REBUILD (supplier directory) |
| Marketer/Advertiser/Partner | — | REBUILD (channel programs) |
| Profile/Dashboard | account/workspace groups | MERGE — port into `(account)`/`(workspace)` |
| Admin screens | `/admin/*` 9 screens | MERGE — extend admin with remaining reference screens |
| DevLogin | — | REMOVE (never port) |
| Page twins (Dashboard/DashboardPage etc.) | — | REMOVE duplicates; keep canonical |

## 3. Missing-page risk callouts
- Reference `AdminAuctions` route is registered WITHOUT `adminOnly` (inconsistent guard).
- Reference PWA (`InstallPWA`), rich text editor, unified inbox are components, not pages — port as components if approved.
- Target has NO contact/about/pricing/legal pages yet.

## 4. Decisions
- **KEEP** all existing target pages. REUSE_AS_IS.
- **MERGE** home, properties, services, tools, admin surfaces (ADAPT reference implementation to target layouts).
- **REBUILD** missing verticals (offices, blog/CMS, auctions, tenders, licensing, pricing/payments, suppliers, channels) into target route groups — Phase 3–8 (IMPLEMENTATION_PHASES.md).
- **REMOVE** page twins and `/dev-login`.
