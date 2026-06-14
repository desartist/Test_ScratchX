# Task 62: Store Listing Page Redesign - Implementation Plan

**Date**: June 4, 2026  
**Task**: 62 - Store Listing Page Implementation  
**Status**: Starting Implementation  
**Figma Reference**: Store Listing Page (Page 9) from Figma link  

---

## Current State Analysis

**Component Structure**:
- `app/(dashboard)/stores/page.js` - Main stores listing page
- `page.module.css` - Page styling
- `components/stores/StoreCard.js` - Store card component
- `StoreCard.module.css` - Card styling
- Uses StatsCard component for metrics

**Current Layout**:
```
Header
├─ Title: "Stores"
└─ Subtitle: "Manage all branches and store-level campaign activity."

Search Bar
├─ Search input with icon
└─ Full width

Filter Tabs
├─ All, Healthy, Needs Attention, Pending Request
└─ Navy active state

Stats Grid (4 columns)
├─ Total Stores
├─ Active Stores
├─ Pending Requests
└─ QR Scans Today

Store Card Grid (2 columns)
├─ Store name + status badge
├─ Location + Manager info
├─ 3x2 metrics grid
└─ Action buttons
```

**Current Issues**:
- ⚠️ Page background: #ffffff (should be #fcfdff)
- ⚠️ Title weight: 700 (should be 800)
- ⚠️ Store card background: #f8f9fa (should be white #ffffff)
- ⚠️ Store card border-radius: 8px (should be 10px)
- ⚠️ Store card padding: 20px (should be 24px)
- ⚠️ Store card box-shadow: 0 1px 3px (should be 0 2px 4px)
- ⚠️ Status badge colors need adjustment
- ⚠️ Assign button should be teal (#00B0B1) not green (#17b890)
- ⚠️ Stat values may need font-weight adjustment

---

## Figma Design Requirements

### **Page Layout**
- Background: #FCFDFF (light page background)
- Container: Max-width 1400px, centered
- Padding: 24px (desktop), 16px (tablet), 12px (mobile)
- Gap: 24px between sections

### **Header Section**
- Title: "Stores" (28px, 800 weight, navy)
- Subtitle: "Manage all branches and store-level campaign activity." (14px, 400 weight, gray #637080)
- Background: Transparent/page background
- Border-bottom: Optional

### **Search Section**
- Input height: 44px
- Width: 100%
- Search icon: Left-aligned
- Placeholder: "Search stores"
- Border: 1px solid #E0E0E0
- Focus: Orange border (#FFA500)

### **Filter Tabs**
- Tabs: All, Healthy, Needs Attention, Pending Request
- Active tab: Navy background (#010F44), white text
- Inactive: White background, gray text
- Border-radius: 20px
- Padding: 10px 20px

### **Stats Section**
- Layout: 4 columns (desktop), 2 columns (tablet), 1 column (mobile)
- Gap: 16px

**Stat Box Specifications**:
- Background: White (#FFFFFF)
- Border: 1px solid #E0E0E0
- Border-radius: 10px
- Padding: 20px
- Icon: 32x32px, left side
- Label: 12px, 500 weight, gray, uppercase
- Value: 28px, 700 weight, navy
- Box-shadow: Subtle (0 2px 8px)

### **Store Card Grid**
- Layout: 2 columns (desktop), 1 column (tablet/mobile)
- Gap: 20px
- Card width: calc(50% - 10px) on desktop

### **Individual Store Card**
- Background: White (#FFFFFF)
- Border: 1px solid #E0E0E0
- Border-radius: 10px
- Padding: 24px
- Box-shadow: 0 2px 4px rgba(0,0,0,0.05)
- Hover: Shadow elevation, translateY(-2px)

### **Store Card Header**
- Layout: Flex, space-between, align-items: flex-start
- Store name: 18px, 600 weight, navy
- Status badge: 
  - Background: #D4EDDA (light green for "ACTIVE")
  - Color: #155724 (green text)
  - Padding: 4px 8px
  - Font: 10px, 600 weight, uppercase
  - Border-radius: 4px

### **Store Info Section**
- Location:
  - Icon: 📍
  - Text: City, State (13px, 400 weight, gray)
  - Margin-bottom: 8px
- Manager:
  - Label: "Manager:" (12px, 500 weight, gray)
  - Name: Manager name (13px, 400 weight, navy)
  - Margin-top: 4px

### **Metrics Grid** (2x3 grid)
- Layout: Grid, 3 columns
- Gap: 16px
- Margin-top: 16px
- Stat value: 24px, 700 weight, navy, center-aligned
- Stat label: 12px, 400 weight, gray, center-aligned
- Examples:
  - "3" / "Campaigns"
  - "140" / "Scans Today"
  - "48" / "Redemptions"

### **Action Buttons**
- Layout: Flex, gap 8px
- Height: 40px minimum
- Font: 13px, 600 weight

**Button 1: "✓ Assign"**
- Background: #00B0B1 (teal)
- Color: White
- Padding: 10px 20px
- Border-radius: 6px
- Flex: 1
- Hover: Darker teal

**Button 2: "Assign Campaign"**
- Background: White
- Border: 1px solid #E0E0E0
- Color: Navy (#010F44)
- Padding: 10px 16px
- Border-radius: 6px
- Flex: 1
- Hover: Gray background

**Button 3: "Staff"** (if applicable)
- Background: White
- Border: 1px solid #E0E0E0
- Color: Navy
- Icon: 👤
- Padding: 10px 16px

---

## CSS Changes Required

### **Page Styling** (page.module.css)
1. ✅ Update `.container` background: #ffffff → #fcfdff
2. ✅ Update `.title` font-weight: 700 → 800
3. ✅ Verify spacing and gaps are correct
4. ✅ Verify responsive breakpoints

### **Store Card Styling** (StoreCard.module.css)
1. ✅ Update `.card` background: #f8f9fa → #ffffff
2. ✅ Update `.card` border-radius: 8px → 10px
3. ✅ Update `.card` padding: 20px → 24px
4. ✅ Update `.card` box-shadow: 0 1px 3px → 0 2px 4px
5. ✅ Update status badge background/color for "ACTIVE" state
6. ✅ Update `.assignBtn` background: #17b890 → #00b0b1 (teal)
7. ✅ Update `.assignBtn` hover state for teal
8. ✅ Update metric values font-weight to 700 (ensure proper weight)
9. ✅ Verify all responsive styles

### **Stats Section** (page.module.css)
1. ✅ Verify stat boxes styling
2. ✅ Verify gaps and spacing
3. ✅ Ensure responsive columns (4-2-1)

---

## JSX Changes Required

**Minimal changes** - mainly visual updates, but may need:
1. ✅ Verify status badge styling classes
2. ✅ Ensure location icon displays correctly
3. ✅ Verify metrics grid structure
4. ✅ Check button styling classes
5. ✅ Ensure all props are correct

---

## Color Specifications

| Element | Light Mode | Dark Mode |
|---------|-----------|-----------|
| Page Background | #FCFDFF | #0A0A0A |
| Card Background | #FFFFFF | #1A1A1A |
| Card Border | #E0E0E0 | rgba(255,255,255,0.1) |
| Primary Text | #010F44 | #F5F5F5 |
| Secondary Text | #637080 | #A0AAB8 |
| Badge (Active) | #D4EDDA | rgba(76,175,80,0.2) |
| Badge Text | #155724 | #66BB6A |
| Assign Button | #00B0B1 | #00B0B1 |
| Secondary Button | #FFFFFF | #2A2A2A |
| Search Focus | #FFA500 | #FFA500 |

---

## Typography Specifications

| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Page Title | 28px | 800 | #010F44 |
| Subtitle | 14px | 400 | #637080 |
| Store Name | 18px | 600 | #010F44 |
| Location | 13px | 400 | #637080 |
| Manager Label | 12px | 500 | #637080 |
| Manager Name | 13px | 400 | #010F44 |
| Stat Value | 24px | 700 | #010F44 |
| Stat Label | 12px | 400 | #637080 |
| Tab Text | 13px | 600 | Varies |
| Button Text | 13px | 600 | Varies |

---

## Implementation Checklist

### **CSS Updates**:
- ✅ Page background color
- ✅ Title font-weight
- ✅ Store card background
- ✅ Store card border-radius
- ✅ Store card padding
- ✅ Store card shadow
- ✅ Status badge styling
- ✅ Assign button color (teal)
- ✅ Metric value font-weight
- ✅ Dark mode adjustments

### **Visual Verification**:
- ✅ Header displays correctly
- ✅ Search input styled properly
- ✅ Filter tabs work and style correctly
- ✅ Stats section displays 4 boxes
- ✅ Store cards display in 2 columns
- ✅ Store info displays correctly
- ✅ Status badge shows correct color
- ✅ Metrics grid displays 3x2
- ✅ Action buttons styled correctly
- ✅ Responsive at all breakpoints
- ✅ Dark mode fully functional

---

## Files to Modify

1. **`app/(dashboard)/stores/page.module.css`**
   - Update container background color
   - Update title font-weight
   - Verify other styling

2. **`components/stores/StoreCard.module.css`**
   - Update card background color
   - Update border-radius
   - Update padding and shadow
   - Update assign button color to teal
   - Update badge styling
   - Verify metric styling

3. **`app/(dashboard)/stores/page.js`** (minimal changes)
   - May need class name adjustments if CSS changes require it

4. **`components/stores/StoreCard.js`** (verify, minimal changes)
   - Ensure status badge renders correctly
   - Verify all structure is correct

---

## Success Criteria

✅ Page background is #FCFDFF
✅ Title is 28px, 800 weight
✅ Store cards have white background
✅ Store cards have 10px border-radius
✅ Store cards have 24px padding
✅ Store cards have proper shadow
✅ Status badges show correct colors (#D4EDDA bg, #155724 text)
✅ Location icon displays
✅ Manager info displays correctly
✅ Metrics grid shows 3x2 layout
✅ Assign button is teal (#00B0B1)
✅ Action buttons display correctly
✅ Responsive layout works at all breakpoints
✅ Dark mode fully functional
✅ Hover states work properly

---

**Status**: ✅ Analysis Complete  
**Next**: Proceed with CSS updates and verification

