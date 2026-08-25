# PASS B — Runtime Verification

**Runtime:** Next.js development server discovered from package scripts and started on `http://127.0.0.1:3010`.

## Executed Read-Only Checks

| Route | Result | Interpretation |
|---|---:|---|
| `/` | 200 | Public home rendered |
| `/login` | 200 | Login UI rendered |
| `/register` | 200 | Registration UI rendered |
| `/properties` | 200 | Property UI rendered |
| `/services` | 200 | Services UI rendered |
| `/auctions` | 200 | Auction UI rendered |
| `/tools` | 200 | Tools UI rendered |
| `/offices` | 200 | Offices UI rendered |
| `/api/auth/me` | 401 | Unauthenticated boundary enforced |
| `/api/properties?limit=1` | 200 | Property listing DB/API path responded |
| `/api/properties/search?limit=1` | 200 | Search API responded |
| `/api/geo?type=countries` | 200 | Geo hierarchy API responded |
| `/api/currencies` | 200 | Currency catalog responded |
| `/api/services/categories` | 200 | Service catalog responded |
| `/api/service-providers` | 200 | Provider endpoint responded |
| `/api/auctions?limit=1` | 200, empty | Auction API responds but no fixture proved lifecycle |
| `/api/offices` | 200 | Office listing responded |
| `POST /api/ads/match` | 200 | Canonical ad engine returned a matched creative |
| `GET /api/advertising/match` | 500 | Legacy/parallel matching route is broken |
| `/api/admin/stats` | 403 | Admin boundary rejects guest |
| `/api/admin/roles` | 401 | Role boundary rejects guest |
| `/api/messages` | 401 | Messaging boundary rejects guest |
| `/api/office/v1/sync` | 401 | Device integration boundary rejects guest |
| `/api/i18n/ar` | 200 | Runtime Arabic localization payload responded |

## Not Proven

No test credentials or isolated fixtures were supplied. To avoid modifying production-like data, PASS B did not create accounts, properties, bids, messages, campaigns, provider offers, or paired devices. Accordingly, authenticated multi-actor chains remain `NEEDS_RUNTIME_PROOF`.

## Runtime Decision

Runtime evidence is useful but insufficient for full parity certification. **PASS B remains OPEN.**