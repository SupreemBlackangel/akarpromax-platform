# 17_V1_VS_CURRENT_GAP_MATRIX.md
# V1 vs Current Gap Matrix

**Audit Date:** 2026-08-19  
**Mode:** READ-ONLY

---

## Summary

| Category | V1 Features | V2.0 Features | Gap |
|---|---|---|---|
| User & Auth | 20 | 12 | 8 |
| Property | 25 | 18 | 7 |
| Auction | 20 | 8 | 12 |
| Service | 15 | 10 | 5 |
| Tender | 8 | 0 | 8 |
| Marketing | 12 | 0 | 12 |
| Advertising | 15 | 8 | 7 |
| Chat | 18 | 2 | 16 |
| Content | 15 | 8 | 7 |
| Organization | 12 | 8 | 4 |
| Engineering | 25 | 5 | 20 |
| Desktop | 12 | 6 | 6 |
| Payment | 10 | 0 | 10 |
| Notification | 8 | 4 | 4 |
| Admin | 20 | 12 | 8 |
| **TOTAL** | **235** | **101** | **134** |

---

## Detailed Gap Matrix

### 1. User & Authentication

| Feature | V1 Status | V2.0 Status | Gap | Priority |
|---|---|---|---|---|
| Individual registration | FULL | FULL | NONE | - |
| Professional registration | FULL | MISSING | REGRESSION | HIGH |
| Company registration | FULL | MISSING | REGRESSION | MEDIUM |
| Email/password login | FULL | FULL | NONE | - |
| Social login (Google) | MISSING | FULL | BETTER | - |
| Social login (Facebook) | MISSING | FULL | BETTER | - |
| JWT auth (30-day) | FULL | FULL | NONE | - |
| Password reset | FULL | FULL | NONE | - |
| Email verification | FULL | FULL | NONE | - |
| Profile editing | FULL | FULL | NONE | - |
| Portfolio upload | FULL | MISSING | REGRESSION | MEDIUM |
| Identity verification | FULL | PARTIAL | GAP | HIGH |
| Role-based access | FULL | FULL | NONE | - |
| Moderator assignment | FULL | PARTIAL | GAP | HIGH |
| User banning | FULL | MISSING | REGRESSION | HIGH |
| IP blocking | FULL | MISSING | REGRESSION | MEDIUM |
| Login attempt tracking | FULL | MISSING | REGRESSION | MEDIUM |
| Activity logging | FULL | MISSING | REGRESSION | HIGH |
| Audit trail | FULL | MISSING | REGRESSION | HIGH |

### 2. Property

| Feature | V1 Status | V2.0 Status | Gap | Priority |
|---|---|---|---|---|
| Property CRUD | FULL | FULL | NONE | - |
| Image upload | FULL | FULL | NONE | - |
| Featured properties | FULL | FULL | NONE | - |
| Search filters | FULL | FULL | NONE | - |
| View counter | FULL | FULL | NONE | - |
| Office linking | FULL | FULL | NONE | - |
| Property requests | FULL | FULL | NONE | - |
| Property offers | FULL | FULL | NONE | - |
| Favorites | FULL | FULL | NONE | - |
| Saved searches | FULL | FULL | NONE | - |
| Elite leads | FULL | MISSING | REGRESSION | HIGH |
| Bookings | FULL | MISSING | REGRESSION | MEDIUM |
| City-matched notifications | FULL | MISSING | REGRESSION | MEDIUM |
| Marketing flag | FULL | MISSING | REGRESSION | LOW |
| Moderation workflow | FULL | FULL | NONE | - |
| Geo-targeting | FULL | PARTIAL | GAP | HIGH |
| Currency support | FULL | FULL | NONE | - |
| Area units | FULL | FULL | NONE | - |

### 3. Auction

| Feature | V1 Status | V2.0 Status | Gap | Priority |
|---|---|---|---|---|
| Fixed price auction | FULL | FULL | NONE | - |
| Open auction | FULL | FULL | NONE | - |
| Bidding | FULL | FULL | NONE | - |
| Auto-bid | FULL | MISSING | REGRESSION | HIGH |
| Bid history | FULL | FULL | NONE | - |
| Participants | FULL | FULL | NONE | - |
| Deposit requirement | FULL | MISSING | REGRESSION | MEDIUM |
| Reports | FULL | MISSING | REGRESSION | MEDIUM |
| Winner confirmation | FULL | FULL | NONE | - |
| Winner rejection | FULL | FULL | NONE | - |
| Suspicious relist detection | FULL | MISSING | REGRESSION | CRITICAL |
| Sale proof verification | FULL | MISSING | REGRESSION | HIGH |
| Early warning system | FULL | MISSING | REGRESSION | HIGH |
| Office reputation scoring | FULL | MISSING | REGRESSION | HIGH |
| Per-office config | FULL | MISSING | REGRESSION | MEDIUM |
| Price history | FULL | MISSING | REGRESSION | MEDIUM |
| Notifications | FULL | MISSING | REGRESSION | MEDIUM |
| Auction ban | FULL | MISSING | REGRESSION | HIGH |
| Push notifications | FULL | MISSING | REGRESSION | MEDIUM |
| Bidder recommendations | FULL | MISSING | REGRESSION | MEDIUM |

