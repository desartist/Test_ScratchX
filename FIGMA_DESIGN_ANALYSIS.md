# Figma Design Analysis - ScratchX Platform

**Date**: June 4, 2026  
**Reference**: https://www.figma.com/design/K98XasrbuaVfBxiN4BovzA/ScractchX_Proto--Copy-  
**Status**: Phase 3 - Figma Implementation

---

## 1. Current Project Architecture

### Technology Stack
- **Framework**: Next.js 16.2.3 (App Router)
- **Styling**: CSS Modules (no Tailwind, no inline styles)
- **State Management**: React Context API
- **Component Library**: Custom component library
- **Icons**: Lucide React
- **Fonts**: Afacad, Afacad Flux (imported in globals.css)

### Project Structure
```
app/
├── (dashboard)/          # Merchant-facing pages
│   ├── dashboard/        # Main dashboard
│   ├── campaign/         # Campaign listing & management
│   ├── stores/           # Store management
│   ├── settings/         # Settings pages
│   └── ...
├── (client)/             # Customer-facing pages
│   ├── scan/            # QR code scanning
│   ├── coupon/          # Coupon redemption
│   └── ...
└── api/                  # Backend APIs (DO NOT TOUCH)

components/
├── dashboard/            # Dashboard-specific components
│   ├── Badge.js         # Status labels (Phase 2)
│   ├── ProgressBar.js   # Progress indicators (Phase 2)
│   ├── StatCard.js      # Stat display cards (Phase 2)
│   ├── CampaignCard.js  # Campaign cards
│   └── ...
├── customer/            # Customer-facing components
│   ├── LocationStatus.js      # Location verification (Phase 2)
│   ├── CountdownTimer.js      # Expiry countdown (Phase 2)
│   ├── ScratchCard.js         # Scratch card interaction
│   └── ...
├── common/              # Shared components
│   ├── FormButton.js    # Updated (Phase 2)
│   ├── FormInput.js     # Updated (Phase 2)
│   ├── Modal.js         # Updated (Phase 2)
│   └── ...
└── layouts/
    └── DashboardLayout.js  # Updated (Phase 2)
```

---

## 2. Design System (Phase 2 Implementation)

### Colors (CSS Variables in globals.css)
```css
--color-primary: #ef9e1b (orange)
--color-primary-hover: #d98e14
--color-navy: #010f44
--color-navy-active: #01188e
--color-teal: #00b0b1
--color-dark-navy: #032c5a
--color-growth: #0a8905 (green)
--color-muted: #637080
--color-muted-2: #595858
--color-border: rgba(0,0,0,0.1)
--color-lavender-bg: #e0e4ff
--color-page-bg: #fcfdff
--color-card-bg: #f8f8f8

/* Dark Mode */
@media (prefers-color-scheme: dark) {
  --color-primary: #ef9e1b
  --color-page-bg: #0a0a0a
  --color-card-bg: #1a1a1a
  /* etc... */
}
```

### Typography
- **Font Family**: Afacad (headings), Afacad Flux (body)
- **Heading Sizes**: 18px - 32px (responsive)
- **Body Sizes**: 12px - 16px
- **Font Weights**: 400 (regular), 500 (medium), 600 (semibold), 700 (bold), 800 (extrabold)

### Spacing
- **Base Unit**: 8px
- **Common**: 8px, 12px, 16px, 20px, 24px, 28px, 32px, 40px

### Shadows
- **Card**: 0 6px 10px 3px rgba(0,0,0,0.06)
- **Hover**: 0 6px 16px rgba(x,x,x,0.3)

### Border Radius
- **Card**: 10px
- **Button**: 6px-8px
- **Input**: 6px

### Animations
- **Transitions**: 0.2s - 0.3s ease
- **Hover Effects**: translateY(-2px), box-shadow
- **Loading**: Spinners (1s linear infinite)

---

## 3. Component Library (Phase 2)

### New Components Created

#### Badge Component
- **Purpose**: Status labels for campaigns, stores
- **Variants**: default, active, ending-soon, ended, pending, warning, success
- **Sizes**: small, medium, large
- **Status**: ✅ Complete (Phase 2)
- **File**: `components/dashboard/Badge.js`

#### ProgressBar Component
- **Purpose**: Show allocation progress with states
- **States**: normal (>20%), warning (≤20%), critical (≤10%)
- **Features**: Percentage display, warning/critical icons, animations
- **Status**: ✅ Complete (Phase 2)
- **File**: `components/dashboard/ProgressBar.js`

#### StatCard Component
- **Purpose**: Display metrics (campaigns, stores, scans, redemptions)
- **Variants**: default, primary, success, warning, danger
- **Sizes**: small, medium, large
- **Features**: Loading skeleton, trend indicators
- **Status**: ✅ Complete (Phase 2)
- **File**: `components/dashboard/StatCard.js`

