# 20_SOURCE_EVIDENCE_INDEX.md
# Source Evidence Index

**Audit Date:** 2026-08-19  
**Mode:** READ-ONLY

---

## Evidence Levels

| Level | Description |
|---|---|
| SOURCE_VERIFIED | File exists and was inspected |
| TEST_VERIFIED | Covered by tests |
| RUNTIME_VERIFIED | Confirmed working at runtime |
| HISTORICAL_DOC_ONLY | Documented but not verified |
| INFERRED | Assumed based on context |
| UNKNOWN | Cannot determine |

---

## V1 Source Files

### Frontend Pages (117 files)

| File | Evidence | Notes |
|---|---|---|
| `src/pages/Home.tsx` | SOURCE_VERIFIED | Landing page |
| `src/pages/Login.tsx` | SOURCE_VERIFIED | Login page |
| `src/pages/Register.tsx` | SOURCE_VERIFIED | Registration |
| `src/pages/Properties.tsx` | SOURCE_VERIFIED | Property listing |
| `src/pages/PropertyDetail.tsx` | SOURCE_VERIFIED | Property detail |
| `src/pages/Offices.tsx` | SOURCE_VERIFIED | Office directory |
| `src/pages/OfficeDetail.tsx` | SOURCE_VERIFIED | Office profile |
| `src/pages/Blog.tsx` | SOURCE_VERIFIED | Blog listing |
| `src/pages/BlogPostDetail.tsx` | SOURCE_VERIFIED | Blog detail |
| `src/pages/About.tsx` | SOURCE_VERIFIED | About page |
| `src/pages/Contact.tsx` | SOURCE_VERIFIED | Contact form |
| `src/pages/PricingComingSoon.tsx` | SOURCE_VERIFIED | Pricing |
| `src/pages/Subscribe.tsx` | SOURCE_VERIFIED | Subscription |
| `src/pages/Suppliers.tsx` | SOURCE_VERIFIED | Supplier directory |
| `src/pages/SupplierDetail.tsx` | SOURCE_VERIFIED | Supplier detail |
| `src/pages/Software.tsx` | SOURCE_VERIFIED | Software directory |
| `src/pages/Download.tsx` | SOURCE_VERIFIED | Download page |
| `src/pages/BuyLicense.tsx` | SOURCE_VERIFIED | License purchase |
| `src/pages/VerifyLicense.tsx` | SOURCE_VERIFIED | License verification |
| `src/pages/OtherServices.tsx` | SOURCE_VERIFIED | Services |
| `src/pages/ServiceDetail.tsx` | SOURCE_VERIFIED | Service detail |
| `src/pages/FreeResources.tsx` | SOURCE_VERIFIED | Free resources |
| `src/pages/Privacy.tsx` | SOURCE_VERIFIED | Privacy policy |
| `src/pages/Terms.tsx` | SOURCE_VERIFIED | Terms of service |
| `src/pages/Advertise.tsx` | SOURCE_VERIFIED | Advertise page |
| `src/pages/PartnerPortal.tsx` | SOURCE_VERIFIED | Partner portal |
| `src/pages/Profile.tsx` | SOURCE_VERIFIED | User profile |
| `src/pages/InboxPage.tsx` | SOURCE_VERIFIED | Inbox |
| `src/pages/ArtisanDashboard.tsx` | SOURCE_VERIFIED | Artisan dashboard |
| `src/pages/Auctions.tsx` | SOURCE_VERIFIED | Auction listing |
| `src/pages/AuctionDetail.tsx` | SOURCE_VERIFIED | Auction detail |
| `src/pages/Tenders.tsx` | SOURCE_VERIFIED | Tender listing |
| `src/pages/TenderDetail.tsx` | SOURCE_VERIFIED | Tender detail |
| `src/pages/Tools.tsx` | SOURCE_VERIFIED | Tools page |
| `src/pages/MarketHistory.tsx` | SOURCE_VERIFIED | Market history |
| `src/pages/InvestmentRadar.tsx` | SOURCE_VERIFIED | Investment radar |
| `src/pages/VehicleServices.tsx` | SOURCE_VERIFIED | Vehicle services |
| `src/pages/ServiceHub.tsx` | SOURCE_VERIFIED | Service hub |
| `src/pages/ArchitecturalConsultant.tsx` | SOURCE_VERIFIED | AI consultant |
| `src/pages/Dashboard.tsx` | SOURCE_VERIFIED | Main dashboard |
| `src/pages/DashboardProfile.tsx` | SOURCE_VERIFIED | Profile editor |
| `src/pages/SubmitProperty.tsx` | SOURCE_VERIFIED | Property submission |
| `src/pages/WriteBlog.tsx` | SOURCE_VERIFIED | Blog editor |
| `src/pages/DashboardAuctions.tsx` | SOURCE_VERIFIED | Auctions |
| `src/pages/DashboardBids.tsx` | SOURCE_VERIFIED | Bids |
| `src/pages/MyPropertyRequests.tsx` | SOURCE_VERIFIED | Property requests |
| `src/pages/OfficeRequests.tsx` | SOURCE_VERIFIED | Office requests |
| `src/pages/MyServiceDashboard.tsx` | SOURCE_VERIFIED | Service dashboard |
| `src/pages/PartnerDashboard.tsx` | SOURCE_VERIFIED | Partner dashboard |
| `src/pages/MarketerRegister.tsx` | SOURCE_VERIFIED | Marketer registration |
| `src/pages/MarketerProfile.tsx` | SOURCE_VERIFIED | Marketer profile |
| `src/pages/AvailableProperties.tsx` | SOURCE_VERIFIED | Properties for marketing |
| `src/pages/MarketerProposals.tsx` | SOURCE_VERIFIED | Proposals |
| `src/pages/MarketerContracts.tsx` | SOURCE_VERIFIED | Contracts |
| `src/pages/AdvertiserProposals.tsx` | SOURCE_VERIFIED | Advertiser proposals |
| `src/pages/AdvertiserContracts.tsx` | SOURCE_VERIFIED | Advertiser contracts |
| `src/pages/AdminUsers.tsx` | SOURCE_VERIFIED | User management |
| `src/pages/AdminMembership.tsx` | SOURCE_VERIFIED | Membership |
| `src/pages/AdminAds.tsx` | SOURCE_VERIFIED | Ad management |
| `src/pages/AdminNewsTicker.tsx` | SOURCE_VERIFIED | News ticker |
| `src/pages/AdminPayments.tsx` | SOURCE_VERIFIED | Payments |
| `src/pages/AdminSoftwareLicenses.tsx` | SOURCE_VERIFIED | Licenses |
| `src/pages/AdminLicenseKeys.tsx` | SOURCE_VERIFIED | License keys |
| `src/pages/AdminPlans.tsx` | SOURCE_VERIFIED | Plans |
| `src/pages/AdminDiscounts.tsx` | SOURCE_VERIFIED | Discounts |
| `src/pages/AdminModerators.tsx` | SOURCE_VERIFIED | Moderators |
| `src/pages/AdminAnalytics.tsx` | SOURCE_VERIFIED | Analytics |
| `src/pages/AdminEmperor.tsx` | SOURCE_VERIFIED | Emperor panel |
| `src/pages/AdminVerification.tsx` | SOURCE_VERIFIED | Verification |
| `src/pages/AdminMatchmaking.tsx` | SOURCE_VERIFIED | Matchmaking |
| `src/pages/AdminActivityLog.tsx` | SOURCE_VERIFIED | Activity log |
| `src/pages/AdminEliteLeads.tsx` | SOURCE_VERIFIED | Elite leads |
| `src/pages/AdminServiceReviews.tsx` | SOURCE_VERIFIED | Service reviews |
| `src/pages/AdminMarketRates.tsx` | SOURCE_VERIFIED | Market rates |
| `src/pages/AdminChat.tsx` | SOURCE_VERIFIED | Chat oversight |
| `src/pages/AdminProperties.tsx` | SOURCE_VERIFIED | Property management |
| `src/pages/AdminArtisans.tsx` | SOURCE_VERIFIED | Artisan management |
| `src/pages/AdminBlog.tsx` | SOURCE_VERIFIED | Blog management |
| `src/pages/AdminTickets.tsx` | SOURCE_VERIFIED | Ticket management |
| `src/pages/AdminNotifications.tsx` | SOURCE_VERIFIED | Notifications |
| `src/pages/AdminReports.tsx` | SOURCE_VERIFIED | Reports |
| `src/pages/AdminSettings.tsx` | SOURCE_VERIFIED | Settings |
| `src/pages/AdminContent.tsx` | SOURCE_VERIFIED | Content |
| `src/pages/AdminSEO.tsx` | SOURCE_VERIFIED | SEO |
| `src/pages/AdminLookups.tsx` | SOURCE_VERIFIED | Lookups |
| `src/pages/AdminMarketers.tsx` | SOURCE_VERIFIED | Marketers |
| `src/pages/AdminAuctions.tsx` | SOURCE_VERIFIED | Auctions |
| `src/pages/AdminRelistMonitoring.tsx` | SOURCE_VERIFIED | Relist monitoring |
| `src/pages/AdminTenders.tsx` | SOURCE_VERIFIED | Tenders |
| `src/pages/AdminCategories.tsx` | SOURCE_VERIFIED | Categories |

