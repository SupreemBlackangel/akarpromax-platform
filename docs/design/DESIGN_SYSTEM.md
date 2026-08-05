# Design System

Shared UI foundation for Phase 2 implementation.

## Component Architecture

### Shared Components (New)

All shared components live in `src/components/shared/` and follow these rules:
- No business logic — pure presentational
- Accept `className` prop for composition
- Support RTL via `dir` attribute
- Use design tokens from `globals.css`
- No inline styles — all styling via CSS classes

### Component List

| Component | File | Purpose | Status |
|-----------|------|---------|--------|
| `Button` | `src/components/shared/Button.tsx` | Standard button variants | To create |
| `Input` | `src/components/shared/Input.tsx` | Form inputs | To create |
| `Card` | `src/components/shared/Card.tsx` | Content cards | To create |
| `Badge` | `src/components/shared/Badge.tsx` | Status badges | To create |
| `Modal` | `src/components/shared/Modal.tsx` | Dialog/modal wrapper | To create |
| `Header` | `src/components/shared/Header.tsx` | Public page header | To create |
| `Footer` | `src/components/shared/Footer.tsx` | Public page footer | To create |
| `Sidebar` | `src/components/shared/Sidebar.tsx` | Admin sidebar | To create |

## Layout Architecture

### 4 Layouts

| Layout | File | Target | Components |
|--------|------|--------|------------|
| `PublicLayout` | `app/(public)/layout.tsx` | Public pages | Header + Footer + NewsTicker + AdSlots |
| `AccountLayout` | `app/(account)/layout.tsx` | Authenticated pages | Header + Footer + AccountSidebar |
| `WorkspaceLayout` | `app/(workspace)/layout.tsx` | Workspace pages | Header + Footer + WorkspaceSidebar |
| `AdminLayout` | `app/(admin)/layout.tsx` | Admin pages | Sidebar + Header + ContentArea |

### Layout Hierarchy

```
RootLayout (app/layout.tsx)
├── PublicLayout (app/(public)/layout.tsx)
│   ├── page.tsx (Home)
│   ├── services/page.tsx
│   ├── properties/[id]/page.tsx
│   └── tools/page.tsx
├── AccountLayout (app/(account)/layout.tsx)
│   ├── dashboard/page.tsx
│   ├── settings/page.tsx
│   └── messages/page.tsx
├── WorkspaceLayout (app/(workspace)/layout.tsx)
│   ├── workspace/page.tsx
│   └── workspace/[id]/page.tsx
└── AdminLayout (app/(admin)/layout.tsx)
    ├── admin/page.tsx
    ├── admin/users/page.tsx
    ├── admin/properties/page.tsx
    └── admin/**/page.tsx
```

## Design Tokens (CSS Variables)

All tokens are defined in `app/globals.css` and documented in `docs/design/DESIGN_TOKENS.md`.

### Key Tokens

- **Colors:** `--ink`, `--blue`, `--blue-dark`, `--sky`, `--lavender`, `--paper`, `--line`, `--muted`, `--gold`
- **Typography:** `--font-heading`, `--font-body`, `--font-display`
- **Spacing:** `--space-1` through `--space-12`
- **Borders:** `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`, `--radius-full`
- **Shadows:** `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-xl`
- **Breakpoints:** `--bp-sm`, `--bp-md`, `--bp-lg`, `--bp-xl`, `--bp-2xl`
- **Layout:** `--container-max`, `--sidebar-width`, `--header-height`, `--footer-height`
- **Z-Index:** `--z-base`, `--z-dropdown`, `--z-sticky`, `--z-modal`, `--z-toast`, `--z-tooltip`
- **Transitions:** `--transition-fast`, `--transition-normal`, `--transition-slow`

## Page Shell Pattern

### PublicPageShell

Wraps all public pages with consistent structure:

```tsx
<PublicPageShell
  locale={locale}
  copy={copy}
  viewer={viewer}
  country={country}
  city={city}
>
  {children}
</PublicPageShell>
```

**Includes:**
- Header with Brand, Navigation, Tools, Auth
- NewsTicker
- Content area
- Footer
- AdSlots (top and bottom)
- FloatingChat

### AdminPageShell

Wraps all admin pages with consistent structure:

```tsx
<AdminPageShell
  locale={locale}
  viewer={viewer}
  activeSection={activeSection}
>
  {children}
</AdminPageShell>
```

**Includes:**
- Sidebar with navigation
- Header with Brand, Tools, Auth
- Content area
- Footer

## Ad Slot Standardization

### Placement Types

| Type | Usage | Variants |
|------|-------|----------|
| `banner` | Top/bottom of pages | horizontal |
| `sidebar` | Sidebar placements | vertical |
| `inline` | Within content | horizontal |
| `popup` | Modal/overlay | floating |
| `native` | Content-integrated | horizontal |

### Standardized Props

```tsx
type AdSlotProps = {
  placement: string;
  locale: "ar" | "en" | "tr";
  country: string;
  city?: string;
  deviceType?: DeviceType;
  path?: string;
  entityType?: string;
  entityId?: string | number;
  categoryId?: string | number;
  tags?: string[];
  variant?: "horizontal" | "vertical" | "floating" | "popup";
  className?: string;
  eager?: boolean;
  requestable?: boolean;
  onRequestAd?: () => void;
  onViewDetails?: (slotData: AdSlotData) => void;
  onContact?: (slotData: AdSlotData) => void;
};
```

## Navigation Reduction

### Core Navigation (Always Visible)

- Home (`/`)
- Properties (`/properties`)
- Services (`/services`)
- Tools (`/tools`)
- Admin (`/admin`) — if user has admin role

### Secondary Navigation (Contextual)

- Dashboard (`/dashboard`) — if authenticated
- Settings (`/settings`) — if authenticated
- Messages (`/messages`) — if authenticated

### Tertiary Navigation (Hidden)

- All other pages — accessible via footer or sidebar

## Responsive Breakpoints

| Breakpoint | Width | Usage |
|------------|-------|-------|
| `--bp-sm` | `640px` | Mobile landscape |
| `--bp-md` | `768px` | Tablet |
| `--bp-lg` | `1024px` | Desktop |
| `--bp-xl` | `1280px` | Large desktop |
| `--bp-2xl` | `1536px` | Extra large |

## RTL Support

All components support RTL via:
- `dir="rtl"` attribute on containers
- CSS logical properties (`margin-inline-start`, `padding-inline-end`, etc.)
- Automatic flipping of icons and arrows

## Accessibility

- All interactive elements have `aria-label` or `aria-labelledby`
- Focus states visible via `:focus-visible`
- Color contrast meets WCAG AA standards
- Screen reader friendly with `role` attributes
- Keyboard navigation support

## Dark Mode

All tokens support dark mode via `html[data-theme="dark"]` selector.

## Implementation Order

1. **Phase 2.1:** Design Tokens (CSS variables)
2. **Phase 2.2:** Shared Components (Button, Input, Card, Badge, Modal)
3. **Phase 2.3:** Layout Components (Header, Footer, Sidebar)
4. **Phase 2.4:** Page Shells (PublicPageShell, AdminPageShell)
5. **Phase 2.5:** Layouts (Public, Account, Workspace, Admin)
6. **Phase 2.6:** Ad Slot Standardization
7. **Phase 2.7:** Page Migration (wrap existing pages)
8. **Phase 2.8:** Testing and Documentation
