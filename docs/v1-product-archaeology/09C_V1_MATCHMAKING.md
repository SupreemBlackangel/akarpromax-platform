# 09C — V1 ADMIN MATCHMAKING FORENSIC REPORT

**Source:** `src/pages/AdminMatchmaking.tsx` (138 lines)
**Classification:** WIRED (read + trigger)
**Status:** Resolved

## Identity

| Field | Evidence |
|---|---|
| Route | `/admin/matchmaking` |
| File | `src/pages/AdminMatchmaking.tsx` |
| Lines | 138 |
| Auth | Client-side: `if (!user \|\| user.role !== "admin") { navigate("/"); return null; }` at line 25 |
| Uses Layout | No — standalone `<div>` wrapper |

## What Matchmaking Actually Does

**Matchmaking matches USER PROPERTY REQUESTS to DEVELOPER PROPERTY PROJECTS.**

It is NOT about matching buyers to sellers, or users to services. It specifically:
1. Takes property requests (from buyers seeking properties)
2. Matches them against developer projects (construction projects being marketed)
3. Returns match counts per project

## Data Model

```typescript
interface Project {
  id: number;
  nameAr: string;
  city: string;
  projectType: "residential" | "commercial" | "mixed";
  priceFrom: number;
  matchCount: number;    // how many requests matched
  requestCount: number;  // how many requests exist in this area
  lastMatchedAt: string;
}
```

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/matchmaking/stats` | Dashboard stats: totalProjects, totalRequests, totalMatches, lastRun |
| POST | `/api/matchmaking/run/${projectId}` | Run matching for a single project |
| POST | `/api/matchmaking/run-all` | Run matching for all projects |

## UI Sections

1. **Header:** Title + Refresh button + "Run Full Matching" button
2. **Stat Cards (4):** Total Projects, Total Requests, Total Matches, Last Run timestamp
3. **Active Projects Grid:** Cards showing each project with:
   - Project name (Arabic)
   - City
   - Type badge (residential/commercial/mixed)
   - Price from
   - Match count / Request count
   - Last matched date
   - Per-project "Run" button

## Actions

| Action | Effect |
|---|---|
| Refresh | `refetch()` — reload stats and project list |
| Run Full Matching | `POST /api/matchmaking/run-all` — triggers server-side matching algorithm |
| Run (per project) | `POST /api/matchmaking/run/${projectId}` — triggers matching for one project |

All buttons disable during pending mutations.

## Project Type Labels

| Key | Arabic | English |
|---|---|---|
| residential | سكني | Residential |
| commercial | تجاري | Commercial |
| mixed | مختلط | Mixed |

## What Is Unknown

- The actual matching algorithm (server-side, not visible in frontend)
- The `GET /api/matchmaking/stats` and `POST /api/matchmaking/run/*` endpoints are NOT in the V1 server routes — they may be stubs or in a missing route file
- How requests are matched to projects (geo? price range? property type?)
