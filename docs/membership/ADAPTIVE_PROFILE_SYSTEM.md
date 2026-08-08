# ADAPTIVE PROFILE SYSTEM

## 1. Core Principle

**ONE DESIGN SYSTEM, ADAPTIVE PRESENTATION.**

No separate pages per level:
- ❌ new-profile.tsx
- ❌ rising-profile.tsx
- ❌ gold-profile.tsx
- ❌ promax-profile.tsx

**AdaptiveProfileEngine** renders differently based on:
- entityType
- accountType
- verification status
- reputation level
- activity state
- availability
- profile strength
- content availability
- permissions

## 2. Presentation Variants

### BASE (NEW)
- Standard profile layout
- Basic information display
- Verification summary
- Activity status
- Profile strength indicator

### ENHANCED (RISING)
- Base layout +
- Progress indicators toward next level
- Achievement highlights
- Enhanced statistics
- Portfolio section (if content exists)

### PREMIUM (DISTINGUISHED/GOLD)
- Enhanced layout +
- Premium header treatment
- Enhanced metrics dashboard
- Deeper analytics
- Priority directory placement
- Brand presence elements

### PROMAX (PROMAX)
- Premium layout +
- Highest professional presentation
- Promax directory eligibility
- Advanced analytics
- Early feature access
- Priority support indicators

## 3. All Variants Share

- Same design system
- Same components
- Same tokens
- Same accessibility standards
- Same responsive behavior
- Same RTL/LTR support
- Same dark mode

**Visual differences are subtle, not dramatic.**

## 4. Gold Visual Language

Gold does NOT mean:
- Gold background everywhere
- Gold buttons everywhere
- Casino look
- Luxury overload

Gold means:
- Subtle premium accent
- Badge indicator
- Professional header treatment
- Enhanced statistics
- Premium section styling

## 5. ProMax Visual Language

ProMax:
- Premium
- Professional
- Calm
- High trust
- Exclusive without flashy UI

May include:
- Badge
- Subtle border/accent
- Premium header
- Enhanced metrics

NOT:
- Neon
- Gaming
- Excessive animation

## 6. Adaptive Sections

### User Profile Sections

| Section | NEW | RISING | DISTINGUISHED | GOLD | PROMAX |
|---------|-----|--------|---------------|------|--------|
| Header | ✓ | ✓ | ✓ | ✓+accent | ✓+premium |
| Verification | ✓ | ✓ | ✓ | ✓ | ✓ |
| Activity | ✓ | ✓ | ✓ | ✓ | ✓ |
| Profile Strength | ✓ | ✓+progress | ✓ | ✓ | ✓ |
| Properties | ✓ | ✓ | ✓ | ✓ | ✓ |
| Favorites | ✓ | ✓ | ✓ | ✓ | ✓ |
| Service Requests | ✓ | ✓ | ✓ | ✓ | ✓ |
| Achievements | - | ✓ | ✓ | ✓ | ✓ |
| Analytics | - | - | ✓ | ✓ | ✓ |

### Professional Profile Sections

| Section | NEW | RISING | DISTINGUISHED | GOLD | PROMAX |
|---------|-----|--------|---------------|------|--------|
| Header | ✓ | ✓ | ✓+stats | ✓+premium | ✓+elite |
| Verification | ✓ | ✓ | ✓ | ✓ | ✓ |
| Reputation | ✓ | ✓ | ✓ | ✓ | ✓ |
| Availability | ✓ | ✓ | ✓ | ✓ | ✓ |
| About | ✓ | ✓ | ✓ | ✓ | ✓ |
| Services | ✓ | ✓ | ✓ | ✓ | ✓ |
| Portfolio | ✓ | ✓ | ✓ | ✓+featured | ✓+highlighted |
| Certificates | ✓ | ✓ | ✓ | ✓ | ✓ |
| Experience | ✓ | ✓ | ✓ | ✓ | ✓ |
| Reviews | - | ✓ | ✓ | ✓ | ✓ |
| Achievements | - | ✓ | ✓ | ✓ | ✓ |
| Analytics | - | - | ✓ | ✓ | ✓ |
| Directory | - | ✓ | ✓ | ✓ | ✓+priority |

### Organization Profile Sections

