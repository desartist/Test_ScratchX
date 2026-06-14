# ScratchX Merchant Dashboard - Implementation Plan

## Current State Audit

### Existing Infrastructure ✅
- **Dashboard API**: `app/api/dashboard/retailer/route.js` exists but returns minimal data
- **Dashboard Service**: `lib/dashboardService.js` exists - needs enhancement
- **RetailerDashboard Component**: Currently shows basic stats + hero card
- **APIs Available**:
  - `/api/subscription/current` - subscription data ✅
  - `/api/stores` - store listings ✅
  - `/api/campaigns` - campaign data ✅
  - `/api/team/members` - team data ✅

### Gaps to Fill
- Dashboard Service doesn't aggregate campaign analytics
- No store performance metrics
- No customer participation data aggregation
- No recent activity feed
- No campaign conversion metrics

## Architecture Design

### 1. Reusable Widget Components
Create modular, reusable widgets that work for both dashboard types:

```
components/dashboards/widgets/
├── OverviewMetrics.js          (Top metrics cards)
├── SubscriptionStatus.js       (Plan info + usage)
├── CampaignPerformance.js      (Campaign list + metrics)
├── StorePerformance.js         (Store list + metrics)
├── ScratchAnalytics.js         (Scratch card usage)
├── CustomerInsights.js         (Participation data)
├── QuickActions.js             (CTA buttons)
├── RecentActivity.js           (Activity feed)
└── EmptyStates.js              (No data states)
```

### 2. Dashboard Layouts
```
components/dashboards/
├── SingleStoreDashboard.js     (Core plan layout)
├── MultiStoreDashboard.js      (Smart plan layout)
└── DashboardShell.js           (Auto-selector)
```

### 3. Enhanced Service Layer
Update `lib/dashboardService.js`:
- `getRetailerDashboard()` → return comprehensive data
- Add aggregation methods for metrics

## Metrics to Display

### Top Metrics Grid
- Total Campaigns | Active Campaigns
- Total Stores | Active Stores
- QR Scans (Month) | Customers Participated
- Coupons Claimed | Conversion %

### Campaign Performance
- Campaign Name, Status, End Date
- Allocated Cards → Remaining Cards
- Total Scans, Participants, Claims
- Conversion %, Trending

### Store Performance (Multi-Store)
- Store Name, Campaign Count
- QR Scans, Participants
- Scratch Allocated, Remaining
- Rankings by: Scans, Customers, Claims

### Scratch Analytics
- Total Allocated, Distributed
- Claimed, Unused, Expired, Remaining
- Visual progress bars

### Customer Insights
- Total Participants, New, Returning
- Most Active Store, Most Active Campaign
- Top Billing Range, Claim Rate

### Subscription Status
- Plan Name (ScratchX Core/Smart)
- Active badge + Days remaining
- Campaign Usage (3/5 used)
- Store Usage (1/1 used)
- Scratch Usage (2800/5000 used)

## Implementation Phases

### Phase 1: Enhance Dashboard Service
**File**: `lib/dashboardService.js`
- Aggregate campaign data
- Calculate conversion metrics
- Fetch store performance
- Compile activity feed

### Phase 2: Create Widget Components
**Folder**: `components/dashboards/widgets/`
- 9 widget components (matching architecture above)
- Match Figma styling exactly
- Use real data from APIs

### Phase 3: Create Dashboard Layouts
**Folder**: `components/dashboards/`
- SingleStoreDashboard.js (for Core plan)
- MultiStoreDashboard.js (for Smart plan)
- DashboardShell.js (auto-detect logic)

### Phase 4: Update Dashboard Page
**File**: `app/(dashboard)/dashboard/page.js`
- Use DashboardShell for automatic detection
- Handle loading/error states
- Responsive layout

### Phase 5: Testing & Polish
- Mobile responsiveness
- Dark mode verification
- Empty state validation
- Error boundary testing

## Data Structure Expected

```javascript
{
  subscription: {
    planName: "Core/Smart",
    status: "active",
    daysRemaining: 24,
    limits: { campaigns: 5, stores: 1, scratches: 5000 },
    usage: { campaigns: 3, stores: 1, scratches: 2800 }
  },
  metrics: {
    totalCampaigns: 8,
    activeCampaigns: 3,
    totalStores: 2,
    activeStores: 2,
    qrScans: 1250,
    customersParticipated: 450,
    couponsClaimed: 320,
    conversionRate: 71.1
  },
  campaigns: [
    {
      id, name, status, endDate,
      allocatedCards, remainingCards,
      totalScans, participants, claims,
      conversionRate, trending
    }
  ],
  stores: [
    {
      id, name, campaignCount,
      qrScans, participants,
      scratchAllocated, scratchRemaining
    }
  ],
  scratch: {
    totalAllocated, distributed,
    claimed, unused, expired, remaining
  },
  customers: {
    totalParticipants, newParticipants, returningCustomers,
    mostActiveStore, mostActiveCampaign,
    topBillingRange, claimRate
  },
  recentActivity: [
    {
      timestamp, type, description, metadata
    }
  ]
}
```

## Figma Matching Requirements

### Single Store Dashboard (Core Plan)
- Hero subscription card (top)
- 4 top metrics cards
- Scratch inventory card
- Campaign performance section
- Recent activity feed

### Multi-Store Dashboard (Smart Plan)
- Hero subscription card (top)
- 4 top metrics cards (multi-store focused)
- Store performance cards grid
- Campaign performance cards
- Scratch analytics section
- Customer insights cards
- Recent activity feed

## Success Criteria

✅ Dashboard auto-detects single vs multi-store
✅ All metrics use real API data
✅ Subscription limits properly displayed
✅ Campaign conversion metrics calculated
✅ Store ranking/performance visible (multi-store)
✅ Activity feed shows real events
✅ Empty states shown appropriately
✅ Mobile responsive (matches Figma)
✅ Dark mode working
✅ Loading skeletons present
✅ Error boundaries in place

## Timeline Estimate

- Phase 1 (Service): 30 min
- Phase 2 (Widgets): 2 hours
- Phase 3 (Layouts): 1.5 hours
- Phase 4 (Integration): 30 min
- Phase 5 (Polish): 1 hour

**Total: ~5.5 hours for complete implementation**

## Notes

- Reuse existing components where possible
- No new dependencies needed (chart library exists)
- Use CSS Modules matching current project style
- Implement loading skeletons for all sections
- Handle offline/error states gracefully
