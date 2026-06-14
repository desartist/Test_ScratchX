# Task 58: Dashboard Redesign - Implementation Plan

**Date**: June 4, 2026  
**Task**: 58 - Dashboard Implementation  
**Status**: Starting Implementation  
**Figma Reference**: Dashboard-Admin page from Figma link  

---

## Current State Analysis

**Component Structure**:
- `RetailerDashboard.js` - Main component, handles data fetching
- `Dashboard.module.css` - Current styling
- Uses `StatCard` component for top metrics
- Uses `ScratchInventoryCard`, `ActiveCampaignsCard`, `CustomerInsightsCard` for main sections

**Current Layout**:
```
Dashboard (flex column, gap 28px)
├─ StatsGrid (4 columns)
│  ├─ Active Campaigns (StatCard)
│  ├─ Total Stores (StatCard)
│  ├─ Total Scans (StatCard)
│  └─ Redemptions (StatCard)
├─ ScratchInventoryCard
├─ ActiveCampaignsCard
└─ CustomerInsightsCard
```

**API Integration**:
- ✅ Fetches from `/api/dashboard/retailer`
- ✅ Uses `useAuthContext` for authentication
- ✅ Has loading/error states
- ✅ All logic preserved

---

## Figma Design Requirements

**New Layout Structure**:
```
Dashboard
├─ Header Section
│  ├─ Title: "MERCHANT DASHBOARD"
│  ├─ Subtitle: "Overview"
│  └─ Background: White, padding 20px
├─ Stat Cards Row (4 cards in grid)
│  ├─ Active Campaigns (navy left border)
│  ├─ Total Stores (teal left border)
│  ├─ Total Scans (green left border)
│  └─ Redemptions (orange left border)
├─ Scratch Inventory Card
│  └─ Purple gradient background, left side shows large number, right side shows progress
├─ Charts Section (placeholder for now)
│  └─ "Scratch Consumption" with bar chart visualization
└─ Active Campaigns Section
   └─ Campaign cards in grid with charts
```

**Color Changes**:
- Orange primary: #FFA500 (from #ef9e1b)
- Navy: #010F44 (already correct)
- Teal accent: #00B0B1 (already correct)
- Purple gradient for inventory: #8B5CF6 → #6366F1
- Card borders: light gray #E0E0E0

**Spacing Changes**:
- Container padding: 24px (current 24px - OK)
- Section gaps: 28px (current - OK)
- Card padding: 20px (current - OK)
- Stat card grid gap: 16px (from 20px - smaller)

**Typography Changes**:
- Page title: 28px, 800 weight (from current)
- "Overview" subtitle: 12px, 500 weight, uppercase, gray

---

## Implementation Changes

### 1. Update Dashboard.module.css

**Changes**:
```css
/* Add header section styling */
.dashboardHeader {
  background: #ffffff;
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
  margin: -24px -24px 0 -24px;  /* Extend to edges */
}

.dashboardTitle {
  font-size: 28px;
  font-weight: 800;
  color: #010f44;
  margin: 0;
  font-family: var(--font-afacad);
}

.dashboardSubtitle {
  font-size: 12px;
  font-weight: 500;
  color: #637080;
  text-transform: uppercase;
  margin: 8px 0 0 0;
  letter-spacing: 0.5px;
  font-family: var(--font-afacad);
}

/* Update statsGrid for better spacing */
.statsGrid {
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;  /* reduced from 20px */
}

/* Add ScratchInventoryCard styling (purple gradient) */
.scratchInventorySection {
  background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%);
  border-radius: 10px;
  padding: 28px;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
}

.inventoryLeft {
  flex: 0 0 auto;
}

.inventoryTitle {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  font-family: var(--font-afacad);
}

.inventoryNumber {
  font-size: 48px;
  font-weight: 800;
  margin-bottom: 8px;
  line-height: 1;
  font-family: var(--font-afacad);
}

.inventoryLabel {
  font-size: 12px;
  font-weight: 400;
  opacity: 0.9;
  font-family: var(--font-afacad-flux);
}

.inventoryRight {
  flex: 0 0 auto;
  width: 200px;
}

.usedCount {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 12px;
  font-family: var(--font-afacad);
}

.progressBar {
  height: 8px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 12px;
}

.progressFill {
  height: 100%;
  background: linear-gradient(90deg, #FCD34D, #F59E0B);
  width: 70%;  /* will be dynamic */
  border-radius: 4px;
}

.percentage {
  font-size: 14px;
  font-weight: 600;
  color: #FCD34D;
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: var(--font-afacad);
}

/* Chart section */
.chartsSection {
  background: white;
  padding: 24px;
  border-radius: 10px;
  border: 1px solid #e0e0e0;
  margin-bottom: 28px;
}

.sectionTitle {
  font-size: 16px;
  font-weight: 600;
  color: #010f44;
  margin-bottom: 16px;
  font-family: var(--font-afacad);
}

.chartPlaceholder {
  height: 200px;
  background: linear-gradient(90deg, #f5f5f5 0%, #f5f5f5 25%, #f0f0f0 50%, #f5f5f5 75%, #f5f5f5 100%);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 14px;
}

/* Responsive updates */
@media (max-width: 1200px) {
  .statsGrid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .scratchInventorySection {
    flex-direction: column;
  }
  
  .inventoryRight {
    width: 100%;
    margin-top: 16px;
  }
}

@media (max-width: 600px) {
  .statsGrid {
    grid-template-columns: 1fr;
  }
  
  .dashboardHeader {
    margin: -20px -20px 0 -20px;
  }
  
  .scratchInventorySection {
    padding: 20px;
  }
  
  .inventoryNumber {
    font-size: 36px;
  }
}
```

