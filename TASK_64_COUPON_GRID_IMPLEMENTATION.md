# Task 64: Coupon Grid Selection - Implementation Specification

**Date**: June 4, 2026  
**Route**: `/customer/campaign/[campaignId]/scratch`  
**File**: `app/(client)/campaign/[campaignId]/scratch/page.js`  
**Priority**: P2 (Core customer experience)  
**Status**: Specification Ready  

---

## Overview

Redesign the Coupon Grid / Scratch Card Selection page to match Figma design. This is where customers select which coupon they want to scratch.

**Key Features**:
- Golden yellow background (#FCD34D)
- 3x2 grid layout on desktop (3 columns, 6 cards visible)
- 2-column grid on tablet
- 1-column grid on mobile
- Square coupon cards with gift icons
- Coupon amounts (₹50, ₹100, ₹250, ₹300, ₹500, ₹1000)
- Hover and selected states
- Store badge and offer name at top

---

## Current State Analysis

### **What Exists**:
- ✅ Route `/customer/campaign/:id/scratch` functional
- ✅ Coupon list from API
- ✅ Selection logic

### **What Needs Changes**:
- ❌ Visual layout (not grid-based)
- ❌ Background color (not golden yellow)
- ❌ Card styling (not square, not prominent)
- ❌ Icon display (missing gift icons)
- ❌ Responsive grid (not implemented properly)
- ❌ Hover and selected states
- ❌ Store badge styling

---

## Desktop Layout (1024px+)

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│  [Logo] Bansal Store                                  │
│  Summer Hot Offer                                     │
│                                                        │
│  Pick your lucky coupon                               │
│  You can scratch only one                             │
│                                                        │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐               │
│  │  [🎁]   │ │  [🎁]   │ │  [🎁]   │               │
│  │  ₹ 50   │ │  ₹ 100  │ │  ₹ 500  │               │
│  └─────────┘ └─────────┘ └─────────┘               │
│                                                        │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐               │
│  │  [🎁]   │ │  [🎁]   │ │  [🎁]   │               │
│  │  ₹ 250  │ │  ₹ 300  │ │  ₹ 1000 │               │
│  └─────────┘ └─────────┘ └─────────┘               │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Grid Structure**:
- Layout: CSS Grid, 3 columns
- Column width: Equal
- Gap: 24px (between cards)
- Container padding: 20px
- Max-width: 1000px, centered
- Background: #FCD34D (golden yellow)

---

## Tablet Layout (768px - 1024px)

```
┌──────────────────────────────────┐
│                                  │
│ [Logo] Bansal Store             │
│ Summer Hot Offer                │
│                                  │
│ Pick your lucky coupon           │
│ You can scratch only one         │
│                                  │
│ ┌──────────┐ ┌──────────┐      │
│ │  [🎁]    │ │  [🎁]    │      │
│ │  ₹ 50    │ │  ₹ 100   │      │
│ └──────────┘ └──────────┘      │
│                                  │
│ ┌──────────┐ ┌──────────┐      │
│ │  [🎁]    │ │  [🎁]    │      │
│ │  ₹ 250   │ │  ₹ 300   │      │
│ └──────────┘ └──────────┘      │
│                                  │
│ ┌──────────┐ ┌──────────┐      │
│ │  [🎁]    │ │  [🎁]    │      │
│ │  ₹ 500   │ │  ₹ 1000  │      │
│ └──────────┘ └──────────┘      │
│                                  │
└──────────────────────────────────┘
```

**Grid Structure**:
- Layout: CSS Grid, 2 columns
- Gap: 20px
- Container padding: 20px
- Max-width: 100%

---

## Mobile Layout (< 768px)

```
┌──────────────────────┐
│                      │
│ [L] Bansal Store    │
│ Summer Hot Offer    │
│                      │
│ Pick your lucky     │
│ coupon              │
│ You can scratch     │
│ only one            │
│                      │
│ ┌────────────────┐  │
│ │     [🎁]       │  │
│ │     ₹ 50       │  │
│ └────────────────┘  │
│                      │
│ ┌────────────────┐  │
│ │     [🎁]       │  │
│ │     ₹ 100      │  │
│ └────────────────┘  │
│                      │
│ ... (more cards)    │
│                      │
└──────────────────────┘
```

**Grid Structure**:
- Layout: CSS Grid, 1 column
- Gap: 16px
- Container padding: 16px
- Max-width: 100%
- Full width cards

---

## Page Structure

### **1. Header Section**

**Store Badge & Name Row**:
- Layout: flex, align-items: center, gap: 12px
- Padding: 20px
- Background: #FCD34D (inherits from page)

**Store Badge**:
- Size: 32x32px (circular)
- Background: Store's brand color or default #010F44
- Text: Store initials or avatar
- Border-radius: 50%
- Font: 14px, 600 weight, white

**Store Name**:
- Text: Store name
- Font: 16px, 600 weight, Afacad, navy (#010F44)
- Margin-left: 8px

**Offer Text**:
- Text: Offer name (e.g., "Summer Hot Offer")
- Font: 12px, 400 weight, gray (#999999)
- Position: Small text next to store name

---

### **2. Title Section**

**Main Title**:
- Text: "Pick your lucky coupon"
- Font: 28px, 800 weight, Afacad, navy (#010F44)
- Margin: 32px 20px 8px 20px
- Line-height: 1.2

**Subtitle**:
- Text: "You can scratch only one"
- Font: 14px, 400 weight, Afacad Flux, gray (#637080)
- Margin: 0 20px 32px 20px

---

### **3. Coupon Grid**

**Container**:
- Padding: 0 20px 20px 20px
- Display: grid
- Desktop: grid-template-columns: repeat(3, 1fr)
- Tablet: grid-template-columns: repeat(2, 1fr)
- Mobile: grid-template-columns: 1fr
- Gap: 24px (desktop), 20px (tablet), 16px (mobile)
- Max-width: 1000px
- Margin: 0 auto

---

### **4. Individual Coupon Card**

**Base Styling**:
- Width: 100px (desktop), 90px (tablet), auto (mobile)
- Height: 100px (square aspect ratio)
- Background: #FCD34D (golden yellow)
- Border: 2px solid transparent
- Border-radius: 8px
- Display: flex flex-direction: column, align-items: center, justify-content: center
- Cursor: pointer
- Transition: all 0.2s ease
- Box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1)
- Gap: 8px (between icon and amount)

**Icon**:
- Element: Gift emoji 🎁 or SVG icon
- Font-size: 40px (desktop), 32px (tablet), 28px (mobile)
- Line-height: 1

**Amount Text**:
- Font: 16px, 700 weight, Afacad, navy (#010F44)
- Margin-top: 4px
- Text align: center
- Format: "₹ XXX"

**Hover State**:
- Border: 2px solid #F59E0B (darker gold)
- Transform: scale(1.05)
- Box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15)
- Background: #FCD34D (unchanged)

**Active/Selected State**:
- Border: 3px solid #010F44 (navy)
- Background: rgba(253, 211, 77, 0.8) (slightly darker)
- Box-shadow: 0 8px 16px rgba(1, 15, 68, 0.2)
- Transform: scale(1.02)

**Selected Overlay**:
- Position: absolute or ::after
- Content: "✓" (checkmark)
- Font: 24px, 700 weight, navy (#010F44)
- Position: top-right corner
- Padding: 4px
- Display: only when selected

**Disabled State** (if applicable):
- Opacity: 0.5
- Cursor: not-allowed
- Border: 2px solid #E8E8E8

---

## Color Specifications

| Element | Color | Hex |
|---------|-------|-----|
| Page Background | Golden Yellow | #FCD34D |
| Card Background | Golden Yellow | #FCD34D |
| Card Border (hover) | Darker Gold | #F59E0B |
| Card Border (selected) | Navy | #010F44 |
| Text (primary) | Navy | #010F44 |
| Text (secondary) | Gray | #637080 |
| Text (muted) | Muted Gray | #999999 |
| Icon | Black | #000000 |
| Badge Background | Navy | #010F44 |
| Badge Text | White | #FFFFFF |

---

## Typography

| Element | Font Size | Weight | Font Family | Color |
|---------|-----------|--------|-------------|-------|
| Title | 28px | 800 | Afacad | #010F44 |
| Subtitle | 14px | 400 | Afacad Flux | #637080 |
| Store Name | 16px | 600 | Afacad | #010F44 |
| Offer Text | 12px | 400 | Afacad Flux | #999999 |
| Amount | 16px | 700 | Afacad | #010F44 |

---

## Responsive Behavior

### **Desktop (1024px+)**
- Grid: 3 columns
- Card size: 100x100px
- Icon: 40px
- Gap: 24px
- Padding: 20px

### **Tablet (768px - 1024px)**
- Grid: 2 columns
- Card size: 90x90px
- Icon: 36px
- Gap: 20px
- Padding: 20px

### **Mobile (< 768px)**
- Grid: 1 column
- Card size: Full width (max 200px)
- Icon: 32px
- Gap: 16px
- Padding: 16px

### **Mobile Landscape (480px - 767px)**
- Grid: 2 columns
- Card size: 80x80px
- Icon: 32px
- Gap: 16px
- Padding: 16px

---

## Dark Mode Support

Add `@media (prefers-color-scheme: dark)` for:
- Page background: #8B7500 (darker gold)
- Card background: #8B7500 (darker gold)
- Text colors: White/light gray
- Border: Lighter for visibility
- Overall contrast maintained

---

## Interaction Flow

1. **Page Load**
   - Display all coupons in grid
   - Show store name and offer
   - No card selected initially

2. **Hover**
   - Border becomes darker gold
   - Card scales up slightly (1.05x)
   - Shadow elevates

3. **Click**
   - Card gets navy border (3px)
   - Checkmark appears in corner
   - Only one card can be selected at a time
   - Previous selection is deselected

4. **Submit/Proceed**
   - Selected card value is sent to API
   - Navigate to scratch card page
   - Show loading state during submission

---

## API Integration (PRESERVED)

**Existing Endpoint**: `POST /api/customer/campaign/:id/select-coupon`
- **Request**: { couponId, campaignId, storeSnapshot }
- **Response**: { success, data: { scratchCard: {...} } }

**No changes needed** - All API calls preserved as-is.

---

## Business Logic (PRESERVED)

✅ All existing logic remains unchanged:
- Coupon list fetching
- Single selection enforcement
- API submission
- Navigation to scratch page
- Error handling
- Loading states

---

## Success Criteria

- ✅ Golden yellow background (#FCD34D)
- ✅ 3-column grid on desktop
- ✅ 2-column grid on tablet
- ✅ 1-column grid on mobile
- ✅ Square cards (100x100px)
- ✅ Gift icons displayed
- ✅ Coupon amounts showing
- ✅ Hover state (border + scale)
- ✅ Selected state (navy border + checkmark)
- ✅ Store badge at top
- ✅ Responsive at all breakpoints
- ✅ All API calls functional
- ✅ Single selection enforced

---

## Files to Create/Modify

1. **Create**: `app/(client)/campaign/[campaignId]/scratch/page.module.css` (NEW)
   - Complete CSS Module for page styling

2. **Modify**: `app/(client)/campaign/[campaignId]/scratch/page.js` (UPDATE)
   - Update class names and layout structure
   - Preserve all business logic
   - Add selection state management

---

## Implementation Steps

### **Step 1: Create CSS Module** (30 mins)
```
- Create page.module.css
- Define grid layout
- Style individual cards
- Add hover and selected states
- Responsive media queries
- Dark mode support
```

### **Step 2: Update JSX** (45 mins)
```
- Update class names
- Add store badge section
- Reorganize grid layout
- Add selection state handler
- Add hover/selected styling
- Preserve API calls
```

### **Step 3: Test** (30 mins)
```
- Desktop grid (3 columns)
- Tablet grid (2 columns)
- Mobile grid (1 column)
- Hover effects
- Selection toggle
- Dark mode
- API submission
```

---

## Estimated Timeline

- **Specification**: ✅ COMPLETE
- **CSS Implementation**: ~30 minutes
- **JSX Updates**: ~45 minutes
- **Testing**: ~30 minutes
- **Total**: ~2 hours

---

## Next Steps

1. Create `page.module.css` with all specified styles
2. Update `page.js` JSX to use new grid layout and selection
3. Test at all responsive breakpoints
4. Verify selection state management
5. Test API submission
6. Verify dark mode support
7. Compare against Figma design visually

---

**Status**: 🟡 READY FOR IMPLEMENTATION  
**Next Task**: Begin CSS Module creation (after Task 63 completion)  
**Approval**: Awaiting user confirmation to proceed

