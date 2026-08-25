# 11_V1_MESSAGING_PROTOCOL_AND_UX.md
# V1 Messaging Protocol & UX

**Audit Date:** 2026-08-19  
**Mode:** READ-ONLY — V1 Source Archaeology

---

## 1. Chat Server Architecture

### 1.1 Server Details

| Component | Value |
|---|---|
| File | `server/chat-server.ts` |
| Port | 3008 |
| Technology | Socket.IO |
| Database | SQLite (raw SQL) |
| Encryption | AES-256-GCM |

### 1.2 Encryption Design

**Algorithm:** AES-256-GCM  
**Key Derivation:** scrypt  
**Key Source:** `ENC_KEY` environment variable  
**Salt:** `ENC_SALT` environment variable  
**IV:** Random per message  
**Storage:** IV stored in `iv` column

**IMPORTANT:** This is server-side encryption, NOT end-to-end encryption. The server possesses the keys and can read messages.

---

## 2. Database Schema

### 2.1 Conversations

```sql
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  type TEXT DEFAULT 'private',
  name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 2.2 Conversation Participants

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

### 2.3 Messages

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

### 2.4 Message Read Receipts

```sql
CREATE TABLE message_read_receipts (
  id TEXT PRIMARY KEY,
  message_id TEXT REFERENCES messages(id),
  user_id TEXT REFERENCES users(id),
  read_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 2.5 Moderation Requests

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

### 2.6 Moderation Access Logs

```sql
CREATE TABLE moderation_access_logs (
  id TEXT PRIMARY KEY,
  moderator_id TEXT REFERENCES users(id),
  conversation_id TEXT REFERENCES conversations(id),
  reason TEXT,
  accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 2.7 Blocked Users

```sql
CREATE TABLE blocked_users (
  id TEXT PRIMARY KEY,
  blocker_id TEXT REFERENCES users(id),
  blocked_id TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. Socket.IO Events

### 3.1 Client → Server Events

| Event | Payload | Purpose |
|---|---|---|
| `join_conversation` | conversationId | Join conversation room |
| `leave_conversation` | conversationId | Leave conversation room |
| `send_message` | conversationId, content, type | Send message |
| `edit_message` | messageId, content | Edit message |
| `delete_message` | messageId | Delete message |
| `typing_start` | conversationId | Start typing indicator |
| `typing_stop` | conversationId | Stop typing indicator |
| `mark_read` | messageId | Mark message as read |
| `block_user` | userId | Block user |
| `unblock_user` | userId | Unblock user |
| `report_message` | messageId, reason | Report message |
| `request_moderation` | conversationId, reason | Request moderation access |

### 3.2 Server → Client Events

| Event | Payload | Purpose |
|---|---|---|
| `new_message` | message object | New message received |
| `message_edited` | messageId, content | Message edited |
| `message_deleted` | messageId | Message deleted |
| `typing_start` | userId, conversationId | User started typing |
| `typing_stop` | userId, conversationId | User stopped typing |
| `user_online` | userId | User came online |
| `user_offline` | userId | User went offline |
| `read_receipt` | messageId, userId | Message read |
| `user_blocked` | userId | User blocked |
| `user_unblocked` | userId | User unblocked |
| `moderation_approved` | conversationId | Moderation access approved |

---

## 4. Conversation Types

### 4.1 Private Conversation

**Type:** `private`  
**Participants:** 2 users  
**Creation:** First message sent

### 4.2 Group Conversation

**Type:** `group`  
**Participants:** 2+ users  
**Creation:** Manual creation

---

## 5. Message Types

| Type | Description | Storage |
|---|---|---|
| `text` | Text message | Encrypted content |
| `image` | Image message | URL + encrypted metadata |
| `voice` | Voice message | URL + encrypted metadata |
| `file` | File message | URL + encrypted metadata |

---

## 6. Features

### 6.1 Real-time Messaging

- Socket.IO rooms for conversation isolation
- Typing indicators
- Online/offline status
- Read receipts

### 6.2 Message Management

- Edit message (with `edited_at` timestamp)
- Delete message (soft delete with `deleted_at`)
- Local trash/restore

### 6.3 User Management

- Block user
- Unblock user
- Mute conversation (client-side)

### 6.4 Moderation

- Request moderation access
- Moderator can view with logging
- All access logged in `moderation_access_logs`

### 6.5 Notifications

- Desktop notifications
- Sound notifications
- Push notifications

### 6.6 Pagination

- Load older messages
- Infinite scroll

---

## 7. Privacy Rules

### 7.1 Private Conversations

- Only participants can view
- Moderators need explicit request
- All access logged

### 7.2 Blocked Users

- Blocked user cannot send messages
- Blocked user cannot see online status
- Block is per-user, not per-conversation

---

## 8. Frontend Components

| Component | File | Purpose |
|---|---|---|
| ChatWidget | `ChatWidget.tsx` | Main chat widget |
| ChatApp | `ChatApp.tsx` | Chat application |
| ChatWindow | `ChatWindow.tsx` | Chat window |
| ChatList | `ChatList.tsx` | Conversation list |
| ChatInput | `ChatInput.tsx` | Message input |
| MessageBubble | `MessageBubble.tsx` | Message display |
| VoiceRecorder | `VoiceRecorder.tsx` | Voice recording |

---

## 9. Context Providers

### 9.1 ChatContext

**File:** `src/contexts/ChatContext.tsx`

**State:**
- conversations
- messages
- online users
- typing indicators
- oversight mode

**Actions:**
- sendMessage
- editMessage
- deleteMessage
- blockUser
- unblockUser
- requestModeration

---

## 10. Summary

| Feature | Implementation |
|---|---|
| Private conversations | ✅ Socket.IO rooms |
| Group conversations | ✅ Socket.IO rooms |
| Text messages | ✅ Encrypted storage |
| Image messages | ✅ File upload |
| Voice messages | ✅ Audio recording |
| File messages | ✅ File upload |
| Message editing | ✅ With timestamp |
| Message deletion | ✅ Soft delete |
| Typing indicators | ✅ Real-time |
| Online/offline status | ✅ Presence tracking |
| Read receipts | ✅ Database tracking |
| User blocking | ✅ Database tracking |
| Conversation muting | ✅ Client-side |
| Admin oversight | ✅ With logging |
| Access logging | ✅ Database tracking |
| Desktop notifications | ✅ Browser API |
| Sound notifications | ✅ Audio playback |
| Pagination | ✅ Load older |

---

**Status:** COMPLETE  
**Application Source Files Modified:** ZERO
