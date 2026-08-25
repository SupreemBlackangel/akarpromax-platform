# 09B — V1 ADMIN ELITE LEADS FORENSIC REPORT

**Source:** `src/pages/AdminEliteLeads.tsx` (144 lines)
**Classification:** WIRED (read + mutate)
**Status:** Resolved

## Identity

| Field | Evidence |
|---|---|
| Route | `/admin/elite-leads` |
| File | `src/pages/AdminEliteLeads.tsx` |
| Lines | 144 |
| Auth | Client-side: `if (!user \|\| user.role !== "admin") { navigate("/"); return null; }` at line 73 |
| Uses Layout | Yes — wraps in `Layout` component |

## Data Model

```typescript
interface InquiryItem {
  id: number;
  propertyId: number;
  propertyTitle: string;
  officeId: number;
  senderName: string;
  senderEmail: string;
  senderPhone: string;
  message: string;
  isRead: boolean;
  isEliteLead: boolean;       // ← the elite flag
  budgetAmount: number;
  leadScore: number;          // ← scoring field
  createdAt: string;
}
```

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/inquiries/all` | Fetch all inquiries (requires token) |
| PATCH | `/elite-leads/${id}/mark` | Toggle elite status (body: `{ isEliteLead: boolean }`) |

## UI Sections

1. **Header:** Title + unread count badge + elite count badge
2. **Search:** Text input for filtering by name/email/property
3. **Stat Cards:** Total inquiries, Elite count, Unread count
4. **Tabs:** "Elite" tab (only elite leads) + "All" tab (all inquiries)
5. **Card List:** Each inquiry shows: name, phone, email, property title, budget, date, message

## Actions

| Action | Effect | Auth |
|---|---|---|
| Mark Elite | `PATCH /elite-leads/${id}/mark` with `isEliteLead: true` | Token required |
| Remove Elite | `PATCH /elite-leads/${id}/mark` with `isEliteLead: false` | Token required |

## Client-Side Filtering

- Search: case-insensitive substring match on `senderName`, `senderEmail`, `propertyTitle`
- Tabs: filter by `isEliteLead === true` (Elite tab) or show all (All tab)

## What "Elite Lead" Actually Means

An **elite lead** is a property inquiry (from `inquiries` table) that an admin manually marks as high-value. The system stores:
- `isEliteLead` boolean — manually toggled by admin
- `leadScore` number — presumably computed elsewhere (not in this UI)
- `budgetAmount` — the inquirer's stated budget

**There is NO AI-powered scoring visible in this UI.** The `leadScore` field exists in the data model but is never displayed or modified by this page. The "elite" designation is purely manual admin toggle.

## What Is Unknown

- How `leadScore` is computed (not in this file)
- How `budgetAmount` is captured (likely in the inquiry submission form)
- The backend `/elite-leads/${id}/mark` endpoint is NOT in the V1 server routes — may be in `inquiries.ts` or a missing route
