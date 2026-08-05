# Layouts

Documentation of the 4 architectural layouts and their implementation.

## Layout Architecture

```
RootLayout (app/layout.tsx)
├── html, body, theme boot script
├── metadata, icons, manifest
└── locale direction (ar=rtl, en/tr=ltr)

PublicLayout (app/(public)/layout.tsx)
└── {children} (passthrough)

AccountLayout (app/(account)/layout.tsx)
└── {children} (passthrough)

WorkspaceLayout (app/(workspace)/layout.tsx)
└── {children} (passthrough)

AdminLayout (app/(admin)/layout.tsx)
└── {children} (passthrough)
```

## Layout Details

### Root Layout

**File:** `app/layout.tsx`

**Component:** RootLayout

**Audience:** All pages

**Header:** None (provided by PublicPageShell or AdminPageShell)

**Footer:** None (provided by PublicPageShell or AdminPageShell)

**Navigation:** None (provided by PublicPageShell or AdminPageShell)

**Sidebar:** None

**Auth dependency:** None

**Admin dependency:** None

**Public dependency:** None

**Status:** IMPLEMENTED

**Notes:** Root layout provides:
- HTML structure with `lang="ar"` and `dir="rtl"`
- Theme boot script for dark mode
- Global metadata (title, description, icons, OpenGraph)
- Body wrapper

### PublicLayout

**File:** `app/(public)/layout.tsx`

**Component:** PublicLayout

**Audience:** Public pages (future use)

**Header:** None

**Footer:** None

**Navigation:** None

**Sidebar:** None

**Auth dependency:** None

**Admin dependency:** None

**Public dependency:** None

**Status:** EMPTY (passthrough)

**Notes:** Route group layout for future public pages. Currently empty passthrough.

### AccountLayout

**File:** `app/(account)/layout.tsx`

**Component:** AccountLayout

**Audience:** Authenticated user pages (future use)

**Header:** None

**Footer:** None

**Navigation:** None

**Sidebar:** None

**Auth dependency:** None

**Admin dependency:** None

**Public dependency:** None

**Status:** EMPTY (passthrough)

**Notes:** Route group layout for future account pages. Currently empty passthrough.

### WorkspaceLayout

**File:** `app/(workspace)/layout.tsx`

**Component:** WorkspaceLayout

**Audience:** Workspace pages (future use)

**Header:** None

**Footer:** None

**Navigation:** None

**Sidebar:** None

**Auth dependency:** None

**Admin dependency:** None

**Public dependency:** None

**Status:** EMPTY (passthrough)

**Notes:** Route group layout for future workspace pages. Currently empty passthrough.

### AdminLayout

**File:** `app/(admin)/layout.tsx`

**Component:** AdminLayout

**Audience:** Admin pages (future use)

**Header:** None

**Footer:** None

**Navigation:** None

**Sidebar:** None

**Auth dependency:** None

**Admin dependency:** None

**Public dependency:** None

**Status:** EMPTY (passthrough)

**Notes:** Route group layout for future admin pages. Currently empty passthrough.

## Fifth Layout Check

No fifth architectural layout exists. The 4 route group layouts are:
1. PublicLayout
2. AccountLayout
3. WorkspaceLayout
4. AdminLayout

The Root Layout is not considered a fifth architectural layout as its role is limited to:
- HTML structure
- Body wrapper
- Theme boot script
- Global metadata
- Locale direction

## Layout Usage

### Current State
- Home page: Uses PublicPageShell directly (not via layout)
- Services page: Uses PublicPageShell directly (not via layout)
- Properties page: Uses PublicPageShell directly (not via layout)
- Tools page: Uses PublicPageShell directly (not via layout)
- Admin pages: Use existing admin layout (not via AdminLayout)

### Future State
- Public pages could be moved into `app/(public)/` to use PublicLayout
- Account pages could be moved into `app/(account)/` to use AccountLayout
- Workspace pages could be moved into `app/(workspace)/` to use WorkspaceLayout
- Admin pages could be moved into `app/(admin)/` to use AdminLayout

## Navigation

### Public Navigation (in PublicPageShell)
- Home (`/`)
- Properties (`/properties`)
- Services (`/services`)
- Tools (`/tools`)
- Total: 4 items (within limit of 7)

### Admin Navigation (in AdminPageShell)
- Dashboard (`/admin`)
- Users (`/admin/users`)
- Properties (`/admin/properties`)
- Services (`/admin/services`)
- News (`/admin/news`)
- Sponsors (`/admin/sponsors`)
- Ads (`/admin/ads`)
- Settings (`/admin/settings`)
- Total: 8 groups (exceeds limit of 7 by 1)

## Recommendations

1. Consider reducing admin navigation to 7 groups
2. Consider moving pages into route groups for layout integration
3. Consider implementing actual layout content (not just passthrough)
