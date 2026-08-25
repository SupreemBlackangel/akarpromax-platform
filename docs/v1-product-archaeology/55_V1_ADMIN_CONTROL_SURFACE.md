# 55_V1_ADMIN_CONTROL_SURFACE.md
# V1 Admin Control Surface

**Audit Date:** 2026-08-19  
**Mode:** READ-ONLY — V1 Source Archaeology

---

## Overview

This document answers: What could the owner/admin control without modifying code?

---

## 1. User Management

**Page:** `AdminUsers.tsx`

**Controls:**
- View all users
- Approve/reject users
- Ban/unban users
- Change user roles
- Change user status
- Manage subscriptions
- Manual activation
- Generate API keys

---

## 2. Property Management

**Page:** `AdminProperties.tsx`

**Controls:**
- View all properties
- Approve/reject properties
- Toggle featured
- Delete properties
- View analytics

---

## 3. Auction Management

**Page:** `AdminAuctions.tsx`

**Controls:**
- View all auctions
- Suspend/unsuspend auctions
- Extend deadlines
- Resolve reports
- Block participants

---

## 4. Ad Management

**Page:** `AdminAds.tsx`

**Controls:**
- View all ads
- Create/update/delete ads
- Activate/deactivate ads
- Set geo-targeting
- Set sponsor tiers
- Set rotation/limits

---

## 5. Moderator Management

**Page:** `AdminModerators.tsx`

**Controls:**
- View all moderators
- Add/remove moderators
- Assign roles

---

## 6. Verification Management

**Page:** `AdminVerification.tsx`

**Controls:**
- View verification queue
- Approve/reject verifications
- Set rejection reasons

---

## 7. Content Management

### 7.1 Blog

**Page:** `AdminBlog.tsx`

**Controls:**
- Create/update/delete posts
- Publish/unpublish
- Set categories

### 7.2 News Ticker

**Page:** `AdminNewsTicker.tsx`

**Controls:**
- Create/update/delete news items
- Set target pages
- Enable/disable

### 7.3 Categories

**Page:** `AdminCategories.tsx`

**Controls:**
- Create/update/delete categories
- Set icons, colors

---

## 8. Financial Management

### 8.1 Plans

**Page:** `AdminPlans.tsx`

**Controls:**
- Create/update/delete plans
- Set pricing
- Set features

### 8.2 Coupons

**Page:** `AdminDiscounts.tsx`

**Controls:**
- Create/update/delete coupons
- Set discounts
- Set usage limits

### 8.3 Payments

**Page:** `AdminPayments.tsx`

**Controls:**
- View payments
- Manage payment methods

---

## 9. License Management

### 9.1 Software Licenses

**Page:** `AdminSoftwareLicenses.tsx`

**Controls:**
- View all licenses
- Create/revoke licenses
- Reset HWID

### 9.2 License Keys

**Page:** `AdminLicenseKeys.tsx`

**Controls:**
- View all keys
- Generate keys
- Track usage

---

## 10. Analytics

**Page:** `AdminAnalytics.tsx`

**Controls:**
- View dashboard statistics
- View user analytics
- View property analytics
- View ad analytics

---

## 11. Settings

**Page:** `AdminSettings.tsx`

**Controls:**
- Platform settings
- Feature toggles
- Configuration

---

## 12. Specialized Pages

### 12.1 Emperor Panel

**Page:** `AdminEmperor.tsx`

**Purpose:** Unknown — needs investigation

### 12.2 Elite Leads

**Page:** `AdminEliteLeads.tsx`

**Controls:**
- View high-value leads
- Manage leads

### 12.3 Matchmaking

**Page:** `AdminMatchmaking.tsx`

**Controls:**
- Property matchmaking
- Match properties with requests

### 12.4 Membership

**Page:** `AdminMembership.tsx`

**Controls:**
- Manage memberships
- Manage subscriptions

### 12.5 Market Rates

**Page:** `AdminMarketRates.tsx`

**Controls:**
- Manage market rates
- Exchange rates

### 12.6 Marketers

**Page:** `AdminMarketers.tsx`

**Controls:**
- View all marketers
- Approve/reject marketers
- Manage ranks

### 12.7 Relist Monitoring

**Page:** `AdminRelistMonitoring.tsx`

**Controls:**
- View suspicious relists
- Review proofs
- Resolve cases

### 12.8 Service Reviews

**Page:** `AdminServiceReviews.tsx`

**Controls:**
- View service reviews
- Manage reviews

---

## 13. Summary

| Domain | Admin Control |
|---|---|
| Users | Approve, ban, role changes, subscriptions |
| Properties | Approve, reject, feature, delete |
| Auctions | Suspend, extend, resolve reports |
| Ads | CRUD, targeting, tiers, limits |
| Moderators | Add, remove, assign roles |
| Verification | Approve, reject |
| Content | Blog, news, categories |
| Financial | Plans, coupons, payments |
| Licenses | Create, revoke, reset HWID |
| Analytics | Dashboard, statistics |
| Settings | Platform configuration |

---

**Status:** COMPLETE  
**Application Source Files Modified:** ZERO
