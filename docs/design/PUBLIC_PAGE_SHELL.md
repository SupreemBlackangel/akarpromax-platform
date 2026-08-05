# Public Page Shell

Documentation of the PublicPageShell component and its actual implementation.

## Component Structure

```
PublicPageShell
├── Header (shared/Header.tsx)
│   ├── Brand
│   ├── Navigation (Home, Properties, Services, Tools)
│   └── Login/Logout
├── NewsTicker (NewsTicker.tsx)
│   └── News feed with pause control
├── main.public-main
│   ├── AdSlot (global_header)
│   ├── {children} (page content)
│   └── AdSlot (global_footer)
└── Footer (shared/Footer.tsx)
    ├── Brand description
    ├── Quick links
    ├── Useful links
    ├── Contact info
    └── Copyright
```

## Props

```typescript
type Props = {
  locale: Locale;
  copy: Translation;
  viewer: ViewerContext;
  country: string;
  city: string;
  deviceType?: "desktop" | "mobile" | "tablet";
  onLogin: () => void;
  onLogout: () => void;
  children: React.ReactNode;
};
```

## Implementation Status

### Pages Using PublicPageShell
- `/services` - ✅ Wrapped with PublicPageShell
- `/properties/[id]` - ✅ Wrapped with PublicPageShell
- `/tools` - ✅ Wrapped with PublicPageShell (via ToolsPageClient)

### Pages Not Using PublicPageShell
- `/` (Home) - ❌ Uses custom header/footer (complex state management)
- `/admin` - ❌ Uses existing admin layout

## Rules Compliance

1. ✅ Header and Footer not duplicated (provided by PublicPageShell)
2. ✅ Pages don't create Header or Footer locally (except home page)
3. ✅ Pages don't create NewsTicker locally (provided by PublicPageShell)
4. ✅ Pages don't place ads directly (use AdSlot via PublicPageShell)
5. ✅ PublicPageShell doesn't import business modules
6. ✅ PublicPageShell doesn't fetch property/service data
7. ✅ PublicPageShell doesn't access database
8. ✅ PublicPageShell doesn't read admin permissions
9. ✅ All ad positions use AdSlot
10. ✅ No layout shift when ads are missing (AdSlot handles empty state)

## Ad Slots

PublicPageShell includes two global ad slots:
- `global_header` - Horizontal banner at top of content
- `global_footer` - Horizontal banner at bottom of content

Pages can add additional ad slots as needed (e.g., properties page adds 7 more).

## Navigation

Public navigation items:
1. Home (`/`)
2. Properties (`/properties`)
3. Services (`/services`)
4. Tools (`/tools`)

Total: 4 items (within limit of 7)

## Responsive Behavior

- Mobile: Navigation collapses, footer stacks
- Tablet: Navigation visible, footer 2-column
- Desktop: Navigation visible, footer 4-column

## Dark Mode

All components support dark mode via `html[data-theme="dark"]` selector.

## RTL Support

All components support RTL via `dir` attribute and CSS logical properties.
