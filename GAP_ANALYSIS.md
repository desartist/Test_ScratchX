# Gap Analysis: Current UI vs Figma Design

**Date**: June 4, 2026  
**Reference**: https://www.figma.com/design/K98XasrbuaVfBxiN4BovzA/ScractchX_Proto--Copy-  
**Status**: Phase 3 Planning

---

## Overview

This document identifies the differences between the current ScratchX UI (Phase 2 implementation) and the Figma design to determine what needs to be adjusted for pixel-perfect alignment.

**Key Finding**: Phase 2 created all necessary components and styling foundations. Phase 3 will refine these to match Figma exactly.

---

## 1. Dashboard Page (`/dashboard`)

### Current State
- Uses `StatCard` component for 4 metrics (Primary, Default, Success, Warning variants)
- Stat cards in a responsive grid
- Campaign overview cards below
- Customer insights card
- All dark mode support implemented

### Figma Requirements
**TO BE VERIFIED**:
- [ ] Exact grid layout (1x4, 2x2, 1x1 at breakpoints?)
- [ ] Stat card spacing & sizing
- [ ] Campaign cards layout
- [ ] Insights card layout
- [ ] Header typography
- [ ] Color accuracy
- [ ] Spacing between sections (use DevTools ruler)
- [ ] Hover/active states
- [ ] Mobile layout at 430px

### Gap Assessment
| Element | Current | Status | Priority |
|---------|---------|--------|----------|
| Stat Cards | ✅ Component created | 🟡 Verify sizing/spacing | High |
| Campaign Cards | ✅ Existing | 🟡 Verify layout | High |
| Grid Layout | ✅ Responsive grid | 🟡 Verify breakpoints | High |
| Typography | ✅ Design tokens set | 🟡 Verify sizes | Medium |
| Colors | ✅ Tokens defined | 🟡 Verify hex codes | Medium |
| Dark Mode | ✅ Implemented | 🟡 Verify appearance | Medium |
| Animations | ✅ 0.3s transitions | 🟡 Verify timing | Low |

### Action Items
- [ ] Screenshot current dashboard
- [ ] Compare with Figma side-by-side
- [ ] Measure spacing with DevTools
- [ ] Adjust padding/margins if needed
- [ ] Verify color hex codes
- [ ] Test at 320px, 480px, 768px, 1024px

---

## 2. Campaign Listing Page (`/campaign`)

### Current State
- Uses responsive grid with `auto-fill` layout
- CampaignCard component with Badge and ProgressBar
- Filter/search UI
- Stats display (total/active campaigns)

### Figma Requirements
**TO BE VERIFIED**:
- [ ] Grid column count at each breakpoint
- [ ] Card sizing (width/height)
- [ ] Gap between cards
- [ ] Badge positioning on cards
- [ ] Progress bar styling
- [ ] Filter UI layout
- [ ] Header styling
- [ ] Color accuracy

### Gap Assessment
| Element | Current | Status | Priority |
|---------|---------|--------|----------|
| Grid Layout | ✅ auto-fill | 🟡 Verify minmax values | High |
| Campaign Card | ✅ Created | 🟡 Verify spacing/layout | High |
| Badge Component | ✅ Created | 🟡 Verify positioning | High |
| Progress Bar | ✅ Created | 🟡 Verify sizing | High |
| Filter UI | ✅ Existing | 🟡 Verify layout | Medium |
| Typography | ✅ Tokens set | 🟡 Verify sizes | Medium |
| Spacing | ✅ CSS vars | 🟡 Verify gaps | Medium |

### Action Items
- [ ] Verify grid `minmax(380px, 1fr)` value
- [ ] Check card spacing (12px, 16px, 20px?)
- [ ] Verify badge positioning (top-right?)
- [ ] Check progress bar height/styling
- [ ] Compare filter UI layout
- [ ] Test at all breakpoints

---

## 3. Create Campaign Page (`/campaign/new`)

### Current State
- Multi-field form
- FormButton with orange gradient
- Input fields with updated styling
- Responsive layout

### Figma Requirements
**TO BE VERIFIED**:
- [ ] Form field layout (stack vs columns?)
- [ ] Input field sizing
- [ ] Label styling
- [ ] Button sizing and positioning
- [ ] Form spacing/padding
- [ ] Step indicators (if any)
- [ ] Responsive adjustments