### 2. Update RetailerDashboard.js

**Changes**:
- Add header section JSX
- Rename StatsGrid to match new layout
- Add header styling
- Update grid layout (still keep same card components)
- Add placeholder for charts section
- Update responsive breakpoints

**New JSX Structure**:
```jsx
return (
  <div className={styles.dashboard}>
    {/* Header Section */}
    <div className={styles.dashboardHeader}>
      <h1 className={styles.dashboardTitle}>Merchant Dashboard</h1>
      <p className={styles.dashboardSubtitle}>Overview</p>
    </div>

    {/* Stat Cards */}
    <div className={styles.statsGrid}>
      <StatCard ... />
      <StatCard ... />
      <StatCard ... />
      <StatCard ... />
    </div>

    {/* Scratch Inventory Card */}
    <div className={styles.scratchInventorySection}>
      <div className={styles.inventoryLeft}>
        <div className={styles.inventoryTitle}>Scratch Inventory</div>
        <div className={styles.inventoryNumber}>2,580</div>
        <div className={styles.inventoryLabel}>Scratches Remaining</div>
      </div>
      <div className={styles.inventoryRight}>
        <div className={styles.usedCount}>7,420 Used</div>
        <div className={styles.progressBar}>
          <div className={styles.progressFill}></div>
        </div>
        <div className={styles.percentage}>⚡ 18%</div>
      </div>
    </div>

    {/* Charts Section */}
    <div className={styles.chartsSection}>
      <h2 className={styles.sectionTitle}>Scratch Consumption</h2>
      <div className={styles.chartPlaceholder}>
        Chart visualization will be added here
      </div>
    </div>

    {/* Active Campaigns */}
    <div>
      <h2 className={styles.sectionTitle}>Active Campaigns</h2>
      <ActiveCampaignsCard />
    </div>
  </div>
);
```

---

## Files to Modify

### 1. `components/dashboards/Dashboard.module.css`
- Add header styling
- Update statsGrid spacing
- Add scratchInventorySection styling
- Add chartsSection styling
- Update responsive breakpoints

### 2. `components/dashboards/RetailerDashboard.js`
- Add header JSX
- Restructure layout JSX
- Update className references
- Keep all API logic unchanged

### 3. `components/dashboard/StatCard.module.css` (minor update)
- Ensure card styling matches Figma (white background, light border, no heavy shadow)
- Verify left border colors are correct

---

## Logic Preservation Checklist

✅ **DO NOT CHANGE**:
- API call to `/api/dashboard/retailer`
- Data fetching logic in `useEffect`
- Error handling
- Loading states
- Authentication check
- StatCard component logic
- ScratchInventoryCard component (keep as is, just restyled)
- ActiveCampaignsCard component (keep as is)

✅ **ONLY CHANGE**:
- CSS styling (colors, spacing, layout)
- JSX structure (add header, reorganize sections)
- classNames to reference new CSS classes
- Responsive breakpoints if needed

---

## Color Mapping (Figma → CSS)

| Element | Figma Color | CSS Value | Token |
|---------|-------------|-----------|-------|
| Primary | Orange | #FFA500 | --color-primary (needs update) |
| Navy | Navy | #010F44 | --color-navy (correct) |
| Teal | Teal | #00B0B1 | --color-teal (correct) |
| Green | Green | #0A8905 | --color-growth (correct) |
| Inventory BG | Purple gradient | linear-gradient(135deg, #8B5CF6, #6366F1) | New |
| Progress | Gold/Orange | linear-gradient(90deg, #FCD34D, #F59E0B) | New |
| Card BG | White | #FFFFFF | --color-white |
| Card Border | Light Gray | #E0E0E0 | --color-gray-medium |
| Text Primary | Navy | #010F44 | --color-navy |
| Text Secondary | Gray | #637080 | --color-muted |

---

## Implementation Steps

1. ✅ Read current implementation
2. ⏳ Update `Dashboard.module.css` with new styling
3. ⏳ Update `RetailerDashboard.js` with new JSX structure
4. ⏳ Update `StatCard.module.css` if needed for left border colors
5. ⏳ Test responsive design at 1024px, 768px, 480px, 320px
6. ⏳ Verify all data displays correctly
7. ⏳ Dark mode testing

---

**Status**: ✅ Analysis Complete  
**Next**: Proceed with CSS and JSX updates

