# Ad Placement Classification

Classification of all 47 ad placements into standardized categories.

## Placement Categories

### 1. Global Placements (9)

| Placement | Shape | Sections | Usage |
|-----------|-------|----------|-------|
| `global_header` | horizontal | All | Top banner across all pages |
| `below_header` | horizontal | All | Below header banner |
| `global_footer` | horizontal | All | Footer banner |
| `between_sections` | horizontal | All | Between content sections |
| `floating_bottom` | floating | All | Fixed bottom banner |
| `floating_side` | floating | All | Fixed side banner |
| `mobile_sticky` | floating | All | Mobile sticky banner |
| `popup` | popup | All | Modal/overlay ad |
| `side_left` | vertical | Home | Left sidebar (desktop only) |
| `side_right` | vertical | Home | Right sidebar (desktop only) |

### 2. Property Placements (12)

| Placement | Shape | Usage |
|-----------|-------|-------|
| `property_details_top` | horizontal | Top of property details |
| `property_after_gallery` | horizontal | After image gallery |
| `property_below_price` | horizontal | Below price section |
| `property_after_description` | horizontal | After description |
| `property_before_features` | horizontal | Before features list |
| `property_after_features` | horizontal | After features list |
| `property_before_map` | horizontal | Before map section |
| `property_after_map` | horizontal | After map section |
| `property_sidebar_top` | vertical | Sidebar top |
| `property_sidebar_middle` | vertical | Sidebar middle |
| `property_sidebar_bottom` | vertical | Sidebar bottom |
| `property_before_similar` | horizontal | Before similar properties |
| `property_after_similar` | horizontal | After similar properties |

### 3. Listing Placements (5)

| Placement | Shape | Usage |
|-----------|-------|-------|
| `listing_top` | horizontal | Top of listing page |
| `listing_after_filters` | horizontal | After filter sidebar |
| `listing_between_items` | horizontal | Between list items |
| `listing_sidebar` | vertical | Listing sidebar |
| `listing_bottom` | horizontal | Bottom of listing page |

### 4. Service Placements (3)

| Placement | Shape | Usage |
|-----------|-------|-------|
| `service_details_top` | horizontal | Top of service details |
| `service_after_description` | horizontal | After service description |
| `service_sidebar` | vertical | Service sidebar |

### 5. Office Placements (3)

| Placement | Shape | Usage |
|-----------|-------|-------|
| `office_profile_top` | horizontal | Top of office profile |
| `office_profile_sidebar` | vertical | Office profile sidebar |
| `office_after_properties` | horizontal | After office properties |

### 6. Tool Placements (4)

| Placement | Shape | Usage |
|-----------|-------|-------|
| `tool_details_top` | horizontal | Top of tool details |
| `tool_after_gallery` | horizontal | After tool gallery |
| `tool_after_description` | horizontal | After tool description |
| `tool_sidebar` | vertical | Tool sidebar |

## Standardized Shapes

### Horizontal (24 placements)
- Standard banner format (728x90 or responsive)
- Used for top/bottom/inline placements
- Max-width: 728px

### Vertical (8 placements)
- Sidebar format (300x250 or responsive)
- Used for sidebar placements
- Max-width: 300px

### Floating (4 placements)
- Fixed position format
- Used for bottom/side/mobile sticky
- Responsive width

### Popup (1 placement)
- Modal/overlay format
- Used for interstitial ads
- Centered on screen

## Ad Slot Variants

### Standard Variants

| Variant | CSS Class | Usage |
|---------|-----------|-------|
| `horizontal` | `ad-slot-horizontal` | Standard banner |
| `vertical` | `ad-slot-vertical` | Sidebar banner |
| `floating` | `ad-slot-floating` | Fixed position |
| `popup` | `ad-slot-popup` | Modal overlay |

### Size Constraints

| Variant | Min Height | Max Width | Aspect Ratio |
|---------|------------|-----------|--------------|
| `horizontal` | 96px | 728px | ~7:1 |
| `vertical` | 320px | 300px | ~3:4 |
| `floating` | 64px | 100% | Responsive |
| `popup` | 240px | 480px | ~2:1 |

## Implementation Guidelines

### 1. Use Standardized Variants
```tsx
<AdSlot
  placement="global_header"
  variant="horizontal"
  locale={locale}
  country={country}
/>
```

### 2. Respect Shape Constraints
- Horizontal: Full width, fixed height
- Vertical: Fixed width, flexible height
- Floating: Fixed position, responsive
- Popup: Centered, fixed size

### 3. Responsive Behavior
- Desktop: Show all placements
- Tablet: Hide some sidebar placements
- Mobile: Hide floating side, show mobile sticky

### 4. Performance
- Lazy load non-critical placements
- Use `eager` for above-the-fold ads
- Implement viewability tracking

## Migration Notes

### Current State
- 47 placements defined in `AD_PLACEMENTS`
- Inconsistent shapes and sizes
- No standardized responsive behavior

### Target State
- Standardized shapes (horizontal, vertical, floating, popup)
- Consistent responsive behavior
- Performance optimized
- Viewability tracking

### Migration Steps
1. Classify all placements (done)
2. Update AdSlot component to use standardized variants
3. Update CSS for consistent styling
4. Test responsive behavior
5. Implement viewability tracking