| Section | NEW | RISING | DISTINGUISHED | GOLD | PROMAX |
|---------|-----|--------|---------------|------|--------|
| Header | ✓ | ✓ | ✓+metrics | ✓+premium | ✓+elite |
| Verification | ✓ | ✓ | ✓ | ✓ | ✓ |
| Reputation | ✓ | ✓ | ✓ | ✓ | ✓ |
| Overview | ✓ | ✓ | ✓ | ✓ | ✓ |
| Properties | ✓ | ✓ | ✓ | ✓ | ✓ |
| Services | ✓ | ✓ | ✓ | ✓ | ✓ |
| Team | ✓ | ✓ | ✓ | ✓ | ✓ |
| Branches | ✓ | ✓ | ✓ | ✓ | ✓ |
| Reviews | - | ✓ | ✓ | ✓ | ✓ |
| Portfolio | - | ✓ | ✓ | ✓ | ✓ |
| Projects | - | ✓ | ✓ | ✓ | ✓ |
| Achievements | - | ✓ | ✓ | ✓ | ✓ |
| Analytics | - | - | ✓ | ✓ | ✓ |
| Directory | - | ✓ | ✓ | ✓ | ✓+priority |

## 7. Empty Section Policy

**Do not display empty sections.**

If a section has no content:
- Hide it completely
- OR show a "Add your first [item]" prompt
- Never show empty state unless actionable

## 8. CTA Variants

### User Profile
- Primary: "تعديل الملف" (Edit Profile)
- Secondary: "حفظChanges" (Save Changes)

### Professional Profile
- Primary: "طلب عرض سعر" (Request Quote)
- Secondary: "تواصل" (Contact)

### Organization Profile
- Primary: "طلب عرض سعر" (Request Quote)
- Secondary: "اتصل بنا" (Contact Us)
- Tertiary: "زيارةالموقع" (Visit Website)

## 9. Professional Organization Business Presence

### Concept: Professional Supplier / Company Mini-Site

AkarProMax Business Presence provides:
- Professional business presence inside AkarProMax
- NOT just a profile card
- NOT a separate website/domain/app

### Philosophy

Inspired by B2B platforms but with AkarProMax identity:
- Trust signals
- Company capability
- Performance metrics
- Portfolio showcase
- Verification display
- Service offerings
- Team visibility
- Branch locations
- Customer reviews
- Business CTA

**Do NOT visually copy any platform.** AkarProMax has its own identity.

### Real Estate Organization Profile

```
Cover Image
Logo
Organization Name

Verification Status
License Verification
Reputation Level
Activity Status
Location

Metrics:
- Rating
- Active Properties
- Response Rate
- Response Time
- Experience

Sections:
- Overview
- Properties
- Services
- Team
- Branches
- Reviews
- About
```

### Business Organization Profile

```
Cover Image
Logo
Company Name

Verification Status
Reputation Level
Activity Status
Availability
Location

Metrics

Sections:
- Overview
- Services
- Specializations
- Projects
- Portfolio
- Team
- Branches
- Reviews
- About
```

### Adaptive Behavior

- Show sections with content
- Hide empty sections
- Prioritize high-value content
- Display relevant metrics
- Include appropriate CTAs

## 10. Profile Strength Integration

Profile strength appears as:
- Progress bar on profile header
- "Complete your profile" prompt
- Field-level completion indicators
- Strength badge (optional)

**Profile strength ≠ Reputation.**

Example:
```
Profile Strength: 100%
Reputation: NEW
```
This is valid and correct.

## 11. Verification Display

Trust Transparency UI:
```
✓ البريد (Email)
✓ الهاتف (Phone)
✓ المنشأة (Organization)
✓ الترخيص (License)
```

**Do NOT display:**
- Document numbers
- Sensitive verification data
- Admin notes
- Internal verification evidence

## 12. Activity Display

Public display:
```
نشط (Active)
نشط مؤخرًا (Recently Active)
نشاط منخفض (Low Activity)
خامل (Inactive)
```

**Do NOT display:**
- Exact last login timestamp (to public)
- Precise activity count
- Internal activity data

## 13. Availability Display

For professionals and organizations:
```
متاح لاستقبال أعمال (Available for work)
متاح بشكل محدود (Limited availability)
غير متاح مؤقتًا (Temporarily unavailable)
```

Activity ≠ Availability.

Valid scenario:
```
Gold
Active
Unavailable
```

## 14. Responsive Behavior

All profile variants:
- Mobile-first design
- Three breakpoints (1100/780/480px)
- Collapsible sections on mobile
- Touch-friendly targets
- RTL/LTR support
- Dark mode support
- Reduced motion support

## 15. Accessibility

All profile variants:
- Semantic HTML
- ARIA labels
- Keyboard navigation
- Screen reader support
- Color contrast (WCAG AA)
- Focus indicators
- Skip links