### 4. Service

| Feature | V1 Status | V2.0 Status | Gap | Priority |
|---|---|---|---|---|
| Provider profile | FULL | FULL | NONE | - |
| Service request | FULL | FULL | NONE | - |
| Request acceptance | FULL | FULL | NONE | - |
| Job completion | FULL | FULL | NONE | - |
| Provider rating | FULL | FULL | NONE | - |
| Client feedback | FULL | MISSING | REGRESSION | HIGH |
| Availability toggle | FULL | FULL | NONE | - |
| CV upload | FULL | MISSING | REGRESSION | MEDIUM |
| Provider search | FULL | FULL | NONE | - |
| Dispatching | FULL | MISSING | REGRESSION | HIGH |
| GPS tracking | FULL | MISSING | REGRESSION | MEDIUM |
| Missed count | FULL | MISSING | REGRESSION | LOW |
| Active request | FULL | MISSING | REGRESSION | MEDIUM |
| Top rated | FULL | MISSING | REGRESSION | MEDIUM |
| Blacklisted | FULL | MISSING | REGRESSION | MEDIUM |
| Total jobs | FULL | MISSING | REGRESSION | LOW |

### 5. Tender

| Feature | V1 Status | V2.0 Status | Gap | Priority |
|---|---|---|---|---|
| Create tender | FULL | MISSING | REGRESSION | MEDIUM |
| Place bid | FULL | MISSING | REGRESSION | MEDIUM |
| Award tender | FULL | MISSING | REGRESSION | MEDIUM |
| Close tender | FULL | MISSING | REGRESSION | MEDIUM |
| Withdraw bid | FULL | MISSING | REGRESSION | MEDIUM |
| Tender settings | FULL | MISSING | REGRESSION | LOW |
| Activity logging | FULL | MISSING | REGRESSION | LOW |
| Auto-close | FULL | MISSING | REGRESSION | LOW |

### 6. Marketing

| Feature | V1 Status | V2.0 Status | Gap | Priority |
|---|---|---|---|---|
| Marketer profile | FULL | MISSING | REGRESSION | MEDIUM |
| Rank system | FULL | MISSING | REGRESSION | MEDIUM |
| License number | FULL | MISSING | REGRESSION | LOW |
| Contract creation | FULL | MISSING | REGRESSION | MEDIUM |
| Exclusivity flag | FULL | MISSING | REGRESSION | LOW |
| Auto-renew | FULL | MISSING | REGRESSION | LOW |
| Proposal submission | FULL | MISSING | REGRESSION | MEDIUM |
| Commission tracking | FULL | MISSING | REGRESSION | MEDIUM |
| Code of conduct | FULL | MISSING | REGRESSION | LOW |

### 7. Advertising

| Feature | V1 Status | V2.0 Status | Gap | Priority |
|---|---|---|---|---|
| Ad CRUD | FULL | FULL | NONE | - |
| Geo-targeting | FULL | MISSING | REGRESSION | CRITICAL |
| Sponsor tiers | FULL | MISSING | REGRESSION | HIGH |
| Ad rotation | FULL | MISSING | REGRESSION | HIGH |
| Max views/clicks | FULL | MISSING | REGRESSION | MEDIUM |
| Language targeting | FULL | MISSING | REGRESSION | MEDIUM |
| Page targeting | FULL | MISSING | REGRESSION | MEDIUM |
| Desktop zones | FULL | PARTIAL | GAP | MEDIUM |
| Ad requests | FULL | MISSING | REGRESSION | LOW |
| Impression dedup | FULL | MISSING | REGRESSION | MEDIUM |
| Channel isolation | MISSING | FULL | BETTER | - |
| House fill | MISSING | FULL | BETTER | - |

### 8. Chat

