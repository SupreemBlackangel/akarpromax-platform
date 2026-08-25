# 01_V1_SOURCE_MAP.md
# V1 Source Map — Complete Path Inventory

**Audit Date:** 2026-08-19  
**Mode:** READ-ONLY

---

## Source Locations Discovered

| SOURCE TYPE | PATH | LIKELY VERSION | FRONTEND | BACKEND | DATABASE | ASSETS | TESTS | STATUS | CONFIDENCE |
|---|---|---|---|---|---|---|---|---|---|
| V1.0 Full Source | `E:\Akarpromax new 2027\V1.0` | V1.0 | React 18 + Vite 5 + TailwindCSS 4 | Express 5 + Prisma + SQLite | SQLite (dev.db) | Static assets in public/ | MSW mocks | ARCHIVED | SOURCE_VERIFIED |
| V2.0 Current | `E:\Akarpromax new 2027\V 2.0 GPT - Copy` | V2.0 | Next.js 16.3.0 + React 19 | Next.js API routes + Drizzle ORM | PostgreSQL (Neon) + D1 + MySQL | public/ | Jest tests | ACTIVE | SOURCE_VERIFIED |
| V2.0 Copy | `E:\Akarpromax new 2027\V 2.0 GPT -Copy` | V2.0 | Next.js 16.3.0 | Next.js API routes | PostgreSQL (Neon) | public/ | Jest tests | ACTIVE (copy) | SOURCE_VERIFIED |
| V3.0 | `E:\Akarpromax new 2027\V 3.0 GPT 2027` | V3.0 | Unknown | Unknown | Unknown | Unknown | Unknown | UNKNOWN | INFERRED |
| V4.0 | `E:\Akarpromax new 2027\V4.0 GPT 2027` | V4.0 | Unknown | Unknown | Unknown | Unknown | Unknown | UNKNOWN | INFERRED |
| AkarApp_LIVE | `F:\akarpromax-office\AkarApp_LIVE` | V1 Desktop | WPF (.NET) | N/A | SQLite | WebView2 | None | ARCHIVED | SOURCE_VERIFIED |
| AkarApp_LIVE (copy) | `E:\Akarpromax new 2027\V 2.0 GPT - Copy\AkarApp_LIVE` | V1 Desktop | WPF (.NET) | N/A | SQLite | WebView2 | None | ARCHIVED (copy) | SOURCE_VERIFIED |
| AkarApp_Next | `F:\akarpromax-office\AkarApp_Next` | V2 Desktop | WPF (.NET 8) | N/A | SQLite | WebView2 + Vite WebUI | None | ACTIVE | SOURCE_VERIFIED |
| AkarApp_Dev | `F:\akarpromax-office\AkarApp_Dev` | Dev Desktop | WPF (.NET) | N/A | SQLite | WebView2 | None | UNKNOWN | INFERRED |
| AkarApp_Clean | `F:\akarpromax-office\AkarApp_Clean` | Clean Desktop | WPF (.NET) | N/A | SQLite | WebView2 | None | UNKNOWN | INFERRED |
| akarpromax-files | `F:\akarpromax-files` | Files | N/A | N/A | N/A | Various | None | UNKNOWN | INFERRED |
| akar-replit | `F:\akar-replit` | Replit version | Unknown | Unknown | Unknown | Unknown | Unknown | UNKNOWN | INFERRED |
| V2.0 deploy-staging | `E:\Akarpromax new 2027\deploy-staging` | Staging | Next.js | Next.js API | PostgreSQL | public/ | None | STAGING | INFERRED |

---

## V1.0 Directory Structure

