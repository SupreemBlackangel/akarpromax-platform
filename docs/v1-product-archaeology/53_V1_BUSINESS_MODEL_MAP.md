# 53_V1_BUSINESS_MODEL_MAP.md
# V1 Business Model Map

**Audit Date:** 2026-08-19  
**Mode:** READ-ONLY — V1 Source Archaeology

---

## 1. Revenue Streams

### 1.1 Advertising

**Tables:** `ads`

**Revenue Model:**
- Ad placement fees
- Sponsor tier premiums
- Campaign budgets

**Fields:**
- price — Ad price
- sponsorTier — Premium tiers
- maxViews/maxClicks — Campaign limits

### 1.2 Subscriptions

**Tables:** `plans`, `user_subscriptions`

**Revenue Model:**
- Monthly/yearly subscription plans
- Feature gating

**Fields:**
- price, currency — Plan pricing
- duration, durationUnit — Subscription period
- features — JSON feature list

### 1.3 Software Licenses

**Tables:** `software_licenses`, `license_codes`

**Revenue Model:**
- Desktop software licenses
- Trial/subscription/perpetual

**Fields:**
- key — License key
- type (trial/subscription) — License type
- expiresAt — Expiration

### 1.4 Commissions

**Tables:** `commissions`, `marketing_contracts`

**Revenue Model:**
- Property sale commissions
- Marketer earnings

**Fields:**
- amount, percentage — Commission amount
- propertyPrice — Sale price
- saleDate — Sale date

### 1.5 Coupons

**Table:** `coupons`

**Revenue Model:**
- Promotional discounts
- Marketing campaigns

**Fields:**
- code — Coupon code
- discount, discountType — Discount value

---

## 2. Money Flow

### 2.1 Advertiser Flow

```
Advertiser
→ Creates ad campaign
→ Pays for placement
→ Ad displayed
→ Views/Clicks tracked
→ Campaign completes
```

### 2.2 Subscriber Flow

```
User
→ Selects plan
→ Pays subscription
→ Features unlocked
→ Subscription expires
→ Renewal prompt
```

### 2.3 License Flow

```
User
→ Purchases license
→ Receives license key
→ Activates on device
→ License validates
→ License expires
→ Renewal prompt
```

### 2.4 Marketer Flow

```
Marketer
→ Registers
→ Gets approved
→ Submits proposals
→ Gets contracts
→ Markets properties
→ Earns commission
→ Withdraws earnings
```

---

## 3. Pricing Models

### 3.1 Ad Pricing

- Per placement
- Per duration
- Per sponsor tier

### 3.2 Subscription Pricing

- Monthly plans
- Yearly plans (discount)
- Feature-based tiers

### 3.3 License Pricing

- Trial (free)
- Subscription (monthly/yearly)
- Perpetual (one-time)

### 3.4 Commission Pricing

- Percentage of sale
- Fixed amount
- Negotiated rate

---

## 4. Payment Gateways

### 4.1 Thawani

**Region:** Oman  
**Methods:** Cards  
**Integration:** `api/payments.ts`

### 4.2 Tap

**Region:** Middle East  
**Methods:** Cards  
**Integration:** `api/payments.ts`

---

## 5. Token System

### 5.1 Virtual Currency

**Field:** `users.tokenBalance`

**Purpose:** Microtransactions without per-transaction payments

**Earning:**
- Rewards
- Referrals
- Achievements

**Spending:**
- Premium features
- Boosted listings
- Priority placement

---

## 6. Summary

| Revenue Stream | Tables | Model |
|---|---|---|
| Advertising | ads | Placement fees, sponsor tiers |
| Subscriptions | plans, user_subscriptions | Monthly/yearly plans |
| Software Licenses | software_licenses, license_codes | Trial/subscription/perpetual |
| Commissions | commissions, marketing_contracts | Percentage of sales |
| Coupons | coupons | Promotional discounts |
| Tokens | users.tokenBalance | Virtual currency |

---

**Status:** COMPLETE  
**Application Source Files Modified:** ZERO
