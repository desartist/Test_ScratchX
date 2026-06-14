# Task 59: Campaign Listing Redesign - Implementation Plan

**Date**: June 4, 2026  
**Task**: 59 - Campaign Listing Implementation  
**Status**: Starting Implementation  
**Figma Reference**: Campaign Listing Page from Figma link (Page 8)

---

## Current State Analysis

**Component Structure**:
- `app/(dashboard)/campaign/page.js` - Main component, handles data fetching and filtering
- `campaign.module.css` - Existing styling (already well-structured)
- Uses `CampaignCard` component for display
- Uses `CampaignSearch` and `CampaignFilter` components

**Current Layout**:
```
Campaign Page (flex column, gap 2rem)
├─ Header (title, subtitle, create button)
├─ Stats Bar (Total, Active, Search Results)
├─ Filter Section
│  ├─ CampaignSearch (search input)
│  └─ CampaignFilter (status tabs)
├─ Campaign Cards Grid
└─ Empty/Error states
```

**API Integration**:
- ✅ Fetches from `/api/campaigns` with auth headers
- ✅ Implements filtering by status (all, active, low-scratches, ending-soon, ended, draft)
- ✅ Implements search by name or ID
- ✅ Has loading/error states
- ✅ All logic preserved

---

## Figma Design Requirements

**Header Section** (NEW/Enhanced):
- Title: "Campaigns" (28px, 800 weight, navy)
- Subtitle: "Manage your campaigns and track performance" (14px, 400 weight, gray)
- Background: White with bottom border
- Create Campaign button: Navy background, top right positioned

**Stats Section**:
- 3 stat boxes showing:
  - Total Campaigns (count)
  - Active (count)
  - Search Results (count)
- Labels below values
- White background, light border styling

**Search Section**:
- Full-width search input
- Magnifying glass icon
- Placeholder: "Search campaigns..."
- Responsive sizing

**Filter/Tab Section**:
- Horizontal tabs for: ALL, ACTIVE, LOW SCRATCHES, ENDING SOON, ENDED, DRAFT
- Active tab styling (navy underline or background)
- Responsive: scrolls horizontally on mobile

**Campaign Card Grid**:
- 3 columns on desktop (1024px+)
- 2 columns on tablet (768px-1023px)
- 1 column on mobile (< 768px)
- 20px gap between cards
- White cards with light borders and left accent borders
- Card shadow on hover

**Color Scheme** (from Figma):
- Orange primary: #FFA500
- Navy secondary: #010F44
- Teal accent: #00B0B1
- Green: #0A8905
- Gray borders: #E0E0E0
- White cards: #FFFFFF
- Muted text: #637080

---

## CSS Verification (campaign.module.css)

**Current State Check**:
- ✅ `.container` - flex column, max-width, padding, gap - GOOD
- ✅ `.header` - space-between layout, flex wrap - GOOD
- ✅ `.headerContent` - flex column, gap - GOOD
- ✅ `.title` - 2rem (32px), 800 weight, navy - NEEDS ADJUSTMENT (should be 28px)
- ✅ `.subtitle` - 0.875rem (14px), gray - GOOD
- ✅ `.createButton` - navy background, white text - GOOD
- ✅ `.statsGrid` - 4 columns (needs review, should be 3 for stats bar)
- ✅ `.statsBar` - flex row, light background - GOOD
- ✅ `.filterSection` - flex column, gap - GOOD
- ✅ `.cardGrid` - grid with auto-fill minmax - GOOD (responsive)
- ✅ `.noResults` - empty state styling - GOOD
- ⚠️ Title sizing: 2rem = 32px, but Figma shows 28px

**CSS Updates Needed**:
1. Update `.title` from `2rem` to `28px` (1.75rem) for campaign page
2. Verify `.statsGrid` uses correct column count for the stats bar display
3. Ensure card grid responsive breakpoints match Figma (3-2-1 columns)
4. Dark mode support already present

---

## JSX Implementation Changes

**Current JSX Structure** (from campaign/page.js):
```jsx
<div className={styles.container}>
  <div className={styles.header}>
    <div className={styles.headerContent}>
      <h1 className={styles.title}>Campaigns</h1>
      <p className={styles.subtitle}>Manage your campaigns and track performance</p>
    </div>
    <button className={styles.createButton} onClick={...}>Create Campaign</button>
  </div>

  <div className={styles.statsBar}>
    <div className={styles.statItem}>
      <span className={styles.statLabel}>Total Campaigns</span>
      <span className={styles.statValue}>{stats.total}</span>
    </div>
    ...
  </div>

  <div className={styles.filterSection}>
    <CampaignSearch ... />
    <CampaignFilter ... />
  </div>

  <div className={styles.cardGrid}>
    {filteredCampaigns.map(campaign => (
      <CampaignCard key={campaign._id} {...campaign} />
    ))}
  </div>
</div>
```