### Gap Assessment
| Element | Current | Status | Priority |
|---------|---------|--------|----------|
| FormButton | ✅ Updated | 🟡 Verify styling | High |
| FormInput | ✅ Updated | 🟡 Verify focus states | High |
| Form Layout | ✅ Responsive | 🟡 Verify structure | High |
| Typography | ✅ Tokens set | 🟡 Verify labels | Medium |
| Spacing | ✅ CSS vars | 🟡 Verify form gaps | Medium |
| Dark Mode | ✅ Implemented | 🟡 Verify inputs | Medium |

### Action Items
- [ ] Verify form field layout (stacked or side-by-side?)
- [ ] Check input field dimensions
- [ ] Verify button sizing (width, padding, height)
- [ ] Check form section spacing
- [ ] Verify mobile layout at 430px
- [ ] Test all interactive states

---

## 4. Campaign Live Page (`/campaign/:id/live`)

### Current State
- Campaign info card
- QR code display (300x300px)
- Download button with orange gradient
- Action buttons (View Details, All Campaigns)

### Figma Requirements
**TO BE VERIFIED**:
- [ ] Info card layout
- [ ] QR code container sizing
- [ ] Button positioning
- [ ] Button styling (spacing, sizing)
- [ ] Card styling
- [ ] Typography
- [ ] Colors

### Gap Assessment
| Element | Current | Status | Priority |
|---------|---------|--------|----------|
| FormButton (Download) | ✅ Updated | 🟡 Verify styling | High |
| Info Card | ✅ Existing | 🟡 Verify layout | High |
| QR Display | ✅ Existing | 🟡 Verify sizing | High |
| Button Group | ✅ Responsive | 🟡 Verify spacing | Medium |
| Typography | ✅ Tokens set | 🟡 Verify sizes | Medium |

### Action Items
- [ ] Verify button sizing and spacing
- [ ] Check card layout and spacing
- [ ] Verify QR code container size
- [ ] Test responsive layout
- [ ] Verify hover states on buttons

---

## 5. Store Listing Page (`/stores`)

### Current State
- Responsive grid layout
- StoreCard component with Badge
- Store info display (name, stats, location)
- Action buttons

### Figma Requirements
**TO BE VERIFIED**:
- [ ] Grid layout (2 cols desktop, 1 col mobile?)
- [ ] Card sizing
- [ ] Badge positioning
- [ ] Info display layout
- [ ] Button styling
- [ ] Spacing between elements

### Gap Assessment
| Element | Current | Status | Priority |
|---------|---------|--------|----------|
| Grid Layout | ✅ Responsive | 🟡 Verify cols/gaps | High |
| Store Card | ✅ Created | 🟡 Verify layout | High |
| Badge Component | ✅ Updated | 🟡 Verify positioning | High |
| Typography | ✅ Tokens set | 🟡 Verify sizes | Medium |
| Spacing | ✅ CSS vars | 🟡 Verify gaps | Medium |

### Action Items
- [ ] Verify grid column count (2, 2, 1?)
- [ ] Check card sizing and proportions
- [ ] Verify badge positioning
- [ ] Check info display layout
- [ ] Test at all breakpoints

---

## 6. Customer Scan Page (`/scan/[campaignId]`)

### Current State
- Mobile-first design (430px base)
- LocationStatus component integrated
- Two-button flow (Verify → Show Coupons)
- Form fields for customer info
- Location verification display

### Figma Requirements
**TO BE VERIFIED**:
- [ ] Form layout (stacked?)
- [ ] Input field sizing (mobile optimized?)
- [ ] Button sizing (touch targets ≥44px?)
- [ ] LocationStatus component styling
- [ ] Typography sizes
- [ ] Colors accuracy
- [ ] Spacing at 430px

### Gap Assessment
| Element | Current | Status | Priority |
|---------|---------|--------|----------|
| LocationStatus | ✅ Component created | 🟡 Verify styling | High |
| Two-Button Flow | ✅ Implemented | 🟡 Verify spacing/sizing | High |
| Form Fields | ✅ Updated | 🟡 Verify sizing | High |
| Mobile Layout | ✅ 430px base | 🟡 Verify at 320px | High |
| Typography | ✅ Tokens set | 🟡 Verify sizes | Medium |
| Dark Mode | ✅ Implemented | 🟡 Verify appearance | Medium |

### Action Items
- [ ] Test at 430px (primary), 320px, 480px
- [ ] Verify button touch targets (≥44px height)
- [ ] Check LocationStatus component rendering
- [ ] Verify form field sizing for mobile
- [ ] Test all interactive states
- [ ] Verify dark mode appearance

