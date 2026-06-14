# Campaign Listing Redesign - From Visual Mockups

**Date**: June 4, 2026  
**Task**: Redesign Campaign Listing to match provided mobile and desktop mockups  
**Status**: Analysis & Planning  

---

## Visual Design Analysis

### **Mobile Design (from provided screenshot):**
1. **Header**: "Campaigns" title with search icon
2. **Search Bar**: Full-width with magnifying glass icon
3. **Filter Tabs**: Horizontal scrollable tabs
   - Active, Low Scratches, Ending Soon, Ended
   - Active state: Blue/purple background
4. **Campaign Cards**: Single column, card-based
   - Campaign name (large, bold)
   - Date range below name
   - Status badge (green for "Active", red for "Ending Soon", etc.)
   - Days left in red text (e.g., "61 days left")
   - Stores count with icon
   - Scans count with icon
   - Scratch Allocation progress bar
   - Used/Total indicator below progress bar
5. **Action Menu**: Dots menu with options (View, Edit, Email, etc.)

### **Desktop Design (current screenshot):**
- Has similar structure but wider layout
- Create Campaign button top right
- Stats bar showing Total, Active, Search Results
- Tab filtering section
- Campaign cards in grid (appears to be 1 column)

### **Key Styling Observations:**
- Cards have clear visual hierarchy
- Progress bars show allocation (e.g., "330 / 2,000")
- Status indicators are color-coded
- Compact, information-dense card design
- Mobile-first responsive approach
- Action menu (three dots) for additional actions

---

## Design Requirements (from mockups)

### **Card Layout Structure:**
```
┌─────────────────────────────────┐
│ Campaign Name                   │
│ Date Range (DD MM YYYY - ...)   │
│                                 │
│ Days Left (in red)    Active    │
│                      (badge)     │
│                                 │
│ 61 days left  │ 4 Stores        │
│               │ 1390 k1,999     │
│                                 │
│ Scratch Allocation              │
│ ████████─────── 330 / 2,000     │
│                                 │
│ [View] [Edit] [Email] ...menu   │
└─────────────────────────────────┘
```

### **Color Scheme (from mockups):**
- Active badge: Green (#10b981 or similar)
- Ending Soon badge: Red/Pink
- Days remaining: Red text
- Progress bar: Blue/Purple gradient
- Card background: White
- Text: Dark navy/gray

### **Typography:**
- Campaign name: 18px, 600-700 weight
- Date: 13px, 400 weight, gray
- Days/Stores/Scans: 14px, 500 weight
- Progress label: 12px, 400 weight

### **Spacing:**
- Card padding: 20px
- Card gap: 16px
- Between sections: 8-12px

### **Key Components:**
1. Campaign name header
2. Date range
3. Status badge (color-coded)
4. Days remaining counter (red)
5. Stores count
6. Scans count
7. Scratch allocation bar with numbers
8. Action menu button

---

## Current vs. Desired Changes

### **Current Design Issues:**
1. ❌ Stats bar at top (Total, Active, Search Results) - not in mockup
2. ❌ Campaign card layout - different from mockup
3. ❌ No clear days remaining display in red
4. ❌ Status badge styling different
5. ❌ Progress bar styling/positioning
6. ❌ Action buttons at bottom instead of menu

### **Desired Design (from mockups):**
1. ✅ Simple header with title and search
2. ✅ Filter tabs for status
3. ✅ Card-based campaign listing
4. ✅ Days remaining prominent in red
5. ✅ Color-coded status badges
6. ✅ Progress bar showing allocation
7. ✅ Action menu (three dots)
8. ✅ Compact, information-dense cards

---

## Implementation Plan

### **Phase 1: CSS Updates** (campaign.module.css)
- Remove stats bar styling if not needed
- Update card styling to match mockup
- Add progress bar with allocation display
- Update color scheme for badges and text
- Responsive adjustments for mobile

### **Phase 2: JSX Updates** (campaign/page.js)
- Remove/hide stats bar if not needed
- Restructure campaign card layout
- Add days remaining display in red
- Implement action menu component
- Update responsive layout

### **Phase 3: Campaign Card Component** (CampaignCard.js)
- Restructure card to match mockup layout
- Add days remaining display
- Update status badge styling
- Implement allocation bar display
- Add action menu dropdown

---

## Responsive Breakpoints

**Mobile (< 768px):**
- Single column cards
- Full-width layout
- Touch-friendly buttons
- Horizontal scrolling tabs

**Tablet (768px - 1024px):**
- 1-2 column grid
- Adjusted card sizing

**Desktop (> 1024px):**
- 2 column grid (or single, based on mockup)
- Wider cards with more information
- Side-by-side layout for stats

---

## Files to Modify

1. `app/(dashboard)/campaign/campaign.module.css`
2. `app/(dashboard)/campaign/page.js`
3. `components/dashboard/CampaignCard.js`
4. `components/dashboard/CampaignCard.module.css`

---

## Next Steps

1. Update CSS styling for campaign cards
2. Restructure JSX layout in campaign/page.js
3. Update CampaignCard component and styling
4. Test responsive design
5. Verify all functionality preserved