**Alignment Status**:
- ✅ Header structure is correct
- ✅ Stats bar structure is correct
- ✅ Filter section structure is correct
- ✅ Card grid structure is correct
- ✅ All elements properly organized
- ✅ No changes needed to JSX logic - only styling alignment

---

## Implementation Strategy

### Phase 1: CSS Refinement (campaign.module.css)
**Changes Required**:
1. ✅ Verify title font size (28px for campaigns page)
2. ✅ Verify stats bar styling matches Figma
3. ✅ Verify search input styling
4. ✅ Verify tab/filter styling
5. ✅ Verify card grid responsive columns (3-2-1)
6. ✅ Add/verify dark mode support for all sections

### Phase 2: JSX Review (campaign/page.js)
**Changes Required**:
- ✅ Verify header is using correct classes
- ✅ Verify stats bar is displaying correctly
- ✅ Verify filter section layout is clean
- ✅ Verify card grid styling
- ✅ Preserve ALL API calls and logic

### Phase 3: Component Updates (if needed)
- CampaignCard.module.css: Verify white background, left border styling
- CampaignSearch styling: Verify input styling matches Figma
- CampaignFilter styling: Verify tab styling matches Figma

---

## Files to Modify

### 1. `app/(dashboard)/campaign/campaign.module.css`
**Current Status**: ✅ WELL-STRUCTURED - Minor tweaks needed
- Title font size review (28px requirement)
- Ensure responsive grid columns (3-2-1)
- Verify all color tokens match Figma
- Dark mode validation

### 2. `app/(dashboard)/campaign/page.js`
**Current Status**: ✅ GOOD STRUCTURE - No major changes needed
- Use proper CSS classes (already doing this)
- Preserve all API logic
- Preserve filter/search logic
- Only styling alignment needed

### 3. `components/campaign/CampaignCard.module.css`
**Current Status**: ⏳ NEEDS REVIEW
- White background (#ffffff)
- Light border (#e0e0e0)
- Left border colors (varies by status)
- Card shadow on hover
- Responsive sizing

---

## Logic Preservation Checklist

✅ **DO NOT CHANGE**:
- API call to `/api/campaigns`
- Data fetching logic in `useEffect`
- Filter logic (by status: all, active, low-scratches, ending-soon, ended, draft)
- Search logic (by campaignName or _id)
- Error handling
- Loading states
- Authentication headers (x-user-id, x-user-role)
- CampaignCard component logic
- CampaignSearch component logic
- CampaignFilter component logic

✅ **ONLY CHANGE**:
- CSS styling (colors, spacing, layout, typography)
- Responsive breakpoints if needed
- classNames to reference correct CSS classes
- Visual alignment with Figma (no logic changes)

---

## Responsive Breakpoints (from Figma)

| Breakpoint | Stat Grid | Card Grid | Filter |
|-----------|-----------|-----------|---------|
| 1024px+ (desktop) | 3 cols | 3 cols | Horizontal |
| 768px-1023px (tablet) | 2 cols | 2 cols | Horizontal (scrollable) |
| 480px-767px (mobile) | 1 col | 1 col | Horizontal (scrollable) |
| < 480px (small mobile) | 1 col | 1 col | Vertical |

---

## Color Mapping (Figma → CSS)

| Element | Figma Color | CSS Value | Purpose |
|---------|-------------|-----------|---------|
| Title | Navy | #010F44 | Page title |
| Subtitle | Muted Gray | #637080 | Secondary text |
| Card Background | White | #FFFFFF | Card base |
| Card Border | Light Gray | #E0E0E0 | Card edge |
| Left Border (Primary) | Orange | #FFA500 | Active campaigns |
| Left Border (Secondary) | Navy | #010F44 | Default |
| Left Border (Teal) | Teal | #00B0B1 | Alternate |
| Left Border (Green) | Green | #0A8905 | Success state |
| Button Background | Navy | #010F44 | Create button |
| Button Text | White | #FFFFFF | Button label |
| Tab Active | Navy | #010F44 | Active filter |
| Tab Border | Light Gray | #E0E0E0 | Border |

---

## Implementation Steps

1. ⏳ Review `campaign.module.css` for Figma alignment
2. ⏳ Update CSS if needed (title size, spacing, colors)
3. ⏳ Verify `campaign/page.js` structure
4. ⏳ Review `CampaignCard.module.css` styling
5. ⏳ Test responsive design at all breakpoints
6. ⏳ Verify dark mode support
7. ⏳ Test all filtering and search logic
8. ⏳ Create TASK_59_COMPLETION.md

---

## Expected Outcome

**Visual Changes**:
- ✅ Campaign listing page matches Figma design
- ✅ Header with title and subtitle properly styled
- ✅ Stats bar showing correct metrics
- ✅ Search and filter section properly laid out
- ✅ Campaign cards in responsive grid (3-2-1 columns)
- ✅ Proper spacing and typography throughout
- ✅ Dark mode support

**Functional Changes**:
- ⭕ NONE - All existing logic preserved

---

**Status**: ✅ Analysis Complete  
**Next**: Proceed with CSS verification and JSX review

