# Phase 2 Migration Pattern

## Current State

The existing pages (Home, Services, Properties, Tools, Admin) are complex client components with extensive state management. Wrapping them with PublicPageShell requires significant refactoring.

## Migration Strategy

### Phase 2.1: Foundation (Completed)
- Design tokens extracted
- Shared components created (Button, Input, Card, Badge, Modal)
- Page shells created (PublicPageShell, AdminPageShell)
- Layouts created (Public, Account, Workspace, Admin)

### Phase 2.2: AdSlot Standardization (Next)
- Standardize AdSlot component
- Classify ad placements
- Create consistent ad slot variants

### Phase 2.3: Page Migration (Future)
- Wrap existing pages with PublicPageShell
- Move page-specific logic to child components
- Maintain existing functionality

## Migration Pattern

### Before (Current)
```tsx
"use client";

export default function Home() {
  const [locale, setLocale] = useState<Locale>("ar");
  const [country, setCountry] = useState("om");
  // ... extensive state management
  
  return (
    <div>
      {/* Header */}
      <header>...</header>
      
      {/* NewsTicker */}
      <NewsTicker ... />
      
      {/* Content */}
      <main>...</main>
      
      {/* Footer */}
      <footer>...</footer>
    </div>
  );
}
```

### After (Phase 2.3)
```tsx
"use client";

export default function Home() {
  const [locale, setLocale] = useState<Locale>("ar");
  const [country, setCountry] = useState("om");
  // ... extensive state management
  
  return (
    <PublicPageShell
      locale={locale}
      copy={copy}
      viewer={viewer}
      country={country}
      city={city}
      onLogin={() => setAccountOpen(true)}
      onLogout={handleLogout}
    >
      {/* Page-specific content only */}
      <section>...</section>
    </PublicPageShell>
  );
}
```

## Benefits

1. **Consistent Structure:** All public pages have the same header, footer, and navigation
2. **Reduced Duplication:** No more copying header/footer code between pages
3. **Easier Maintenance:** Changes to header/footer only need to be made once
4. **Better Performance:** Shared components can be optimized and cached
5. **Improved Accessibility:** Consistent navigation and focus management

## Next Steps

1. Complete AdSlot standardization
2. Classify ad placements
3. Start wrapping pages with PublicPageShell
4. Test and verify functionality
