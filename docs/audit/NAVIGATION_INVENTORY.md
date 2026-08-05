# Navigation Inventory

## Summary
- No centralized navigation schema exists.
- Public, admin, sponsor-admin, ads-admin, and tools each define navigation locally.
- No breadcrumb component or breadcrumb route metadata was found.
- At least 4 icon systems are in use: `lucide-react`, Unicode symbols, emoji, and plain letters/single-character marks.

## Navigation Definitions

### 1. Public Landing Sidebar and Header
- Files:
  - `app/page.tsx`
  - `src/data/translations.ts`
- Definitions:
  - `translations.sidebar`: 20 translated items with icon keys.
  - `adminNav`: real admin route list in `app/page.tsx`.
  - `iconMap`: `lucide-react` map in `app/page.tsx`.
  - `languageOptions`, `themeOptions`, `roleLabels` in `src/data/translations.ts`.
  - `quickLinks` and `usefulLinks` footer link arrays in `src/data/translations.ts`.
- Actual behavior:
  - Main `copy.sidebar` items render as anchors to `#module-${index}`.
  - Admin routes render separately from `adminNav` with real `href` values.

### 2. Admin Dashboard Module Links
- File: `app/admin/dashboard-admin-client.tsx`
- Definition:
  - Local `sections` array with links to sponsors, ads, news, i18n, services, users, roles, reports, settings.
- Icons:
  - Unicode symbols (`▣`, `▤`, `➤`, `🔤`, `✦`, `♙`, `♛`, `↗`, `⚙`).

### 3. Repeated Inline Admin Sidebar Links
- Files:
  - `app/admin/users-admin-client.tsx`
  - `app/admin/roles-admin-client.tsx`
  - `app/admin/reports-admin-client.tsx`
  - `app/admin/settings-admin-client.tsx`
- Definition:
  - Each page defines a minimal one-link sidebar back to `/admin`.
- Icons:
  - Unicode `≡` marker.

### 4. Sponsor Admin Local Navigation
- File: `app/admin/sponsors/sponsor-admin-client.tsx`
- Definition:
  - `availableViews` array for `campaigns`, `analytics`, `access`.
- Icons:
  - Unicode (`▣`, `↗`, `♙`).

### 5. Ads Admin Local Navigation
- File: `app/admin/ads/ads-admin-client.tsx`
- Definition:
  - Local sidebar links plus internal wizard-step navigation.
- Icons:
  - No shared icon system; mixed text, letters, and wizard-step numbers.

### 6. Tools Page Internal Navigation
- File: `src/components/tools/ToolsPageClient.tsx`
- Definition:
  - `TOOLS` array for 8 calculators.
- Icons:
  - Emoji (`🧱`, `🏗️`, `🪨`, `🔩`, `🎨`, `📐`, `⚗️`).

## Icon Inventory

### `lucide-react`
- Used in `app/page.tsx`
- Icons: `Home`, `Library`, `Megaphone`, `MapPin`, `Phone`, `HelpCircle`, `LayoutDashboard`, `UserCheck`, `Newspaper`, `Wallet`, `Building2`, `Hammer`, `ShieldCheck`, `Shield`, `Key`, `CreditCard`, `Tag`, `BarChart3`, `Settings`, `Users`, `Briefcase`, `Languages`

### Unicode symbol icons
- Used in dashboard/admin/sponsor sidebars and location widgets
- Examples: `⌖`, `≡`, `▣`, `♙`, `↗`, `⚙`

### Emoji icons
- Used in tools navigation
- Examples: `🛠️`, `🧱`, `🏗️`, `🔩`, `🎨`

### Text/letter marks
- `Brand` uses letter `A`
- Social/footer links use `f`, `𝕏`, `◎`, `in`

## Major Navigation Findings

### Broken or Misaligned Public Sidebar Anchors
- `app/page.tsx` maps every translated sidebar item except index 0 to `#module-${index}`.
- The page only defines `module-1` through `module-4` inside the services grid.
- Result:
  - labels such as "Books and programs", "Advertise", "Contact", and all admin labels do not map to real page sections.

### Public/Admin IA Is Mixed in One Translation Array
- `translations.sidebar` contains both public and admin labels.
- This couples two different audiences into one navigation structure.

### No Real Route-Based Public Navigation
- The landing page sidebar does not link to `/services`, `/tools`, or `/properties/[id]`.
- Footer quick links and useful links mostly point to `#top`, not real routes.

### No Breadcrumb System Exists
- No breadcrumb component, hook, or page metadata was found.
- This is a gap rather than duplication.

### Admin Shell Navigation Is Repeated, Not Shared
- Multiple admin pages duplicate sidebar/header markup instead of consuming a shared layout.

## Footer and Ancillary Navigation
- `src/data/translations.ts`
  - `quickLinks`: 6 per locale
  - `usefulLinks`: 7 per locale
- `app/page.tsx`
  - Footer renders these as `href="#top"` links rather than route links.

## Recommended Direction After Approval
- Split navigation into:
  - Public navigation schema
  - Workspace navigation schema
  - Admin navigation schema
- Move admin IA entirely out of `translations.sidebar`.
- Replace anchor placeholders with real routes or real section IDs.
- Introduce one breadcrumb system only after page scopes are stabilized.