---

## 7. Scratch Card Page (Component)

### Current State
- ScratchCard component with canvas animation
- CountdownTimer integrated
- Reward reveal UI
- Responsive layout
- Canvas touch events

### Figma Requirements
**TO BE VERIFIED**:
- [ ] Card sizing (300x300px for max-width?)
- [ ] Canvas area sizing
- [ ] Timer styling and positioning
- [ ] Reward display layout
- [ ] Button styling
- [ ] Animation timing
- [ ] Mobile responsiveness

### Gap Assessment
| Element | Current | Status | Priority |
|---------|---------|--------|----------|
| CountdownTimer | ✅ Component created | 🟡 Verify styling | High |
| Card Layout | ✅ Responsive | 🟡 Verify sizing | High |
| Canvas Area | ✅ Touch events | 🟡 Verify sizing | Medium |
| Reward Display | ✅ Existing | 🟡 Verify layout | Medium |
| Typography | ✅ Tokens set | 🟡 Verify sizes | Medium |
| Animations | ✅ Timers | 🟡 Verify timing | Low |

### Action Items
- [ ] Verify card max-width at 430px (300px?)
- [ ] Check timer positioning (top? bottom?)
- [ ] Verify canvas sizing
- [ ] Check reward reveal layout
- [ ] Test animations timing
- [ ] Verify mobile layout

---

## 8. Coupon Screen Page (`/coupon/[couponId]`)

### Current State
- Created in Phase 2
- Mobile-first design (430px base)
- CountdownTimer integrated
- Coupon card with gradient background
- Terms section
- Redeem button (green gradient)
- "Not Now" button (outline)

### Figma Requirements
**TO BE VERIFIED**:
- [ ] Coupon card sizing
- [ ] Card content layout (title, value, badge)
- [ ] Timer positioning and styling
- [ ] Terms section styling
- [ ] Button sizing and spacing
- [ ] Color accuracy
- [ ] Typography sizes

### Gap Assessment
| Element | Current | Status | Priority |
|---------|---------|--------|----------|
| Coupon Card | ✅ Created | 🟡 Verify styling | High |
| CountdownTimer | ✅ Integrated | 🟡 Verify positioning | High |
| Button Pair | ✅ Implemented | 🟡 Verify sizing/spacing | High |
| Terms Section | ✅ Created | 🟡 Verify layout | Medium |
| Typography | ✅ Tokens set | 🟡 Verify sizes | Medium |
| Colors | ✅ Tokens defined | 🟡 Verify hex codes | Medium |

### Action Items
- [ ] Verify coupon card dimensions
- [ ] Check title/value sizing
- [ ] Verify timer styling and position
- [ ] Check button dimensions (44px height minimum)
- [ ] Verify button gap spacing
- [ ] Test at all responsive breakpoints

---

## 9. Shared Components

### FormButton
**Current**: Orange gradient, smooth hover, dark mode
**Figma Requirement**: Verify exact gradient color, hover effect, disabled state
**Status**: 🟡 Needs verification

### FormInput
**Current**: Focus border orange, error styling, dark mode
**Figma Requirement**: Verify focus color, border width, error state, disabled state
**Status**: 🟡 Needs verification

### Modal
**Current**: Design system colors, orange focus, dark mode
**Figma Requirement**: Verify styling, animations, dark mode
**Status**: 🟡 Needs verification

### Badge
**Current**: 7 variants, 3 sizes, dark mode
**Figma Requirement**: Verify variant colors, sizing, positioning
**Status**: 🟡 Needs verification

### ProgressBar
**Current**: Normal/Warning/Critical states, animations
**Figma Requirement**: Verify colors, sizing, state animations
**Status**: 🟡 Needs verification

### StatCard
**Current**: 5 variants, 3 sizes, loading state
**Figma Requirement**: Verify variant styling, sizing, loading animation
**Status**: 🟡 Needs verification

### LocationStatus
**Current**: 3 states, spinner, coordinates display
**Figma Requirement**: Verify state styling, animations, spacing
**Status**: 🟡 Needs verification

### CountdownTimer
**Current**: Color transitions, pulse animations, urgent message
**Figma Requirement**: Verify color values, animation timing, urgent display
**Status**: 🟡 Needs verification

---

## 10. Design Token Accuracy