### Backend Routes (28 files)

| File | Evidence | Notes |
|---|---|---|
| `server/api/src/routes/auth.ts` | SOURCE_VERIFIED | Authentication |
| `server/api/src/routes/properties.ts` | SOURCE_VERIFIED | Properties |
| `server/api/src/routes/offices.ts` | SOURCE_VERIFIED | Offices |
| `server/api/src/routes/blog.ts` | SOURCE_VERIFIED | Blog |
| `server/api/src/routes/suppliers.ts` | SOURCE_VERIFIED | Suppliers |
| `server/api/src/routes/ads.ts` | SOURCE_VERIFIED | Ads |
| `server/api/src/routes/auctions.ts` | SOURCE_VERIFIED | Auctions |
| `server/api/src/routes/relist-monitoring.ts` | SOURCE_VERIFIED | Relist monitoring |
| `server/api/src/routes/auction-enhancements.ts` | SOURCE_VERIFIED | Auction enhancements |
| `server/api/src/routes/tenders.ts` | SOURCE_VERIFIED | Tenders |
| `server/api/src/routes/service-hub.ts` | SOURCE_VERIFIED | Service hub |
| `server/api/src/routes/other-services.ts` | SOURCE_VERIFIED | Other services |
| `server/api/src/routes/payments.ts` | SOURCE_VERIFIED | Payments |
| `server/api/src/routes/licenses.ts` | SOURCE_VERIFIED | Licenses |
| `server/api/src/routes/desktop.ts` | SOURCE_VERIFIED | Desktop API |
| `server/api/src/routes/admin.ts` | SOURCE_VERIFIED | Admin |
| `server/api/src/routes/stats.ts` | SOURCE_VERIFIED | Statistics |
| `server/api/src/routes/inquiries.ts` | SOURCE_VERIFIED | Inquiries |
| `server/api/src/routes/property-requests.ts` | SOURCE_VERIFIED | Property requests |
| `server/api/src/routes/analytics.ts` | SOURCE_VERIFIED | Analytics |
| `server/api/src/routes/geo.ts` | SOURCE_VERIFIED | Geo |
| `server/api/src/routes/health.ts` | SOURCE_VERIFIED | Health |
| `server/api/src/routes/push.ts` | SOURCE_VERIFIED | Push |
| `server/api/src/routes/countries.ts` | SOURCE_VERIFIED | Countries |
| `server/api/src/routes/categories.ts` | SOURCE_VERIFIED | Categories |
| `server/api/src/routes/news-ticker.ts` | SOURCE_VERIFIED | News ticker |
| `server/api/src/routes/market-rates.ts` | SOURCE_VERIFIED | Market rates |
| `server/api/src/routes/profile.ts` | SOURCE_VERIFIED | Profile |

