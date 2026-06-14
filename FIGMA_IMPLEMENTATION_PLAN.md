# ScratchX Figma Implementation - Phase 3 Plan

**Status**: Starting implementation
**Reference**: https://www.figma.com/design/K98XasrbuaVfBxiN4BovzA/ScractchX_Proto--Copy-
**Date**: June 4, 2026

## Overview

This phase focuses on implementing the Figma design pixel-perfect while preserving all existing functionality from Phase 2.

### Key Constraints (DO NOT BREAK)
- ✅ Keep all existing APIs
- ✅ Keep all database schemas  
- ✅ Keep all business logic
- ✅ Keep all routes
- ✅ Keep all state management
- ✅ Keep all validation
- ✅ Keep all authentication

### Approach
1. **Analyze** Figma design structure (pages, components, design tokens)
2. **Compare** current UI vs Figma designs (gap analysis per page)
3. **Plan** sequential implementation (dashboard → campaigns → stores → customer flows)
4. **Implement** pages one at a time
5. **Verify** each page matches Figma exactly

---

## Phase 3 Implementation Tasks

### Step 1: Design Analysis & Gap Identification (Tasks 53-54)

#### Task 53: Figma Design Analysis
- [ ] Inspect Figma file structure (pages, components, design tokens)
- [ ] Extract design system (colors, typography, spacing, shadows)
- [ ] Identify all components in Figma
- [ ] Map Figma pages to current routes
- [ ] Document design decisions

**Deliverable**: `FIGMA_DESIGN_ANALYSIS.md`

#### Task 54: Current State vs Figma Gap Analysis
- [ ] Dashboard page vs Figma
- [ ] Campaign listing vs Figma
- [ ] Store listing vs Figma
- [ ] Create Campaign vs Figma
- [ ] Campaign Live vs Figma
- [ ] Customer Scan vs Figma
- [ ] Scratch Card vs Figma
- [ ] Coupon Screen vs Figma

**Deliverable**: `GAP_ANALYSIS.md`

---

### Step 2: Design System Implementation (Tasks 55-57)

#### Task 55: Create/Update Design Tokens
- [ ] Extract colors from Figma
- [ ] Extract typography rules
- [ ] Extract spacing system
- [ ] Create CSS variables (or update existing)
- [ ] Create Tailwind config (if using Tailwind)

**Files**: `globals.css`, `tailwind.config.js` (if applicable)

#### Task 56: Build/Update Reusable Components
- [ ] Review Phase 2 components
- [ ] Update to match Figma exactly
- [ ] Create any missing components from Figma
- [ ] Ensure all components are pixel-perfect

**Deliverable**: Component audit

#### Task 57: Update FormButton, FormInput, Modal, Other Shared Components
- [ ] Match all component styling to Figma
- [ ] Verify responsive behavior
- [ ] Verify dark mode (from Phase 2)

---

### Step 3: Dashboard Redesign (Task 58)

#### Task 58: Merchant Dashboard `/dashboard`
**Current file**: `app/(dashboard)/dashboard/page.js`

Changes:
- [ ] Match layout exactly to Figma
- [ ] Update stats card styling
- [ ] Update campaign cards
- [ ] Update spacing/alignment
- [ ] Verify responsive design
- [ ] Verify dark mode

**Keep**: All API calls, data loading, state management

---

### Step 4: Campaign Pages Redesign (Tasks 59-61)

#### Task 59: Campaign Listing `/campaign`
**Current file**: `app/(dashboard)/campaign/page.js`

Changes:
- [ ] Match grid layout to Figma
- [ ] Update card styling
- [ ] Update badge positioning
- [ ] Update button styling
- [ ] Verify filters/sorting UI

**Keep**: All campaign data, API calls, filtering logic

#### Task 60: Create Campaign `/campaign/new`
**Current file**: `app/(dashboard)/campaign/new/page.js`

Changes:
- [ ] Match form layout to Figma
- [ ] Update step indicators (if applicable)
- [ ] Update spacing/sizing
- [ ] Update button styling

**Keep**: All form logic, validation, API submission

#### Task 61: Campaign Live `/campaign/:id/live`
**Current file**: `app/(dashboard)/campaign/[id]/live/page.js`

Changes:
- [ ] Match layout to Figma
- [ ] Update QR code display
- [ ] Update info card
- [ ] Update button styling