### Colors
| Token | Current Value | Figma Value | Status |
|-------|---------------|-------------|--------|
| primary | #ef9e1b | ? | 🟡 Verify |
| primary-hover | #d98e14 | ? | 🟡 Verify |
| navy | #010f44 | ? | 🟡 Verify |
| teal | #00b0b1 | ? | 🟡 Verify |
| growth | #0a8905 | ? | 🟡 Verify |
| success | #4caf50 | ? | 🟡 Verify |
| warning | #ff9800 | ? | 🟡 Verify |
| error | #ff6b6b | ? | 🟡 Verify |

### Typography
| Property | Current | Figma | Status |
|----------|---------|-------|--------|
| Body Font | Afacad Flux | ? | 🟡 Verify |
| Heading Font | Afacad | ? | 🟡 Verify |
| Body Size | 14-16px | ? | 🟡 Verify |
| Heading Sizes | 18-32px | ? | 🟡 Verify |
| Font Weights | 400-800 | ? | 🟡 Verify |

### Spacing
| Property | Current | Figma | Status |
|----------|---------|-------|--------|
| Gap - Cards | 16-24px | ? | 🟡 Verify |
| Padding - Container | 24px | ? | 🟡 Verify |
| Padding - Card | 20-28px | ? | 🟡 Verify |

---

## 11. Responsive Breakpoints

### Current Implementation
| Breakpoint | Current | Figma | Status |
|-----------|---------|-------|--------|
| Mobile | 320px, 480px | ? | 🟡 Verify |
| Tablet | 768px | ? | 🟡 Verify |
| Desktop | 1024px+ | ? | 🟡 Verify |

### Per-Page Breakpoint Behavior
**Dashboard**: 4 cols → 2 cols → 1 col (Verify at Figma)
**Campaigns**: Auto-fill grid (Verify minmax values)
**Stores**: 2 cols → 2 cols → 1 col (Verify)
**Scan**: Mobile-first 430px base (Verify)

---

## 12. Priority Implementation Order

### Priority 1 (Highest Impact)
1. Dashboard - StatCard grid layout
2. Campaign Listing - Grid and card spacing
3. Campaign Create - Form layout
4. Store Listing - Grid and card styling

### Priority 2 (Customer-Facing)
5. Customer Scan - Mobile optimization
6. Scratch Card - Card and timer styling
7. Coupon Screen - Card and buttons

### Priority 3 (Polish)
8. All component verification
9. Dark mode verification
10. Animation/transition timing
11. Final pixel-perfect adjustments

---

## 13. Verification Methodology

For each page/component, will:
1. **Screenshot current** state at 430px, 768px, 1024px
2. **Compare with Figma** using browser DevTools
3. **Measure spacing** using element inspector
4. **Verify colors** using color picker
5. **Check typography** (font, size, weight, line-height)
6. **Test interactions** (hover, focus, active states)
7. **Verify dark mode** appearance
8. **Fix discrepancies** in code
9. **Re-screenshot** to confirm match
10. **Document changes** in commit message

---

## 14. Next Steps

### Immediate (Today)
1. ✅ Create design analysis document (Task 53)
2. ✅ Create gap analysis document (Task 54) - IN PROGRESS
3. Complete Task 54 - Finalize gap analysis with exact Figma measurements

### This Week (Tasks 55-58)
4. Extract exact design tokens from Figma (Task 55)
5. Refine design tokens in globals.css
6. Implement Dashboard redesign (Task 58)

### Following Week (Tasks 59-65)
7. Campaign Listing (Task 59)
8. Create Campaign (Task 60)
9. Campaign Live (Task 61)
10. Store Listing (Task 62)
11. Customer Scan (Task 63)
12. Scratch Card (Task 64)
13. Coupon Screen (Task 65)

### Final (Tasks 66-68)
14. Component verification (Task 66)
15. Page-by-page comparison (Task 67)
16. Final validation (Task 68)

---

## Summary

**Total Components**: 12+ (5 new + 4 updated + 3 existing)
**Total Pages**: 8 (1 dashboard + 3 merchant + 4 customer)
**Priority Fixes**: ~30-40 styling adjustments
**Estimated Time**: 16-20 hours
**Risk Level**: Low (preserving all functionality)

**Current Status**: Phase 2 provided excellent foundation. Phase 3 will refine to pixel-perfect Figma alignment.

---

**Next Action**: Complete Figma measurements and create detailed specifications for each page.