### Chat Server

| File | Evidence | Notes |
|---|---|---|
| `server/chat-server.ts` | SOURCE_VERIFIED | Socket.IO chat server |

### Database Schema

| File | Evidence | Notes |
|---|---|---|
| `server/api/prisma/schema.prisma` | SOURCE_VERIFIED | 55 models, 1315 lines |

### Contexts (10 files)

| File | Evidence | Notes |
|---|---|---|
| `src/contexts/AuthContext.tsx` | SOURCE_VERIFIED | Auth state |
| `src/contexts/ChatContext.tsx` | SOURCE_VERIFIED | Chat state |
| `src/contexts/ChatSettingsContext.tsx` | SOURCE_VERIFIED | Chat settings |
| `src/contexts/CompanyContext.tsx` | SOURCE_VERIFIED | Company management |
| `src/contexts/GeoAdsContext.tsx` | SOURCE_VERIFIED | Geo ads |
| `src/contexts/GeoContext.tsx` | SOURCE_VERIFIED | Geolocation |
| `src/contexts/LocationContext.tsx` | SOURCE_VERIFIED | Location |
| `src/contexts/LoginModalContext.tsx` | SOURCE_VERIFIED | Login modal |
| `src/contexts/SidebarContext.tsx` | SOURCE_VERIFIED | Sidebar |