```
E:\Akarpromax new 2027\V1.0\
├── src/
│   ├── api/                    # API client functions
│   ├── components/             # React components
│   │   ├── ui/                 # Shadcn UI primitives (55 files)
│   │   ├── arch/               # Architectural engineering suite (40 files)
│   │   ├── chat/               # Chat system (7 files)
│   │   ├── auctions/           # Auction UI (9 files)
│   │   ├── layout/             # Layout components (6 files)
│   │   └── ...                 # Other components
│   ├── config/                 # Configuration files
│   ├── contexts/               # React contexts (10 files)
│   ├── data/                   # Static data and mocks
│   ├── generated/              # Generated files
│   ├── hooks/                  # Custom hooks (13 files)
│   ├── lib/                    # Utilities and helpers (15 files)
│   ├── locales/                # i18n translations (2 files)
│   ├── mocks/                  # MSW mock handlers
│   ├── pages/                  # Page components (117 files)
│   ├── services/               # Client-side services (8 files)
│   ├── types/                  # TypeScript types
│   └── utils/                  # Utility functions
├── server/
│   ├── api/
│   │   ├── src/
│   │   │   ├── routes/         # API route handlers (28 files)
│   │   │   ├── services/       # Server services (4 files)
│   │   │   └── index.ts        # Main server entry
│   │   └── prisma/
│   │       └── schema.prisma   # Database schema (55 models, 1315 lines)
│   └── chat-server.ts          # Socket.IO chat server
├── public/                     # Static assets
└── package.json                # Dependencies
```

---

## V2.0 Directory Structure

```
E:\Akarpromax new 2027\V 2.0 GPT - Copy\
├── app/                        # Next.js App Router
│   ├── api/                    # API routes
│   │   ├── properties/         # Property APIs
│   │   ├── ads/                # Ad APIs
│   │   ├── auth/               # Auth APIs
│   │   ├── geo/                # Geo APIs
│   │   ├── admin/              # Admin APIs
│   │   └── ...                 # Other APIs
│   ├── properties/             # Property pages
│   ├── services/               # Service pages
│   ├── dashboard/              # Dashboard pages
│   ├── admin/                  # Admin pages
│   └── ...                     # Other pages
├── src/
│   ├── components/             # React components
│   │   ├── ui/                 # UI components
│   │   ├── ads/                # Ad components
│   │   ├── public/             # Public page components
│   │   └── ...                 # Other components
│   ├── contexts/               # React contexts
│   ├── data/                   # Static data
│   ├── hooks/                  # Custom hooks
│   ├── lib/                    # Utilities
│   └── styles/                 # CSS styles
├── lib/                        # Shared libraries
│   ├── db/                     # Database schemas
│   │   ├── schemas/            # Drizzle ORM schemas
│   │   └── index.ts            # Database connection
│   ├── ads/                    # Ad engine
│   ├── auth/                   # Auth utilities
│   └── ...                     # Other libraries
├── components/                 # Legacy components
├── hooks/                      # Legacy hooks
├── types/                      # TypeScript types
├── tests/                      # Test files
├── drizzle-pg/                 # PostgreSQL migrations
├── scripts/                    # Utility scripts
└── public/                     # Static assets
```

---

## AkarApp_LIVE Structure

```
F:\akarpromax-office\AkarApp_LIVE\
├── AkarApp.exe.WebView2/      # WebView2 runtime
├── cs/                         # C# source files
├── de/                         # German localization
├── dist/                       # Build output
├── es/                         # Spanish localization
├── fr/                         # French localization
├── it/                         # Italian localization
├── ja/                         # Japanese localization
├── ko/                         # Korean localization
├── Localization/               # Localization resources
├── pl/                         # Polish localization
├── pt-BR/                      # Portuguese localization
├── ru/                         # Russian localization
├── runtimes/                   # .NET runtimes
├── tr/                         # Turkish localization
├── webui/                      # Web UI files
├── zh-Hans/                    # Simplified Chinese
└── zh-Hant/                    # Traditional Chinese
```

---

## Evidence Levels

- **SOURCE_VERIFIED** — File exists and was inspected
- **TEST_VERIFIED** — Covered by tests
- **RUNTIME_VERIFIED** — Confirmed working at runtime
- **HISTORICAL_DOC_ONLY** — Documented but not verified
- **INFERRED** — Assumed based on context
- **UNKNOWN** — Cannot determine

---

**Status:** COMPLETE  
**Application Source Files Modified:** ZERO