**Keep**: QR generation, download logic, data loading

---

### Step 5: Store Pages Redesign (Task 62)

#### Task 62: Store Listing `/stores`
**Current file**: `app/(dashboard)/stores/page.js`

Changes:
- [ ] Match grid layout to Figma
- [ ] Update store card styling
- [ ] Update badge positioning
- [ ] Update action buttons
- [ ] Match store info display

**Keep**: Store data, API calls, location display

---

### Step 6: Customer Flow Redesign (Tasks 63-65)

#### Task 63: Customer Scan `/scan/[campaignId]`
**Current file**: `app/(client)/scan/[campaignId]/page.js`

Changes:
- [ ] Match form layout to Figma
- [ ] Update location verification UI
- [ ] Update button styling
- [ ] Verify mobile layout (430px base)
- [ ] Update spacing

**Keep**: Location verification logic, form submission, API calls

#### Task 64: Scratch Card Display
**Current file**: `components/customer/ScratchCard.js` + page

Changes:
- [ ] Match card styling to Figma
- [ ] Update reward display
- [ ] Update timer styling
- [ ] Match animations to Figma

**Keep**: Scratch animation, canvas logic, reveal logic

#### Task 65: Coupon Screen `/coupon/[couponId]`
**Current file**: `app/(client)/coupon/[couponId]/page.js`

Changes:
- [ ] Match coupon card to Figma
- [ ] Update terms section
- [ ] Update button styling
- [ ] Match mobile layout

**Keep**: Timer logic, redemption logic, API calls

---

### Step 7: Testing & Verification (Tasks 66-68)

#### Task 66: Component Verification Against Figma
- [ ] Verify all components match Figma pixel-perfectly
- [ ] Check spacing (use DevTools)
- [ ] Check colors (screenshot comparison)
- [ ] Check typography
- [ ] Check responsive breakpoints

#### Task 67: Page-by-Page Figma Comparison
- [ ] Dashboard: Desktop → Tablet → Mobile
- [ ] Campaigns: Desktop → Tablet → Mobile
- [ ] Stores: Desktop → Tablet → Mobile
- [ ] Customer flows: Mobile (430px) → Tablet → Desktop

#### Task 68: Final Verification
- [ ] All existing APIs working
- [ ] All existing routes working
- [ ] All data flows intact
- [ ] Dark mode still working
- [ ] Responsive design at all breakpoints

---

## Implementation Priority

1. **Phase 2 Components** (already done, may need Figma refinements)
2. **Design System** (tokens, colors, typography)
3. **Dashboard** (highest impact, merchant-facing)
4. **Campaigns** (core functionality)
5. **Stores** (core functionality)
6. **Customer Flows** (mobile-critical)
7. **Testing & Verification**

---

## Success Criteria

- [ ] Every page matches Figma design pixel-perfectly
- [ ] No breaking changes to existing functionality
- [ ] All APIs work correctly
- [ ] All responsive breakpoints match Figma
- [ ] Dark mode preserved and working
- [ ] All forms/validation logic intact
- [ ] No console errors
- [ ] Performance maintained

---

## Files to Modify/Create

### New Files
- `FIGMA_DESIGN_ANALYSIS.md` - Design system extract
- `GAP_ANALYSIS.md` - Current vs Figma comparison

### Key Files to Update
- `app/globals.css` - Design tokens
- `app/(dashboard)/dashboard/page.js`
- `app/(dashboard)/campaign/page.js`
- `app/(dashboard)/campaign/new/page.js`
- `app/(dashboard)/campaign/[id]/live/page.js`
- `app/(dashboard)/stores/page.js`
- `app/(client)/scan/[campaignId]/page.js`
- `components/customer/ScratchCard.js`
- `app/(client)/coupon/[couponId]/page.js`
- All component CSS modules

### Do NOT Touch
- API routes (`app/api/*`)
- Database models
- Service layer
- Authentication logic
- Validation logic
- Business logic

---

## Next Steps

1. **Analyze Figma design** (Task 53)
2. **Create gap analysis** (Task 54)
3. **Extract design tokens** (Task 55)
4. **Implement dashboard** (Task 58)
5. **Implement pages sequentially** (Tasks 59-65)
6. **Verify all pages** (Tasks 66-68)