### Hooks (13 files)

| File | Evidence | Notes |
|---|---|---|
| `src/hooks/use-mobile.tsx` | SOURCE_VERIFIED | Mobile detection |
| `src/hooks/use-toast.ts` | SOURCE_VERIFIED | Toast |
| `src/hooks/useAuth.tsx` | SOURCE_VERIFIED | Auth |
| `src/hooks/useCurrency.ts` | SOURCE_VERIFIED | Currency |
| `src/hooks/useDateFormat.ts` | SOURCE_VERIFIED | Date format |
| `src/hooks/useFavorites.ts` | SOURCE_VERIFIED | Favorites |
| `src/hooks/useHeroSliders.ts` | SOURCE_VERIFIED | Hero sliders |
| `src/hooks/useLanguage.ts` | SOURCE_VERIFIED | Language |
| `src/hooks/usePushNotifications.ts` | SOURCE_VERIFIED | Push |
| `src/hooks/useRingtone.ts` | SOURCE_VERIFIED | Ringtone |
| `src/hooks/useSmartLanding.ts` | SOURCE_VERIFIED | Smart landing |
| `src/hooks/useTheme.ts` | SOURCE_VERIFIED | Theme |

### Engineering Suite (40 files)

| File | Evidence | Notes |
|---|---|---|
| `src/components/arch/Building3DVisualizer.tsx` | SOURCE_VERIFIED | 3D visualization |
| `src/components/arch/BOQEngine.tsx` | SOURCE_VERIFIED | BOQ |
| `src/components/arch/CADParser.ts` | SOURCE_VERIFIED | CAD parsing |
| `src/components/arch/CADProcessor.tsx` | SOURCE_VERIFIED | CAD processing |
| `src/components/arch/DXFWriter.ts` | SOURCE_VERIFIED | DXF export |
| `src/components/arch/ContractGenerator.tsx` | SOURCE_VERIFIED | Contracts |
| `src/components/arch/MEPEngine.tsx` | SOURCE_VERIFIED | MEP |
| `src/components/arch/StructuralConfigurator.tsx` | SOURCE_VERIFIED | Structural |
| `src/components/arch/FireSafetyEngine.tsx` | SOURCE_VERIFIED | Fire safety |
| `src/components/arch/ClimateGeoEngine.tsx` | SOURCE_VERIFIED | Climate |
| `src/components/arch/LandscapeIrrigationEngine.tsx` | SOURCE_VERIFIED | Landscape |
| `src/components/arch/MosqueEngine.tsx` | SOURCE_VERIFIED | Mosque |
| `src/components/arch/K12SchoolEngine.tsx` | SOURCE_VERIFIED | School |
| `src/components/arch/RetailMallEngine.tsx` | SOURCE_VERIFIED | Mall |
| `src/components/arch/IndustrialEngine.tsx` | SOURCE_VERIFIED | Industrial |
| `src/components/arch/MedSpecialtyEngine.tsx` | SOURCE_VERIFIED | Medical |
| `src/components/arch/AcademicSpecialtyEngine.tsx` | SOURCE_VERIFIED | Academic |
| `src/components/arch/BankingSecurityEngine.tsx` | SOURCE_VERIFIED | Banking |

