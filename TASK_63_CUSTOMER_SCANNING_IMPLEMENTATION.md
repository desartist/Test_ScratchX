# Task 63: Customer Scanning Page - Implementation Specification

**Date**: June 4, 2026  
**Route**: `/scan/[campaignId]`  
**File**: `app/(client)/scan/[campaignId]/page.js`  
**Priority**: P2 (Core customer experience)  
**Status**: Specification Ready  

---

## Overview

Redesign the Customer Scanning page to match Figma design with mobile-first layout. This page is where customers scan QR codes and enter their details to unlock rewards.

**Key Features**:
- Mobile-optimized two-section layout (QR + Form)
- Desktop: Side-by-side layout (50% each)
- Mobile: Stacked layout (full width)
- QR code display with dark background
- Form for customer details
- Purchase range selection
- "Show My Coupons" CTA button

---

## Current State Analysis

### **What Exists**:
- ✅ Route `/scan/[campaignId]` functional
- ✅ QR code generation working
- ✅ Form submissions to API
- ✅ Auth context integration

### **What Needs Changes**:
- ❌ Visual layout (form-heavy, not optimized for QR prominence)
- ❌ Mobile responsiveness (not mobile-first)
- ❌ QR code styling (not prominent)
- ❌ Form layout and spacing
- ❌ Button styling
- ❌ Color scheme (not matching Figma)

---