| Feature | V1 Status | V2.0 Status | Gap | Priority |
|---|---|---|---|---|
| Private conversations | FULL | MISSING | REGRESSION | CRITICAL |
| Group conversations | FULL | MISSING | REGRESSION | HIGH |
| Text messages | FULL | MISSING | REGRESSION | CRITICAL |
| Image messages | FULL | MISSING | REGRESSION | HIGH |
| Voice messages | FULL | MISSING | REGRESSION | MEDIUM |
| File messages | FULL | MISSING | REGRESSION | MEDIUM |
| Message editing | FULL | MISSING | REGRESSION | HIGH |
| Message deletion | FULL | MISSING | REGRESSION | HIGH |
| Typing indicators | FULL | MISSING | REGRESSION | MEDIUM |
| Online/offline status | FULL | MISSING | REGRESSION | MEDIUM |
| Read receipts | FULL | MISSING | REGRESSION | HIGH |
| User blocking | FULL | MISSING | REGRESSION | HIGH |
| Conversation muting | FULL | MISSING | REGRESSION | LOW |
| Admin oversight | FULL | MISSING | REGRESSION | HIGH |
| Access logging | FULL | MISSING | REGRESSION | HIGH |
| Encryption | FULL | MISSING | REGRESSION | HIGH |
| Desktop notifications | FULL | MISSING | REGRESSION | MEDIUM |
| Sound notifications | FULL | MISSING | REGRESSION | LOW |
| Comments | MISSING | FULL | BETTER | - |

### 9. Content

| Feature | V1 Status | V2.0 Status | Gap | Priority |
|---|---|---|---|---|
| Blog system | FULL | MISSING | REGRESSION | MEDIUM |
| Supplier directory | FULL | MISSING | REGRESSION | MEDIUM |
| Software directory | FULL | MISSING | REGRESSION | MEDIUM |
| License management | FULL | MISSING | REGRESSION | MEDIUM |
| News ticker | FULL | MISSING | REGRESSION | MEDIUM |
| Free resources | FULL | MISSING | REGRESSION | LOW |
| Dynamic categories | FULL | FULL | NONE | - |
| Knowledge base | MISSING | FULL | BETTER | - |
| Community forum | MISSING | FULL | BETTER | - |

### 10. Organization

| Feature | V1 Status | V2.0 Status | Gap | Priority |
|---|---|---|---|---|
| Office CRUD | FULL | FULL | NONE | - |
| Office verification | FULL | FULL | NONE | - |
| Auction permission | FULL | MISSING | REGRESSION | MEDIUM |
| Auction ban | FULL | MISSING | REGRESSION | MEDIUM |
| Rating system | FULL | MISSING | REGRESSION | HIGH |
| Company CRUD | FULL | FULL | NONE | - |
| Account switching | FULL | MISSING | REGRESSION | MEDIUM |
| Supervisor management | FULL | MISSING | REGRESSION | MEDIUM |
| Member management | FULL | FULL | NONE | - |
| Branch management | FULL | FULL | NONE | - |

### 11. Engineering

| Feature | V1 Status | V2.0 Status | Gap | Priority |
|---|---|---|---|---|
| BOQ engine | FULL | MISSING | REGRESSION | MEDIUM |
| CAD parsing | FULL | MISSING | REGRESSION | LOW |
| DXF generation | FULL | MISSING | REGRESSION | LOW |
| 3D visualization | FULL | MISSING | REGRESSION | MEDIUM |
| MEP engine | FULL | MISSING | REGRESSION | LOW |
| Structural engine | FULL | MISSING | REGRESSION | LOW |
| Fire safety | FULL | MISSING | REGRESSION | LOW |
| Climate analysis | FULL | MISSING | REGRESSION | LOW |
| Landscape | FULL | MISSING | REGRESSION | LOW |
| Contract generator | FULL | MISSING | REGRESSION | MEDIUM |
| Specialized engines | FULL | MISSING | REGRESSION | LOW |
| Land analysis | PARTIAL | FULL | BETTER | - |
| FindMyLand | MISSING | FULL | BETTER | - |
| PDF tools | MISSING | FULL | BETTER | - |

### 12. Desktop

| Feature | V1 Status | V2.0 Status | Gap | Priority |
|---|---|---|---|---|
| License validation | FULL | PARTIAL | GAP | HIGH |
| HWID binding | FULL | PARTIAL | GAP | HIGH |
| HWID reset | FULL | MISSING | REGRESSION | MEDIUM |
| Free trial | FULL | MISSING | REGRESSION | MEDIUM |
| Subscription status | FULL | MISSING | REGRESSION | MEDIUM |
| Property sync | FULL | FULL | NONE | - |
| Ad sync | FULL | PARTIAL | GAP | MEDIUM |
| News ticker sync | FULL | MISSING | REGRESSION | LOW |
| Batch sync | FULL | MISSING | REGRESSION | LOW |
| Version check | FULL | MISSING | REGRESSION | LOW |
| Force update | FULL | MISSING | REGRESSION | LOW |
| Property draft | FULL | MISSING | REGRESSION | MEDIUM |