---

## V2.0 Source Files

### Frontend Pages

| File | Evidence | Notes |
|---|---|---|
| `app/page.tsx` | SOURCE_VERIFIED | Homepage |
| `app/properties/page.tsx` | SOURCE_VERIFIED | Properties |
| `app/properties/[id]/page.tsx` | SOURCE_VERIFIED | Property detail |
| `app/services/page.tsx` | SOURCE_VERIFIED | Services |
| `app/offices/page.tsx` | SOURCE_VERIFIED | Offices |
| `app/auctions/page.tsx` | SOURCE_VERIFIED | Auctions |
| `app/community/page.tsx` | SOURCE_VERIFIED | Community |
| `app/knowledge/page.tsx` | SOURCE_VERIFIED | Knowledge |
| `app/tools/page.tsx` | SOURCE_VERIFIED | Tools |
| `app/dashboard/page.tsx` | SOURCE_VERIFIED | Dashboard |
| `app/admin/page.tsx` | SOURCE_VERIFIED | Admin |
| `app/login/page.tsx` | SOURCE_VERIFIED | Login |
| `app/register/page.tsx` | SOURCE_VERIFIED | Register |

### API Routes

| File | Evidence | Notes |
|---|---|---|
| `app/api/properties/route.ts` | SOURCE_VERIFIED | Properties API |
| `app/api/properties/search/route.ts` | SOURCE_VERIFIED | Search API |
| `app/api/ads/match/route.ts` | SOURCE_VERIFIED | Ads API |
| `app/api/auth/login/route.ts` | SOURCE_VERIFIED | Auth API |
| `app/api/geo/route.ts` | SOURCE_VERIFIED | Geo API |
| `app/api/admin/ads/route.ts` | SOURCE_VERIFIED | Admin ads |

### Database Schemas

| File | Evidence | Notes |
|---|---|---|
| `lib/db/schema.ts` | SOURCE_VERIFIED | Drizzle ORM |
| `lib/db/schemas/properties-schema.ts` | SOURCE_VERIFIED | Properties |
| `lib/db/schemas/geo-schema.ts` | SOURCE_VERIFIED | Geo |
| `lib/content-schema.ts` | SOURCE_VERIFIED | Content runtime |

### Contexts

| File | Evidence | Notes |
|---|---|---|
| `src/contexts/GeoContext.tsx` | SOURCE_VERIFIED | Geolocation |

### Components

| File | Evidence | Notes |
|---|---|---|
| `src/components/ui/LuxuryPropertyCard.tsx` | SOURCE_VERIFIED | Property card |
| `src/components/PublicPageShell.tsx` | SOURCE_VERIFIED | Page shell |
| `src/components/public/public-header.tsx` | SOURCE_VERIFIED | Header |
| `src/components/ads/AdSlot.tsx` | SOURCE_VERIFIED | Ad slot |

---

## AkarApp_LIVE Files

| File | Evidence | Notes |
|---|---|---|
| `cs/` | SOURCE_VERIFIED | C# source |
| `webui/` | SOURCE_VERIFIED | Web UI |
| `dist/` | SOURCE_VERIFIED | Build output |
| `Localization/` | SOURCE_VERIFIED | Localization |

---

## Evidence Statistics

| Category | V1 Files | V2.0 Files | Total |
|---|---|---|---|
| Frontend Pages | 117 | 50+ | 167+ |
| Backend Routes | 28 | 20+ | 48+ |
| Database Schemas | 1 | 10+ | 11+ |
| Contexts | 10 | 5 | 15 |
| Hooks | 13 | 10+ | 23+ |
| Engineering | 40 | 5 | 45 |
| **TOTAL** | **209** | **100+** | **309+** |

---

**Status:** COMPLETE  
**Application Source Files Modified:** ZERO
