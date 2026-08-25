# 09D — V1 ADMIN MEMBERSHIP FORENSIC REPORT

**Source:** `src/pages/AdminMembership.tsx` (544 lines)
**Classification:** WIRED (heaviest admin page — 14 API endpoints)
**Status:** Resolved — CRITICAL SECURITY FINDING

## Identity

| Field | Evidence |
|---|---|
| Route | `/admin/membership` |
| File | `src/pages/AdminMembership.tsx` |
| Lines | 544 |
| Auth | **CRITICAL: NO ADMIN AUTH CHECK.** Reads `token` from `useAuth()` at line 90, but NEVER checks `user.role`. Any authenticated user can access. |
| Uses Layout | Yes — wraps in `Layout` component |

## CRITICAL FINDING: No Role Guard

```typescript
// Line 90
const { user, token } = useAuth();

// Line 96-99 (early returns for loading state)
// NO role check anywhere in the component
```

Any user who is logged in can:
- Change other users' ranks and badges
- Ban/unban users
- Clear/extend subscriptions
- Create/delete promo codes
- Create/delete plan price overrides
- Modify free trial settings

## Data Models

```typescript
interface RankInfo { key: string; ar: string; en: string; emoji: string; color: string; }
interface BadgeInfo { key: string; ar: string; en: string; emoji: string; color: string; }
interface Catalog { ranks: RankInfo[]; professionalLadder: RankInfo[]; badges: BadgeInfo[]; officeTiers: RankInfo[]; }
interface AdminUserRow {
  id, fullName, email, phone, role, status, userType, officeName,
  rankLevel, academicBadge,
  subscriptionStatus, subscriptionTier, subscriptionAmount, subscriptionExpiryDate,
  lastPromotionDate
}
interface PromoCode { id, code, descriptions, discount_percent, fixed_amount, applies_to_tier, max_uses, used_count, valid_until, is_active }
interface PlanOverride { id, tier, override_amount, reason, valid_from, valid_until, is_active }
```

## API Endpoints (14 total)

### Reads (5)
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/admin/settings` | Free trial days setting |
| GET | `/admin/catalog/ranks` | Ranks/badges/tiers catalog |
| GET | `/admin/users` | All users list |
| GET | `/admin/promo-codes` | All promo codes |
| GET | `/admin/plan-overrides` | All plan overrides |

### Writes (9)
| Method | Endpoint | Purpose |
|---|---|---|
| PUT | `/admin/settings/free_trial_days` | Update free trial duration |
| PUT | `/admin/users/${id}/rank` | Change user's rank level |
| PUT | `/admin/users/${id}/rank` | Change user's academic badge (same endpoint, different body) |
| PUT | `/admin/users/${id}/status` | Ban/unban user |
| PUT | `/admin/users/${id}/subscription` | Clear or extend subscription |
| POST | `/admin/promo-codes` | Create new promo code |
| PUT | `/admin/promo-codes/${id}/toggle` | Toggle promo active state |
| DELETE | `/admin/promo-codes/${id}` | Delete promo code |
| POST | `/admin/plan-overrides` | Create plan price override |
| DELETE | `/admin/plan-overrides/${id}` | Delete plan override |

## UI Sections (3 tabs + header)

### Header: FreeTrialSetting
- Input for free trial days
- Save button → `PUT /admin/settings/free_trial_days`

### Tab 1: Users
- Search input
- Table columns: User (name+email), Type, Rank (select dropdown), Subscription (tier+status), Expires, Actions
- **Per-row actions:**
  - `+30d` button → extends subscription by 30 days (hardcoded)
  - `Clear` button → clears subscription
  - `Ban`/`Unban` button → changes status (ban has `confirm()` dialog)
  - Rank `<select>` → immediately calls `PUT /admin/users/${id}/rank`
  - Badge `<select>` → immediately calls `PUT /admin/users/${id}/rank` (with badge body)

### Tab 2: Promo Codes
- Create form: code, discount%, expiry, tier scope
- Table: Code, Discount, Tier, Uses/Max, Expires, Status, Delete
- Toggle active/inactive button
- Delete with `confirm()` dialog

### Tab 3: Plan Price Overrides
- Create form: tier select, override price, reason, expiry
- Table: Tier, Price, Reason, Expires, Delete
- Delete with `confirm()` dialog

## Hardcoded Constants

| Constant | Value | Location |
|---|---|---|
| Extend days | 30 | line 385 |
| Default subscription fallback | 100 SAR | line 385 |
| Default override price | 199 | line 219 |
| Default promo discount | 10% | line 186 |
| Tier options | basic, premium, full | lines 427-429, 488-490 |
| Expiring soon threshold | ≤7 days | line 320 |
| ms/day | 86400000 | line 249 |

## Backend Route Verification

The `PUT /admin/users/${id}/rank` endpoint in `server/api/src/routes/admin.ts` is a **STUB** — it returns success but does nothing:

```typescript
// admin.ts route
router.put("/users/:id/rank", requireAuth, requireRole("admin"), async (req, res) => {
  // Returns success without modifying anything
  res.json({ success: true });
});
```

So rank/badge changes on the frontend appear to succeed but have no backend effect.

## What This Page Reveals About V1's Membership Model

1. **Rank System:** Users have `rankLevel` (displayed via select dropdown with ranks from catalog)
2. **Badge System:** Users have `academicBadge` (phd/engineer/etc, from catalog)
3. **Subscription System:** Users have tier (basic/premium/full), amount, status, expiry date
4. **Promo Codes:** Discounts on plans, with tier scoping and usage limits
5. **Plan Overrides:** Per-tier price overrides (for special deals)
6. **Free Trial:** Configurable trial duration for new users