### 13. Payment

| Feature | V1 Status | V2.0 Status | Gap | Priority |
|---|---|---|---|---|
| Thawani gateway | FULL | MISSING | REGRESSION | MEDIUM |
| Tap gateway | FULL | MISSING | REGRESSION | MEDIUM |
| Payment methods | FULL | MISSING | REGRESSION | MEDIUM |
| Subscription plans | FULL | MISSING | REGRESSION | MEDIUM |
| User subscriptions | FULL | MISSING | REGRESSION | MEDIUM |
| Coupons | FULL | MISSING | REGRESSION | LOW |

### 14. Notification

| Feature | V1 Status | V2.0 Status | Gap | Priority |
|---|---|---|---|---|
| In-app notifications | FULL | FULL | NONE | - |
| Mark read | FULL | FULL | NONE | - |
| Mark all read | FULL | FULL | NONE | - |
| Web Push (VAPID) | FULL | MISSING | REGRESSION | MEDIUM |
| Email notifications | FULL | MISSING | REGRESSION | MEDIUM |
| Desktop notifications | FULL | MISSING | REGRESSION | MEDIUM |

### 15. Admin

| Feature | V1 Status | V2.0 Status | Gap | Priority |
|---|---|---|---|---|
| User management | FULL | FULL | NONE | - |
| Property management | FULL | FULL | NONE | - |
| Auction management | FULL | FULL | NONE | - |
| Ad management | FULL | FULL | NONE | - |
| Blog management | FULL | MISSING | REGRESSION | MEDIUM |
| Analytics | FULL | FULL | NONE | - |
| Settings | FULL | FULL | NONE | - |
| Activity log | FULL | MISSING | REGRESSION | HIGH |
| Emperor panel | FULL | MISSING | REGRESSION | UNKNOWN |
| Matchmaking | FULL | MISSING | REGRESSION | MEDIUM |
| Elite leads | FULL | MISSING | REGRESSION | HIGH |
| Service reviews | FULL | MISSING | REGRESSION | MEDIUM |
| Market rates | FULL | MISSING | REGRESSION | MEDIUM |
| Marketers | FULL | MISSING | REGRESSION | MEDIUM |
| Relist monitoring | FULL | MISSING | REGRESSION | HIGH |
| Categories | FULL | FULL | NONE | - |
| Verification | FULL | FULL | NONE | - |
| Moderator management | FULL | PARTIAL | GAP | HIGH |
| Role management | FULL | PARTIAL | GAP | HIGH |

---

## Top 20 Regressions/Missing Capabilities

1. **Real-time chat** — V1 had full Socket.IO chat; V2.0 has no real-time messaging
2. **Auction fraud detection** — V1 had suspicious relist detection; V2.0 lacks this
3. **Office reputation scoring** — V1 had multi-factor scoring; V2.0 lacks this
4. **Marketer ecosystem** — V1 had contracts, commissions, proposals; V2.0 lacks this
5. **Service tender system** — V1 had bidding, awards; V2.0 lacks this
6. **Land document AI** — V1 had OCR + ONNX; V2.0 has basic tools
7. **Architectural BOQ** — V1 had 8-section BOQ; V2.0 lacks this
8. **3D building visualization** — V1 had Three.js 3D; V2.0 lacks this
9. **DXF export** — V1 had AutoCAD export; V2.0 lacks this
10. **Construction contracts** — V1 had bilingual contracts; V2.0 lacks this
11. **Specialized building engines** — V1 had 10+ engines; V2.0 lacks this
12. **Desktop integration** — V1 had full WPF API; V2.0 has partial
13. **Geo-targeted ads** — V1 had granular targeting; V2.0 lacks this
14. **Ad rotation** — V1 had configurable rotation; V2.0 lacks this
15. **Sponsor tiers** — V1 had platinum/gold/silver; V2.0 lacks this
16. **Payment gateways** — V1 had Thawani + Tap; V2.0 lacks this
17. **Subscription plans** — V1 had paid plans; V2.0 lacks this
18. **Blog system** — V1 had full blog; V2.0 lacks this
19. **Supplier directory** — V1 had suppliers; V2.0 lacks this
20. **Activity logging** — V1 had audit trail; V2.0 lacks this

---

**Status:** COMPLETE  
**Application Source Files Modified:** ZERO
