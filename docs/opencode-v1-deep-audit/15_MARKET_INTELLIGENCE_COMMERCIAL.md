# 15_MARKET_INTELLIGENCE_COMMERCIAL.md
# Market Intelligence & Commercial Audit

**Audit Date:** 2026-08-19  
**Mode:** READ-ONLY

---

## 1. V1 Market Intelligence

### 1.1 Market Reports

V1 had market data:

| Feature | Implementation | Evidence |
|---|---|---|
| Market history | Historical data | `MarketHistory.tsx` |
| Investment radar | Analysis tool | `InvestmentRadar.tsx` |
| Market rates | Exchange rates | `AdminMarketRates.tsx` |

### 1.2 API Endpoints

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/api/market-rates` | GET | Public | Exchange rates |
| `/api/market/history` | GET | Public | Market history |
| `/api/market/investment-radar` | GET | Public | Investment radar |

**Source:** `server/api/src/routes/market-rates.ts`

### 1.3 Features

| Feature | Implementation | Evidence |
|---|---|---|
| Exchange rates | 18+ currencies | `useCurrency.ts` |
| Market history | Historical data | `MarketHistory.tsx` |
| Investment radar | Analysis | `InvestmentRadar.tsx` |

---

## 2. V1 Commercial Features

### 2.1 Subscriptions

| Feature | Implementation | Evidence |
|---|---|---|
| Plans | CRUD | `AdminPlans.tsx` |
| User subscriptions | Full lifecycle | `user_subscriptions` table |
| Features | JSON features | `plans.features` |
| Targeting | User type targeting | `plans.targetType` |

### 2.2 Payments

| Feature | Implementation | Evidence |
|---|---|---|
| Thawani gateway | Full integration | `api/payments.ts` |
| Tap gateway | Full integration | `api/payments.ts` |
| Payment methods | 5 methods | `api/payments.ts` |
| Checkout sessions | Session creation | `api/payments.ts` |
| Verification | Payment verification | `api/payments.ts` |

### 2.3 Coupons

| Feature | Implementation | Evidence |
|---|---|---|
| Code generation | Auto-generated | `AdminDiscounts.tsx` |
| Discount types | Percentage/fixed | `coupons.discountType` |
| Usage limits | Per-coupon | `coupons.usageLimit` |
| Validation | Real-time | `api/payments.ts` |

### 2.4 Marketer Ecosystem

| Feature | Implementation | Evidence |
|---|---|---|
| Marketer profiles | Full CRUD | `marketer_profiles` table |
| Rank system | 5 ranks | `marketer_ranks` table |
| License numbers | Professional license | `marketer_profiles.licenseNumber` |
| Contracts | Full lifecycle | `marketing_contracts` table |
| Proposals | Submit/accept/reject | `marketing_proposals` table |
| Commissions | Track/claim | `commissions` table |
| Code of conduct | Version management | `code_of_conducts` table |

### 2.5 Affiliate/Referral

V1 had referral capabilities:

| Feature | Implementation | Evidence |
|---|---|---|
| Referral codes | User codes | `ref/:code` route |
| Tracking | Referral tracking | Server-side |
| Commissions | Referral commissions | `commissions` table |

---

## 3. V2.0 Commercial Features

### 3.1 Current State

V2.0 has NO commercial features:
- No subscriptions
- No payments
- No coupons
- No marketers
- No referral system

---

## 4. Recommended Architecture

### 4.1 Subscription Plans

| Plan | Price | Features |
|---|---|---|
| Free | 0 | Basic access |
| Basic | $9.99/mo | Enhanced features |
| Pro | $29.99/mo | Professional features |
| Enterprise | $99.99/mo | Full access |

### 4.2 Payment Gateways

| Gateway | Region | Methods |
|---|---|---|
| Stripe | Global | Cards, wallets |
| PayPal | Global | PayPal balance |
| Thawani | Oman | Cards |
| Tap | Middle East | Cards |

### 4.3 Marketer Tiers

| Tier | Requirements | Commission |
|---|---|---|
| Bronze | 0-10 properties | 2% |
| Silver | 11-50 properties | 3% |
| Gold | 51-100 properties | 4% |
| Platinum | 100+ properties | 5% |

---

## 5. V1 Commercial Features Missing in V2.0

| Feature | V1 Status | V2.0 Status | Gap |
|---|---|---|---|
| Subscription plans | FULL | MISSING | MEDIUM |
| User subscriptions | FULL | MISSING | MEDIUM |
| Thawani gateway | FULL | MISSING | MEDIUM |
| Tap gateway | FULL | MISSING | MEDIUM |
| Payment methods | FULL | MISSING | MEDIUM |
| Coupons | FULL | MISSING | LOW |
| Marketer profiles | FULL | MISSING | MEDIUM |
| Marketer ranks | FULL | MISSING | MEDIUM |
| Marketing contracts | FULL | MISSING | MEDIUM |
| Proposals | FULL | MISSING | MEDIUM |
| Commissions | FULL | MISSING | MEDIUM |
| Code of conduct | FULL | MISSING | LOW |
| Referral codes | FULL | MISSING | LOW |
| Investment radar | FULL | MISSING | LOW |
| Market history | FULL | MISSING | LOW |
| Market rates | FULL | FULL | NONE |

---

**Status:** COMPLETE  
**Application Source Files Modified:** ZERO
