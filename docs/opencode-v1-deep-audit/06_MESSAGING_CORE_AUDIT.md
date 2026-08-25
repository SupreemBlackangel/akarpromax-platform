# 06_MESSAGING_CORE_AUDIT.md
# Messaging Core Audit

**Audit Date:** 2026-08-19  
**Mode:** READ-ONLY

---

## 1. V1 Messaging System

### 1.1 Architecture

V1 had a dedicated real-time chat server:

| Component | Technology | Port |
|---|---|---|
| Chat Server | Socket.IO | 3008 |
| Database | SQLite (raw SQL) | Separate from main DB |
| Encryption | AES-256-GCM | Server-side |

**Source:** `server/chat-server.ts`

### 1.2 Database Schema

#### Conversations Table
```sql
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  type TEXT DEFAULT 'private',
  name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Conversation Participants Table
```sql
CREATE TABLE conversation_participants (
  id TEXT PRIMARY KEY,
  conversation_id TEXT REFERENCES conversations(id),
  user_id TEXT REFERENCES users(id),
  role TEXT DEFAULT 'member',
  last_read_at DATETIME,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Messages Table
```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT REFERENCES conversations(id),
  sender_id TEXT REFERENCES users(id),
  content TEXT,
  type TEXT DEFAULT 'text',
  iv TEXT,
  edited_at DATETIME,
  deleted_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Message Read Receipts Table
```sql
CREATE TABLE message_read_receipts (
  id TEXT PRIMARY KEY,
  message_id TEXT REFERENCES messages(id),
  user_id TEXT REFERENCES users(id),
  read_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Moderation Requests Table
```sql
CREATE TABLE moderation_requests (
  id TEXT PRIMARY KEY,
  conversation_id TEXT REFERENCES conversations(id),
  requested_by TEXT REFERENCES users(id),
  reason TEXT,
  status TEXT DEFAULT 'pending',
  resolved_by TEXT REFERENCES users(id),
  resolved_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Moderation Access Logs Table
```sql
CREATE TABLE moderation_access_logs (
  id TEXT PRIMARY KEY,
  moderator_id TEXT REFERENCES users(id),
  conversation_id TEXT REFERENCES conversations(id),
  reason TEXT,
  accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Blocked Users Table
```sql
CREATE TABLE blocked_users (
  id TEXT PRIMARY KEY,
  blocker_id TEXT REFERENCES users(id),
  blocked_id TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Source:** `server/chat-server.ts` lines 50-150

### 1.3 Features

| Feature | Implementation | Evidence |
|---|---|---|
| Private conversations | Socket.IO rooms | `chat-server.ts` |
| Group conversations | Socket.IO rooms | `chat-server.ts` |
| Text messages | Socket.IO events | `chat-server.ts` |
| Image messages | File upload + Socket.IO | `chat-server.ts` |
| Voice messages | Audio recording + Socket.IO | `chat-server.ts` |
| File messages | File upload + Socket.IO | `chat-server.ts` |
| Message editing | Socket.IO events | `chat-server.ts` |
| Message deletion | Soft delete | `chat-server.ts` |
| Typing indicators | Socket.IO events | `chat-server.ts` |
| Online/offline status | Socket.IO presence | `chat-server.ts` |
| Read receipts | Database tracking | `message_read_receipts` table |
| User blocking | Database tracking | `blocked_users` table |
| Conversation muting | Client-side | `ChatContext.tsx` |
| Admin oversight | Moderation requests | `moderation_requests` table |
| Access logging | Database tracking | `moderation_access_logs` table |
| Desktop notifications | Browser API | `ChatWidget.tsx` |
| Sound notifications | Audio playback | `useRingtone.ts` |
| Pagination | Load older messages | `chat-server.ts` |

### 1.4 Encryption

V1 implemented AES-256-GCM encryption:

| Parameter | Value |
|---|---|
| Algorithm | AES-256-GCM |
| Key derivation | scrypt |
| Key source | `ENC_KEY` environment variable |
| Salt | `ENC_SALT` environment variable |
| IV | Random per message |
| Storage | IV stored in `iv` column |

**Source:** `server/chat-server.ts` lines 200-250

### 1.5 Chat Components

| Component | File | Purpose |
|---|---|---|
| ChatWidget | `ChatWidget.tsx` | Main chat widget |
| ChatApp | `ChatApp.tsx` | Chat application |
| ChatWindow | `ChatWindow.tsx` | Chat window |
| ChatList | `ChatList.tsx` | Conversation list |
| ChatInput | `ChatInput.tsx` | Message input |
| MessageBubble | `MessageBubble.tsx` | Message display |
| VoiceRecorder | `VoiceRecorder.tsx` | Voice recording |

**Source:** `src/components/chat/`

---

## 2. V2.0 Messaging System

### 2.1 Current State

V2.0 has NO real-time messaging system. The only messaging-related feature is:

| Feature | Implementation | Evidence |
|---|---|---|
| Comments | REST API | `app/api/properties/[id]/comments/route.ts` |
| StartThreadButton | UI component | `src/components/services/StartThreadButton.tsx` |

### 2.2 Comments System

V2.0 has a basic comments system:

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/properties/[id]/comments` | GET | List comments |
| `/api/properties/[id]/comments` | POST | Add comment |

**Source:** `app/api/properties/[id]/comments/route.ts`

### 2.3 StartThreadButton

V2.0 has a `StartThreadButton` component for starting conversations:

| Prop | Type | Purpose |
|---|---|---|
| propertyId | string | Property ID |
| recipientId | string | Recipient user ID |

**Source:** `src/components/services/StartThreadButton.tsx`

---

## 3. Critical Differences

### 3.1 V1 Had Full Real-Time Chat

V1 had a complete Socket.IO chat system with:
- Private and group conversations
- Text, image, voice, and file messages
- Message editing and deletion
- Typing indicators
- Online/offline status
- Read receipts
- User blocking
- Conversation muting
- Admin oversight
- AES-256-GCM encryption

### 3.2 V2.0 Has No Real-Time Messaging

V2.0 has only:
- Basic comments on properties
- A "Start Thread" button (not implemented)

### 3.3 V1 Had Chat Moderation

V1 had a moderation system for chat:
- Moderators could request access to conversations
- All access was logged
- Moderation requests could be approved/rejected

### 3.4 V2.0 Lacks Chat Moderation

V2.0 has no chat moderation system.

---

## 4. Recommended Final Messaging Core

### 4.1 Database Schema

#### Threads Table
```sql
CREATE TABLE threads (
  id UUID PRIMARY KEY,
  context_type VARCHAR(50), -- property/service/organization/general
  context_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Thread Participants Table
```sql
CREATE TABLE thread_participants (
  id UUID PRIMARY KEY,
  thread_id UUID REFERENCES threads(id),
  user_id UUID REFERENCES users(id),
  role VARCHAR(50) DEFAULT 'member',
  last_read_at TIMESTAMP,
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(thread_id, user_id)
);
```

#### Messages Table
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  thread_id UUID REFERENCES threads(id),
  sender_id UUID REFERENCES users(id),
  content TEXT,
  message_type VARCHAR(50) DEFAULT 'text',
  edited_at TIMESTAMP,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Message Attachments Table
```sql
CREATE TABLE message_attachments (
  id UUID PRIMARY KEY,
  message_id UUID REFERENCES messages(id),
  file_url VARCHAR(500),
  file_type VARCHAR(50),
  file_size INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Message Read States Table
```sql
CREATE TABLE message_read_states (
  id UUID PRIMARY KEY,
  message_id UUID REFERENCES messages(id),
  user_id UUID REFERENCES users(id),
  read_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);
```

#### Message Reports Table
```sql
CREATE TABLE message_reports (
  id UUID PRIMARY KEY,
  message_id UUID REFERENCES messages(id),
  reporter_id UUID REFERENCES users(id),
  reason TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 4.2 Features

| Feature | Priority | Description |
|---|---|---|
| Inbox | HIGH | Unified message inbox |
| Real-time | HIGH | Socket.IO real-time messaging |
| Unread | HIGH | Unread message tracking |
| Read receipts | HIGH | Message read confirmation |
| Typing | MEDIUM | Typing indicators |
| Attachments | MEDIUM | File/image attachments |
| Archive | LOW | Conversation archiving |
| Mute | LOW | Conversation muting |
| Block | HIGH | User blocking |
| Report | HIGH | Message reporting |
| Search | MEDIUM | Message search |
| Context cards | MEDIUM | Rich context previews |
| Deep links | MEDIUM | Direct message links |
| Notifications | HIGH | Push/email notifications |

### 4.3 Context Types

| Context | Initiator | Recipient | Thread Identity |
|---|---|---|---|
| PROPERTY | Buyer | Property owner/agent | Property inquiry |
| SERVICE_REQUEST | Customer | Service provider | Service request |
| SERVICE_JOB | Customer | Provider | Service job |
| ORGANIZATION | Member | Office/Company | Organization inquiry |
| GENERAL | Any user | Any user | General conversation |

### 4.4 Provider Chat Isolation

**CRITICAL:** Customer ↔ Provider conversations MUST be isolated.

Example:
```
Customer ↔ Provider A (Thread 1)
Customer ↔ Provider B (Thread 2)
```

These MUST be separate private threads. Never use only `service_request_id` as conversation identity.

### 4.5 Message Privacy / Moderation

Moderators MUST NOT casually browse private conversations.

Privileged access only for:
- Reported messages
- Disputes
- Safety cases
- Support cases
- Legal/compliance cases

Every staff access should be audited.

---

## 5. V1 Messaging Gaps in V2.0

| Feature | V1 Status | V2.0 Status | Gap |
|---|---|---|---|
| Private conversations | Implemented | Missing | CRITICAL |
| Group conversations | Implemented | Missing | CRITICAL |
| Text messages | Implemented | Missing | CRITICAL |
| Image messages | Implemented | Missing | HIGH |
| Voice messages | Implemented | Missing | MEDIUM |
| File messages | Implemented | Missing | MEDIUM |
| Message editing | Implemented | Missing | HIGH |
| Message deletion | Implemented | Missing | HIGH |
| Typing indicators | Implemented | Missing | MEDIUM |
| Online/offline status | Implemented | Missing | MEDIUM |
| Read receipts | Implemented | Missing | HIGH |
| User blocking | Implemented | Missing | HIGH |
| Conversation muting | Implemented | Missing | LOW |
| Admin oversight | Implemented | Missing | HIGH |
| Access logging | Implemented | Missing | HIGH |
| Desktop notifications | Implemented | Missing | MEDIUM |
| Sound notifications | Implemented | Missing | LOW |
| Pagination | Implemented | Missing | MEDIUM |
| Encryption | Implemented | Missing | HIGH |

---

**Status:** COMPLETE  
**Application Source Files Modified:** ZERO