#### LocationStatus Component
- **Purpose**: Geolocation verification UI for customer flows
- **States**: verifying, verified, error
- **Features**: Spinner, checkmark, error icon, retry button, coordinates display
- **Status**: ✅ Complete (Phase 2)
- **File**: `components/customer/LocationStatus.js`

#### CountdownTimer Component
- **Purpose**: Expiry countdown with color transitions
- **Features**: Color changes (green→yellow→red), pulse animations, urgent message
- **Status**: ✅ Complete (Phase 2)
- **File**: `components/customer/CountdownTimer.js`

### Updated Components

#### FormButton
- **Updates**: Orange gradient (#ef9e1b → #d98e14), smooth hover effects, dark mode
- **Status**: ✅ Complete (Phase 2)

#### FormInput
- **Updates**: Focus border color, error styling, disabled state, dark mode
- **Status**: ✅ Complete (Phase 2)

#### Modal
- **Updates**: Design system colors, orange focus outline, dark mode
- **Status**: ✅ Complete (Phase 2)

#### DashboardLayout
- **Updates**: Responsive header, logo gradient, dark mode
- **Status**: ✅ Complete (Phase 2)

---

## 4. Pages & Routes

### Merchant Dashboard Pages

#### `/dashboard` - Main Dashboard
- **Components**: 
  - StatCard grid (4 metrics)
  - Campaign overview cards
  - Inventory display
  - Customer insights
- **Status**: Partially updated (Phase 2)
- **Current**: Uses StatCard for metrics
- **Need**: Verify layout matches Figma exactly

#### `/campaign` - Campaign Listing
- **Components**: 
  - Search & filters
  - CampaignCard (with Badge, ProgressBar)
  - Responsive grid
- **Status**: Partially updated (Phase 2)
- **Current**: Uses Badge and ProgressBar
- **Need**: Verify grid layout, spacing, responsiveness

#### `/campaign/new` - Create Campaign
- **Components**: 
  - Multi-step form (or single form)
  - FormButton with gradient
  - Step indicators
- **Status**: Partially updated (Phase 2)
- **Current**: Button styling updated
- **Need**: Verify form layout, spacing, typography

#### `/campaign/:id/live` - Campaign Live
- **Components**: 
  - Campaign info card
  - QR code display
  - Download button (orange gradient)
  - Action buttons
- **Status**: Partially updated (Phase 2)
- **Current**: Button styling updated
- **Need**: Verify layout, card styling, spacing

#### `/stores` - Store Management
- **Components**: 
  - StoreCard (with Badge)
  - Store location display
  - Responsive grid
- **Status**: Partially updated (Phase 2)
- **Current**: Uses Badge component
- **Need**: Verify grid layout, card styling, responsiveness

### Customer-Facing Pages

#### `/scan/:campaignId` - Customer Scan
- **Components**: 
  - Customer info form
  - LocationStatus component
  - Two-button flow (Verify → Show Coupons)
  - Mobile-optimized (430px base)
- **Status**: Partially updated (Phase 2)
- **Current**: LocationStatus integrated
- **Need**: Verify form layout, mobile optimization

#### `/scan/:campaignId/scratch` - Scratch Card
- **Components**: 
  - ScratchCard component (with CountdownTimer)
  - Reward reveal
  - Redemption buttons
- **Status**: Partially updated (Phase 2)
- **Current**: CountdownTimer integrated
- **Need**: Verify card styling, animations, mobile layout

#### `/coupon/:couponId` - Coupon Screen
- **Components**: 
  - Coupon card
  - CountdownTimer
  - Terms section
  - Redeem button
- **Status**: Created (Phase 2)
- **Current**: Full mobile-first design
- **Need**: Verify against Figma

---

## 5. Current vs Figma Alignment Status

### ✅ Completed (Phase 2)
- [x] All 5 new components created (Badge, ProgressBar, StatCard, LocationStatus, CountdownTimer)
- [x] 4 shared components updated (FormButton, FormInput, Modal, DashboardLayout)
- [x] Mobile-first design (430px base)
- [x] Full dark mode support
- [x] Responsive breakpoints (320px, 480px, 768px, 1024px+)
- [x] Design tokens (colors, typography, spacing)
- [x] CSS Modules (no inline styles, no Tailwind)

### ⚠️ Needs Figma Verification
- [ ] Dashboard layout (verify exact spacing, card positioning)
- [ ] Campaign grid layout (verify auto-fill, gaps)
- [ ] Campaign card styling (verify badge position, progress bar)
- [ ] Store grid & card styling
- [ ] Create campaign form layout
- [ ] Campaign live page layout
- [ ] Customer scan page (mobile optimization)
- [ ] Scratch card styling
- [ ] Coupon screen styling
- [ ] All hover/active/focus states
- [ ] All button styling
- [ ] All input/form styling
- [ ] Typography sizes & weights
- [ ] Color accuracy (hexes vs Figma)
- [ ] Shadow effects
- [ ] Animations & transitions

---

## 6. Key Files to Update

### Phase 2 Files (Already Modified)
- ✅ `app/globals.css` - Design tokens
- ✅ `components/dashboard/Badge.js` & `.module.css`
- ✅ `components/dashboard/ProgressBar.js` & `.module.css`
- ✅ `components/dashboard/StatCard.js` & `.module.css`
- ✅ `components/customer/LocationStatus.js` & `.module.css`
- ✅ `components/customer/CountdownTimer.js` & `.module.css`
- ✅ `components/common/FormButton.module.css`
- ✅ `components/common/FormInput.module.css`
- ✅ `components/common/Modal.module.css`
- ✅ `components/layouts/DashboardLayout.module.css`
- ✅ Multiple page CSS modules

### Phase 3 Files (Pending Figma Alignment)
- ⏳ `app/(dashboard)/dashboard/page.js` & CSS
- ⏳ `app/(dashboard)/campaign/page.js` & CSS
- ⏳ `app/(dashboard)/campaign/new/page.js` & CSS
- ⏳ `app/(dashboard)/campaign/[id]/live/page.js` & CSS
- ⏳ `app/(dashboard)/stores/page.js` & CSS
- ⏳ `app/(client)/scan/[campaignId]/page.js` & CSS
- ⏳ `components/customer/ScratchCard.js` & CSS
- ⏳ `app/(client)/coupon/[couponId]/page.js` & CSS

---

## 7. Implementation Roadmap

### Step 1: Figma Analysis (Task 53) ✅ IN PROGRESS
- Inspect Figma design structure
- Extract design system details
- Identify all components
- Create detailed design specifications

### Step 2: Gap Analysis (Task 54) - NEXT
- Compare current UI with Figma
- Document pixel-perfect requirements
- Create prioritized fix list
- Identify missing components

### Step 3: Design Token Refinement (Task 55)
- Verify all colors match Figma
- Verify typography matches Figma
- Verify spacing system matches Figma
- Update CSS variables if needed

### Step 4: Sequential Page Implementation (Tasks 58-65)
1. Dashboard (high impact)
2. Campaign Listing
3. Create Campaign
4. Campaign Live
5. Store Listing
6. Customer Scan
7. Scratch Card
8. Coupon Screen

### Step 5: Testing & Verification (Tasks 66-68)
- Component pixel-perfect verification
- Page-by-page Figma comparison
- All responsive breakpoints
- Dark mode verification
- Final validation

---

## 8. Design Specifications to Extract from Figma

### For Each Page, Document:
- [ ] Layout structure (grid, flex, auto-layout)
- [ ] Component positioning (top/left/width/height)
- [ ] Padding/margins (internal & external)
- [ ] Gap between elements
- [ ] Typography (font, size, weight, line-height)
- [ ] Colors (hex codes for all text, backgrounds, borders)
- [ ] Shadows (if any)
- [ ] Border radius
- [ ] Interactive states (hover, active, focus, disabled)
- [ ] Responsive changes at each breakpoint
- [ ] Animations/transitions (timing, easing)

### For Each Component, Document:
- [ ] All variants
- [ ] All sizes (if multiple)
- [ ] All states (hover, active, focus, disabled, loading)
- [ ] Spacing rules
- [ ] Color variants
- [ ] Typography
- [ ] Interactions

---

## 9. Success Criteria

### For Phase 3 Completion
- [ ] Every page matches Figma design pixel-perfectly
- [ ] No breaking changes to existing APIs
- [ ] All data flows intact
- [ ] All validation logic preserved
- [ ] Dark mode working
- [ ] Responsive at all breakpoints
- [ ] No console errors
- [ ] Performance maintained
- [ ] All tests passing

---

## 10. Notes & Constraints

### DO NOT CHANGE
- ❌ API endpoints (`app/api/*`)
- ❌ Database schemas
- ❌ Authentication logic
- ❌ Business logic
- ❌ Service layer
- ❌ Route structure
- ❌ State management patterns

### DO UPDATE
- ✅ Page layouts
- ✅ Component styling
- ✅ Colors (to match Figma)
- ✅ Typography (to match Figma)
- ✅ Spacing (to match Figma)
- ✅ Component variants
- ✅ Responsive design
- ✅ Dark mode support

---

## 11. Next Steps

1. **Complete Figma Inspection** - Extract exact design specifications
2. **Create Detailed Gap Analysis** - Document pixel-perfect requirements
3. **Build Design Token Mapping** - Match current CSS to Figma values
4. **Implement Dashboard** - First page redesign
5. **Verify & Iterate** - Continuous comparison with Figma
6. **Deploy** - After all pages verified

---

**Status**: Ready for Task 54 (Gap Analysis)  
**Estimated Completion**: 16-20 hours of implementation work  
**Risk Level**: Low (preserving all existing functionality)
