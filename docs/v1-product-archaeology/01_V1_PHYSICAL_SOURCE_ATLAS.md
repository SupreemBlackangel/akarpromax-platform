# 01_V1_PHYSICAL_SOURCE_ATLAS.md
# V1 Physical Source Atlas

**Audit Date:** 2026-08-19  
**Mode:** READ-ONLY — V1 Source Archaeology

---

## V1 Source Roots Discovered

| Source Root | Path | Purpose | File Count |
|---|---|---|---|
| **V1.0 Main** | `E:\Akarpromax new 2027\V1.0` | Complete V1 application | 449 files |
| **V1.0 Frontend** | `E:\Akarpromax new 2027\V1.0\src` | React frontend source | ~300 files |
| **V1.0 Server** | `E:\Akarpromax new 2027\V1.0\server` | Express backend + chat server | ~50 files |
| **V1.0 Public** | `E:\Akarpromax new 2027\V1.0\public` | Static assets | ~20 files |
| **AkarApp_LIVE** | `F:\akarpromax-office\AkarApp_LIVE` | WPF desktop application | ~100 files |
| **AkarApp_LIVE Copy** | `E:\Akarpromax new 2027\V 2.0 GPT - Copy\AkarApp_LIVE` | Desktop copy | ~100 files |

---

## V1.0 Directory Structure

```
E:\Akarpromax new 2027\V1.0\
├── src/                          # React Frontend
│   ├── api/                      # API client functions
│   ├── components/               # React components
│   │   ├── ui/                   # Shadcn UI primitives (55 files)
│   │   ├── arch/                 # Architectural engineering suite (40 files)
│   │   ├── chat/                 # Chat system (7 files)
│   │   ├── auctions/             # Auction UI (9 files)
│   │   ├── layout/               # Layout components (6 files)
│   │   └── ...                   # Other components
│   ├── config/                   # Configuration files
│   ├── contexts/                 # React contexts (10 files)
│   ├── data/                     # Static data and mocks
│   ├── generated/                # Generated files (Prisma client)
│   ├── hooks/                    # Custom hooks (13 files)
│   ├── lib/                      # Utilities and helpers (15 files)
│   ├── locales/                  # i18n translations (2 files)
│   ├── mocks/                    # MSW mock handlers
│   ├── pages/                    # Page components (117 files)
│   ├── services/                 # Client-side services (8 files)
│   ├── types/                    # TypeScript types
│   └── utils/                    # Utility functions
├── server/
│   ├── api/
│   │   ├── src/
│   │   │   ├── routes/           # API route handlers (28 files)
│   │   │   ├── services/         # Server services (4 files)
│   │   │   └── index.ts          # Main server entry (Express + Prisma + SQLite)
│   │   └── prisma/
│   │       └── schema.prisma     # Database schema (48 models, ~1315 lines)
│   └── chat-server.ts            # Socket.IO chat server (port 3008)
├── public/                       # Static assets
├── package.json                  # Dependencies
├── vite.config.ts                # Vite configuration
├── tailwind.config.ts            # Tailwind configuration
├── tsconfig.json                 # TypeScript configuration
└── index.html                    # Entry HTML
```

---

## Technology Stack

| Component | Technology | Version/Details |
|---|---|---|
| **Frontend Framework** | React | 18 |
| **Build Tool** | Vite | 5 |
| **CSS Framework** | TailwindCSS | 4 |
| **Routing** | Wouter | Client-side routing |
| **State Management** | React Query | Server state |
| **Backend Framework** | Express | 5 |
| **ORM** | Prisma | Client generation |
| **Database** | SQLite | Local dev.db |
| **Real-time** | Socket.IO | Chat server |
| **Authentication** | JWT | jsonwebtoken + bcryptjs |
| **i18n** | i18next | Arabic RTL + English LTR |
| **3D Rendering** | Three.js | React Three Fiber |
| **AI/ML** | ONNX Runtime | Tesseract.js OCR |
| **PDF Processing** | pdfjs-dist | jsPDF, pdf-lib |
| **Maps** | Leaflet | React Leaflet |
| **Payments** | Thawani + Tap | Oman gateways |
| **Push Notifications** | Web Push | VAPID |
| **PWA** | Service Worker | PWA support |
| **API Mocking** | MSW | Mock Service Worker |

---

## Server Architecture

### Main API Server
- **File:** `server/api/src/index.ts`
- **Port:** 3009
- **Stack:** Express 5 + Prisma + SQLite
- **Auth:** JWT (30-day expiry) + bcryptjs

### Chat Server
- **File:** `server/chat-server.ts`
- **Port:** 3008
- **Stack:** Socket.IO + raw SQLite
- **Encryption:** AES-256-GCM (server-side)

---

## Database Schema

- **File:** `server/api/prisma/schema.prisma`
- **Provider:** SQLite
- **Models:** 48 tables
- **Enums:** 1 (UserType)
- **Lines:** ~1315

---

## Key Configuration Files

| File | Purpose |
|---|---|
| `package.json` | Dependencies and scripts |
| `vite.config.ts` | Vite build configuration |
| `tailwind.config.ts` | Tailwind CSS configuration |
| `tsconfig.json` | TypeScript configuration |
| `index.html` | Entry HTML |
| `.env` | Environment variables |

---

## File Count Summary

| Category | Count |
|---|---|
| Frontend Pages | 117 |
| Frontend Components | 100+ |
| Engineering Components | 40 |
| Chat Components | 7 |
| Auction Components | 9 |
| Contexts | 10 |
| Hooks | 13 |
| Services | 8 |
| API Routes | 28 |
| Database Models | 48 |
| **Total Source Files** | **449** |

---

**Status:** COMPLETE  
**Application Source Files Modified:** ZERO
