# Feature Matrix

**Mode:** PLAN (read-only). Reference feature → target status + decision.

Legend: ✅ KEEP | 🔶 MERGE (ADAPT/REBUILD) | 🗑 DO_NOT_MIGRATE | ⬜ NEW (target-only)

| Feature | Reference | Target | Decision |
|---|---|---|---|
| Home page (hero, slideshows, banners) | ✅ full | ⬜ minimal | 🔶 MERGE → rebuild on `PublicPageShell` |
| News ticker | ✅ (news-ticker) | ✅ `/admin/news` + `NewsTicker` | ✅ KEEP target (superior: scope/priority/schedule/trilingual) |
| Ads (banners, rotating, geo, hero) | ✅ AdBanner/Rotating/GeoAd | ✅ AdSlot + `api/ads` engine | ✅ KEEP target (D1-backed, scoped) |
| Property listing + detail | ✅ | ✅ detail only | 🔶 MERGE (add listing index + submit) |
| Offices directory | ✅ | ⬜ | 🔶 REBUILD |
| Suppliers directory | ✅ | ⬜ | 🔶 REBUILD |
| Blog / CMS | ✅ Blog+Write+AdminBlog | ⬜ | 🔶 REBUILD (Phase 7; CONTENT_SUPERVISOR role) |
| Services / ServiceHub | ✅ | ✅ services catalog + dashboard + admin | ✅ KEEP target (superset) |
| Auctions (list/detail/FAQ/terms/stats/history + dashboard + admin) | ✅ | ⬜ | 🔶 REBUILD_FROM_BEHAVIOR (REST, no socket) |
| Tenders (list/create/detail/bids + admin) | ✅ | ⬜ | 🔶 REBUILD_FROM_BEHAVIOR |
| Market history / investment radar | ✅ | ⬜ | 🔶 REBUILD (analytics) |
| Vehicle services | ✅ | ⬜ | 🔶 REBUILD (module under services) |
| Architectural consultant (arch-ai) | ✅ | ⬜ | 🔶 REBUILD (module; no AI dep initially) |
| Licensing/software/download/verify | ✅ | ⬜ | 🔶 REBUILD (Phase 8; needs approval) |
| Pricing/subscribe/payments | ✅ | ⬜ | 🔶 REBUILD (needs PayPal approval) |
| Partners/Marketers/Advertisers programs | ✅ (8 routes) | ⬜ | 🔶 REBUILD (Phase 8) |
| Tools (6) | ✅ | ✅ (15+5 cad) | 🔶 MERGE parity; ✅ KEEP target superset |
| PWA / install / offline | ✅ | ⬜ | 🔶 REBUILD_FROM_BEHAVIOR (Phase 9, optional) |
| Email verification / reset / OTP | ✅ (jwt email tokens) | ⬜ (verify route only) | 🔶 REBUILD (Phase 2; SMTP approval) |
| Account (profile, dashboard, inbox, messages) | ✅ | ✅ account/workspace groups | 🔶 MERGE → port into groups |
| Unified inbox / technician inbox | ✅ | ✅ dashboard/services/inbox | ✅ KEEP target |
| Auth (session) | 🗑 JWT Bearer | ✅ session cookie | ✅ KEEP target (see auth reports) |
| RBAC | 🗑 string role | ✅ permissions matrix | ✅ KEEP target |
| Admin screens (32) | ✅ | ✅ 9 + sponsors | 🔶 MERGE — port remaining ~23 under target permissions |
| i18n (ar/en/tr) | ✅ i18next | ✅ target `lib/i18n` | ✅ KEEP target (home-grown, RTL) |
| Dark mode | ✅ next-themes | ✅ class-based | ✅ KEEP target |
| Maps/geo | ✅ leaflet+react-leaflet | ✅ leaflet (tools) + LocationPicker | ✅ KEEP target |
| OCR (pdf→word) | ✅ | ✅ | ✅ KEEP target |
| 3D preview (three.js) | ✅ | ⬜ | 🗑 DO_NOT_MIGRATE (no consumer; heavy) |
| ML inference (onnx) | ✅ | ⬜ | 🗑 DO_NOT_MIGRATE |
| Realtime socket (auctions/chat) | ✅ | ⬜ | 🔶 REBUILD_FROM_BEHAVIOR (REST) |
| Notifications (web-push) | ✅ | ⬜ | 🔶 REBUILD (Phase 9, optional) |
| Dev login backdoor | 🗑 | ✅ none | 🗑 DO_NOT_MIGRATE |
| Root debris / scratch scripts | 🗑 | — | 🗑 DO_NOT_MIGRATE |

## Summary counts (target baseline)
- Target pages: 37; API handlers: 94; src components: 52; lib server modules: ~38; tests: 44 green.
- Reference pages: 123; components: 152; API routes: 26 files.

## Decision summary
- **KEEP (reuse as-is):** target auth, RBAC, i18n, ads engine, news ticker, services marketplace, tools, shells, route architecture, DB layer.
- **MERGE (adapt/rebuild):** home/property/office/supplier/blog/account/admin screens, tools parity, email flows.
- **REBUILD_FROM_BEHAVIOR:** auctions, tenders, analytics, vehicle services, partners, licensing/payments (approved), PWA/notifications.
- **DO_NOT_MIGRATE:** JWT-Bearer auth, dev-login, three/onnx, socket model, reference root debris, duplicate pages, garbled-string code.
