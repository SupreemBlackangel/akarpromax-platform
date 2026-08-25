# 07_NOTIFICATIONS_EVENT_MODEL.md
# Notifications & Event Model

**Audit Date:** 2026-08-19  
**Mode:** READ-ONLY

---

## 1. V1 Notification System

### 1.1 Database Schema

#### Notifications Table
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  userId UUID REFERENCES users(id),
  type VARCHAR(100) NOT NULL,
  title VARCHAR(255),
  titleAr VARCHAR(255),
  body TEXT,
  bodyAr TEXT,
  link VARCHAR(500),
  isRead BOOLEAN DEFAULT false,
  createdAt TIMESTAMP DEFAULT NOW()
);
```

**Source:** `prisma/schema.prisma` `notifications` model

#### Push Subscriptions Table
```sql
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY,
  userId UUID REFERENCES users(id),
  endpoint VARCHAR(500),
  p256dh VARCHAR(255),
  auth VARCHAR(255),
  createdAt TIMESTAMP DEFAULT NOW()
);
```

**Source:** `prisma/schema.prisma` `push_subscriptions` model

#### Email Logs Table
```sql
CREATE TABLE email_logs (
  id UUID PRIMARY KEY,
  to VARCHAR(255),
  subject VARCHAR(255),
  body TEXT,
  status VARCHAR(50),
  createdAt TIMESTAMP DEFAULT NOW()
);
```

**Source:** `prisma/schema.prisma` `email_logs` model

### 1.2 Notification Types

| Type | Description | Channel |
|---|---|---|
| PROPERTY_LISTED | New property in interested city | Email + In-app |
| PROPERTY_APPROVED | Property approved | In-app |
| PROPERTY_REJECTED | Property rejected | In-app |
| INQUIRY_RECEIVED | New inquiry on property | Email + In-app |
| BID_RECEIVED | New bid on auction | Push + In-app |
| BID_OUTBID | Outbid on auction | Push + In-app |
| AUCTION_WON | Won auction | Push + In-app |
| AUCTION_ENDED | Auction ended | Push + In-app |
| MESSAGE_RECEIVED | New message | Push + In-app |
| VERIFICATION_APPROVED | Verification approved | Email + In-app |
| VERIFICATION_REJECTED | Verification rejected | Email + In-app |
| SUBSCRIPTION_EXPIRING | Subscription expiring | Email |
| PAYMENT_RECEIVED | Payment received | Email |

### 1.3 Notification Channels

| Channel | Implementation | Status |
|---|---|---|
| IN_APP | `notifications` table | FULL |
| EMAIL | `email_logs` table | FULL |
| WEB_PUSH | VAPID push | FULL |
| AKARPROMAX_OFFICE | Desktop sync | PARTIAL |

### 1.4 Notification Hooks

| Hook | File | Purpose |
|---|---|---|
| `usePushNotifications` | `usePushNotifications.ts` | Web Push subscription |

**Source:** `src/hooks/usePushNotifications.ts`

---

## 2. V2.0 Notification System

### 2.1 Database Schema

V2.0 has notifications via `notifications` table:

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  type VARCHAR(100) NOT NULL,
  title VARCHAR(255),
  title_ar VARCHAR(255),
  body TEXT,
  body_ar TEXT,
  link VARCHAR(500),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Source:** `lib/db/schema.ts` `notifications` table

### 2.2 Notification Types

| Type | Description | Channel |
|---|---|---|
| PROPERTY_MATCH | Property matches saved search | In-app |
| MESSAGE | New message | In-app |
| SYSTEM | System notification | In-app |

### 2.3 Notification Channels

| Channel | Implementation | Status |
|---|---|---|
| IN_APP | `notifications` table | FULL |
| EMAIL | MISSING | MISSING |
| WEB_PUSH | MISSING | MISSING |
| AKARPROMAX_OFFICE | MISSING | MISSING |

---

## 3. Recommended Event Architecture

### 3.1 Event Types

| Event | Description | Triggers |
|---|---|---|
| USER_REGISTERED | New user registered | Welcome email, notification |
| PROPERTY_SUBMITTED | Property submitted for review | Moderator notification |
| PROPERTY_APPROVED | Property approved | Owner notification |
| PROPERTY_MATCHED_SAVED_SEARCH | Property matches saved search | User notification |
| PROPERTY_INQUIRY | New inquiry on property | Owner notification |
| MESSAGE_SENT | New message | Recipient notification |
| SERVICE_REQUEST_CREATED | New service request | Provider notification |
| SERVICE_MATCHED | Service matched | User notification |
| OFFER_CREATED | New offer | User notification |
| JOB_COMPLETED | Job completed | User notification |
| REVIEW_CREATED | New review | User notification |
| VERIFICATION_APPROVED | Verification approved | User notification |
| RANK_CHANGED | Rank changed | User notification |
| AD_IMPRESSION | Ad impression | Analytics |
| AD_CLICK | Ad click | Analytics |
| OFFICE_RADAR_MATCH | Office radar match | Office notification |

### 3.2 Event-Driven Architecture

```
DOMAIN EVENT
→ NOTIFICATION RULE
→ RECIPIENT
→ CHANNEL
```

### 3.3 Notification Rules

| Rule | Event | Recipient | Channel |
|---|---|---|---|
| Property Listed | PROPERTY_SUBMITTED | Moderator | In-app |
| Property Approved | PROPERTY_APPROVED | Owner | Email + In-app |
| Property Match | PROPERTY_MATCHED_SAVED_SEARCH | User | Email + Push + In-app |
| Inquiry Received | PROPERTY_INQUIRY | Owner | Email + Push + In-app |
| Message Received | MESSAGE_SENT | Recipient | Push + In-app |
| Bid Received | BID_RECEIVED | Auction owner | Push + In-app |
| Outbid | BID_OUTBID | Bidder | Push + In-app |
| Auction Won | AUCTION_WON | Winner | Push + In-app |
| Verification Approved | VERIFICATION_APPROVED | User | Email + In-app |
| Subscription Expiring | SUBSCRIPTION_EXPIRING | User | Email |

---

## 4. V1 Gaps in V2.0

| Feature | V1 Status | V2.0 Status | Gap |
|---|---|---|---|
| In-app notifications | FULL | FULL | NONE |
| Email notifications | FULL | MISSING | CRITICAL |
| Web Push | FULL | MISSING | HIGH |
| Desktop notifications | FULL | MISSING | MEDIUM |
| City-matched notifications | FULL | MISSING | HIGH |
| Auction notifications | FULL | MISSING | HIGH |
| Verification notifications | FULL | MISSING | MEDIUM |
| Subscription notifications | FULL | MISSING | LOW |

---

**Status:** COMPLETE  
**Application Source Files Modified:** ZERO
