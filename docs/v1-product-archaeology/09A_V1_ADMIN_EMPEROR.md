# 09A — V1 ADMIN EMPEROR FORENSIC REPORT

**Source:** `src/pages/AdminEmperor.tsx` (370 lines)
**Classification:** WIRED (read-only dashboard)
**Status:** Resolved

## Identity

| Field | Evidence |
|---|---|
| Route | `/admin/emperor` |
| File | `src/pages/AdminEmperor.tsx` |
| Lines | 370 |
| Auth | Client-side: `if (!user \|\| user.role !== "admin") { navigate("/"); return null; }` at line 74 |
| Server Auth | NONE on frontend — depends on backend `GET /api/admin/emperor` having `requireRole("admin")` |
| Uses Layout | No — standalone `<div>` wrapper |

## Data Source

- **Single API:** `GET /api/admin/emperor` via `apiRequest` + `useQuery`
- **Auto-refresh:** `refetchInterval: 60_000` (60 seconds)
- **No mutations** — read-only dashboard

## UI Sections (5)

### 1. Live Counters
- `BigCounter` cards: totalUsers, totalProperties, totalOffices, totalInquiries, totalAuctions, totalServices, activeUsers, newToday
- 8 stat cards in a grid

### 2. Activity Logs
- Top categories bar chart (uses `topCategories` array from API)
- Recent service requests list
- Top specialties badge display

### 3. Conversion Tracking
- 4 stat boxes + conversion rate badge
- **Threshold logic:**
  - `≥5%` → "Excellent" (green)
  - `≥2%` → "Good" (yellow)
  - `<2%` → "Growing" (red)

### 4. User Retention
- 3 stats + 2 `GrowthBar` components + retention rate badge
- **Threshold logic:**
  - `≥40%` → "Very Strong" (green)
  - `≥20%` → "Good" (yellow)
  - `<20%` → "Launch Phase" (red)

### 5. Activation Insight
- 3 progress bars toward monetization thresholds
- **Hardcoded targets:**
  - `200 craftsmen`
  - `50 offices`
  - `500 total registered users`
- Each shows current count / target with percentage bar

## Actions

| Action | Type | Effect |
|---|---|---|
| Refresh | Button | `refetch()` — re-fetches dashboard data |

That is the ONLY user action. No create/update/delete.

## Hardcoded Constants

| Constant | Value | Location |
|---|---|---|
| Conversion: Excellent | ≥5% | line 259 |
| Conversion: Good | ≥2% | line 261 |
| Retention: Very Strong | ≥40% | line 303 |
| Retention: Good | ≥20% | line 305 |
| Craftsman target | 200 | line 329 |
| Office target | 50 | line 340 |
| Total user target | 500 | line 351 |
| Refresh interval | 60000ms | line 79 |

## Key Product Ideas

1. **Monetization readiness gates** — platform tracks when enough craftsmen/offices/users exist before activating monetization features
2. **Conversion funnel** — tracks how many registered users become active providers
3. **Retention analytics** — measures user stickiness
4. **Activity categorization** — top service categories reveal demand patterns

## What Is Unknown

- The `GET /api/admin/emperor` endpoint does NOT exist in the V1 server routes — it may be implemented in a route file not present in V1 source, or it may be a mock endpoint. The frontend code is fully wired but the backend may not serve real data.