## Desktop Layout (1024px+)

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│  [QR CODE SECTION]         [FORM SECTION]                 │
│  (50% width)               (50% width)                    │
│                                                            │
│  ┌──────────────────┐                                     │
│  │                  │       Unlock Your Reward             │
│  │    [QR CODE]     │       Please enter your details      │
│  │   (300x300px)    │       to unlock exclusive offers.    │
│  │                  │                                     │
│  └──────────────────┘                                     │
│                            Your Name *                    │
│  [Open URL]                [Your full name_____]         │
│                                                            │
│                            Contact Number *              │
│                            [+91] [phone_______]           │
│                                                            │
│                            Select your purchase range     │
│                            ☐ ₹1 - ₹499                  │
│                            ☐ ₹500 - ₹1,999             │
│                            ☐ ₹2,000+                     │
│                                                            │
│                            [SHOW MY COUPONS]              │
└────────────────────────────────────────────────────────────┘
```

**Grid Structure**:
- Layout: `display: grid; grid-template-columns: 1fr 1fr`
- Gap: 0px (sections touch)
- Max-width: 100vw or container width

---

## Mobile Layout (< 768px)

```
┌──────────────────────────┐
│                          │
│  Scan QR Code            │
│                          │
│  ┌────────────────────┐  │
│  │                    │  │
│  │    [QR CODE]       │  │
│  │   (250x250px)      │  │
│  │                    │  │
│  └────────────────────┘  │
│                          │
│  [Open URL]              │
│                          │
│  Unlock Your Reward      │
│  Please enter your       │
│  details...              │
│                          │
│  Your Name *             │
│  [Your name________]     │
│                          │
│  Contact Number *        │
│  [+91] [phone_______]    │
│                          │
│  Select your range       │
│  ☐ ₹1 - ₹499            │
│  ☐ ₹500 - ₹1,999       │
│  ☐ ₹2,000+             │
│                          │
│  [SHOW MY COUPONS]       │
│                          │
└──────────────────────────┘
```

**Layout Structure**:
- Layout: `display: flex; flex-direction: column`
- Padding: 20px
- Gap: 24px

---

## Component Structure

### **1. QR Code Section**

**Desktop Styling**:
- Width: 50%
- Padding: 40px
- Background: #000000 (black)
- Display: flex column, center aligned
- Min-height: match form section

**Mobile Styling**:
- Width: 100%
- Padding: 20px
- Background: #000000 (black)

**QR Code Container**:
- Size: 300x300px (desktop), 250x250px (mobile)
- Border-radius: 8px
- Center-aligned
- White background (for QR contrast)
- Margin-bottom: 20px

**Open URL Link**:
- Font: 12px, 400 weight, gray (#999999)
- Margin-top: 16px
- Cursor: pointer
- Underline on hover

**Colors**:
- Background: #000000
- QR background: #FFFFFF
- Text: #999999

---

### **2. Form Section**

**Desktop Styling**:
- Width: 50%
- Padding: 40px
- Background: #FFFFFF
- Display: flex column

**Mobile Styling**:
- Width: 100%
- Padding: 20px
- Background: #FFFFFF

**Form Header**:
```
Title: "Unlock Your Reward"
- Font: 28px, 700 weight, Afacad, navy (#010F44)
- Margin-bottom: 8px

Subtitle: "Please enter your details to unlock exclusive offers."
- Font: 14px, 400 weight, Afacad Flux, gray (#637080)
- Margin-bottom: 24px
```

---

### **3. Input Fields**

**Common Properties**:
- Height: 44px
- Padding: 10px 12px
- Border: 1px solid #E8E8E8
- Border-radius: 6px
- Font: 14px, 400 weight, Afacad
- Margin-bottom: 16px
- Transition: all 0.2s ease

**Focus State**:
- Border-color: #FFA500 (orange)
- Box-shadow: 0 0 0 3px rgba(255, 165, 0, 0.1)
- Outline: none

**Label**:
- Font: 14px, 500 weight, Afacad, navy (#010F44)
- Margin-bottom: 8px
- Display: block

**Required Indicator**:
- Red asterisk (*) after label
- Color: #FF0000 (red)

**Fields**:
1. **Name Field**
   - Label: "Your Name *"
   - Placeholder: "Your full name"
   - Type: text
   - Required: true

2. **Contact Number Field**
   - Label: "Contact Number *"
   - Placeholder: "+91 [phone number]"
   - Type: tel
   - Prefix: "+91"
   - Required: true

---

### **4. Purchase Range Selection**

**Section Label**:
- Text: "Select your purchase range"
- Font: 14px, 500 weight, navy (#010F44)
- Margin-bottom: 12px

**Checkbox Options**:
- Each option height: 44px
- Padding: 12px
- Border: 1px solid #E8E8E8
- Border-radius: 6px
- Margin-bottom: 8px
- Cursor: pointer
- Transition: all 0.2s ease

**Checkbox Style**:
- Size: 18x18px
- Border: 2px solid #010F44
- Background: white (unchecked), navy (checked)
- Border-radius: 4px
- Margin-right: 12px

**Unchecked Option**:
- Background: transparent
- Border: 1px solid #E8E8E8
- Text color: #010F44

**Checked Option**:
- Background: #E0E7FF (light lavender)
- Border: 1px solid #C7D2E8
- Text color: #010F44
- Checkbox filled with navy

**Options**:
1. "₹1 - ₹499"
2. "₹500 - ₹1,999"
3. "₹2,000+"

---

### **5. Submit Button**

**Button Styling**:
- Width: 100% (form width)
- Height: 48px
- Background: linear-gradient(135deg, #FFA500 0%, #F59E0B 100%)
- Color: #FFFFFF
- Border: none
- Border-radius: 6px
- Font: 14px, 600 weight, uppercase, Afacad
- Margin-top: 24px
- Cursor: pointer
- Transition: all 0.2s ease

**Hover State**:
- Transform: translateY(-2px)
- Box-shadow: 0 8px 16px rgba(255, 165, 0, 0.3)

**Active State**:
- Transform: translateY(0)
- Box-shadow: 0 4px 8px rgba(255, 165, 0, 0.2)

**Text**: "Show My Coupons"

---

## Responsive Breakpoints

### **Desktop (1024px+)**
- Grid layout: 2 columns (50% each)
- QR size: 300x300px
- Form padding: 40px
- Font sizes: As specified above
- Button height: 48px

### **Tablet (768px - 1024px)**
- Grid layout: 2 columns (50% each)
- QR size: 280x280px
- Form padding: 32px
- Font sizes: Scale down 10%
- Button height: 44px

### **Mobile (< 768px)**
- Flex layout: Column
- QR size: 250x250px
- Form padding: 20px
- Font sizes: Scale down 15%
- Button height: 44px
- Full width layout

---

## Color Specifications

| Element | Light Mode | Dark Mode |
|---------|-----------|-----------|
| QR Background | #000000 | #000000 |
| Form Background | #FFFFFF | #1a1a1a |
| Title | #010F44 | #FFFFFF |
| Subtitle | #637080 | #a0aab8 |
| Input Border | #E8E8E8 | rgba(255,255,255,0.1) |
| Input Focus | #FFA500 | #FFA500 |
| Label | #010F44 | #FFFFFF |
| Button Gradient | #FFA500 → #F59E0B | #FFA500 → #F59E0B |
| Checkbox (checked) | #010F44 | #4a90e2 |
| Option Background (selected) | #E0E7FF | rgba(74,144,226,0.1) |
| Text (default) | #010F44 | #FFFFFF |
| Text (muted) | #999999 | #888888 |

---

## Typography

| Element | Font Size | Weight | Font Family | Color |
|---------|-----------|--------|-------------|-------|
| Title | 28px | 700 | Afacad | #010F44 |
| Subtitle | 14px | 400 | Afacad Flux | #637080 |
| Label | 14px | 500 | Afacad | #010F44 |
| Input Text | 14px | 400 | Afacad | #010F44 |
| Option Text | 14px | 400 | Afacad | #010F44 |
| Button Text | 14px | 600 | Afacad | #FFFFFF |
| Link Text | 12px | 400 | Afacad | #999999 |

---

## Dark Mode Support

Add `@media (prefers-color-scheme: dark)` for:
- Form background: #1a1a1a
- Input backgrounds: transparent with light borders
- Text colors: white/light gray
- Button gradient: preserved
- Overall contrast maintained

---

## Implementation Plan

### **Phase 1: Create CSS Module** (30 mins)
- File: `app/(client)/scan/[campaignId]/page.module.css`
- Create styles for all sections
- Add responsive media queries
- Implement dark mode

### **Phase 2: Update JSX Structure** (45 mins)
- File: `app/(client)/scan/[campaignId]/page.js`
- Update class names to match new CSS
- Reorganize layout (QR left, form right on desktop)
- Preserve all API calls and logic

### **Phase 3: Test & Verify** (30 mins)
- Desktop testing (1024px+)
- Tablet testing (768px-1024px)
- Mobile testing (< 768px)
- Dark mode verification
- Form submission verification

---

## API Integration (PRESERVED)

**Existing Endpoint**: `POST /api/customer/campaign/:id`
- **Request**: { name, phone, purchaseRange, campaignId }
- **Response**: { success, data: { coupons: [...] } }

**No changes needed** - All API calls preserved as-is.

---

## Business Logic (PRESERVED)

✅ All existing logic remains unchanged:
- QR code generation
- Form validation
- API submission
- Navigation to coupons page
- Error handling
- Loading states
- Campaign verification

---

## Success Criteria

- ✅ Desktop layout: 2-column grid (50% each)
- ✅ Mobile layout: Stacked column
- ✅ QR code prominent and properly styled
- ✅ Form fields match Figma styling
- ✅ Purchase range selection working
- ✅ Submit button styled per Figma
- ✅ Responsive at all breakpoints
- ✅ Dark mode fully supported
- ✅ All API calls functional
- ✅ Form validation preserved

---

## Files to Create/Modify

1. **Create**: `app/(client)/scan/[campaignId]/page.module.css` (NEW)
   - Complete CSS Module for page styling

2. **Modify**: `app/(client)/scan/[campaignId]/page.js` (UPDATE)
   - Update class names and layout structure
   - Preserve all business logic

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
2. Update `page.js` JSX to use new layout and classes
3. Test at all responsive breakpoints
4. Verify form submission still works
5. Test dark mode support
6. Compare against Figma design visually

---

**Status**: 🟡 READY FOR IMPLEMENTATION  
**Next Task**: Begin CSS Module creation  
**Approval**: Awaiting user confirmation to proceed

