# Comprehensive Figma Implementation Specification
**Date**: June 4, 2026  
**Scope**: Complete UI redesign from Figma designs  
**Approach**: Specification-first, logic-preserved implementation  

---

## Executive Summary

This document provides **exact, pixel-perfect specifications** for reimplementing all ScratchX pages to match Figma designs while preserving all business logic, API calls, and data flows.

**Key Principle**: CSS and Layout changes ONLY. All JSX logic, API integration, and state management remain unchanged.

---

# PART 1: PAGE-BY-PAGE SPECIFICATION

## PAGE 1: ONBOARDING / STORE SETUP

### Current State
- Not visible in current implementation
- Appears to be skipped or merged with auth flow

### Figma Design Specification

**Layout**: Centered, single-column, mobile-first
**Max-width**: ~500px (mobile optimized)
**Background**: White
**Hero Section**:
```
┌─────────────────────────────┐
│       ScratchX Logo         │  (Logo: Navy "ScratchX" with orange "X")
│                             │
│  Set up your store in       │  (Heading: 32px, 800 weight, navy)
│  minutes                    │
│                             │
│  Create campaigns, engage   │  (Body: 14px, 400 weight, gray)
│  customers and turn         │
│  walk-in customers into     │
│  repeat buyers.             │
│                             │
│  [GET STARTED →]            │  (Orange button, 200px, centered)
│                             │
│  Takes less than 7 minutes  │  (Footer text: 12px, gray)
└─────────────────────────────┘
```

**Feature Cards** (Below):
```
┌─────────────┐  ┌─────────────┐
│  Smart QR   │  │  Easy        │
│  Coupons    │  │  Campaign    │
│  [Icon]     │  │  Creation   │
│             │  │  [Icon]     │
└─────────────┘  └─────────────┘
```

**Color Specifications**:
- Background: #FFFFFF (white)
- Primary text: #010F44 (navy)
- Secondary text: #637080 (muted gray)
- Button: #FFA500 (orange) with gradient to #F59E0B
- Icon backgrounds: #E0E7FF (light lavender)

**Typography**:
- Logo: 24px, 800 weight, Afacad
- Heading: 32px, 800 weight, Afacad
- Body: 14px, 400 weight, Afacad Flux
- Footer: 12px, 400 weight, Afacad Flux

**Spacing**:
- Top padding: 48px
- Logo to heading: 32px
- Heading to body: 24px
- Body to button: 28px
- Button to footer text: 16px
- Feature cards gap: 24px
- Container padding: 20px sides

**Button Specifications**:
- Text: "Get Started →"
- Width: 200px
- Height: 44px
- Border-radius: 6px
- Font: 14px, 600 weight
- Gradient: linear-gradient(135deg, #FFA500 0%, #F59E0B 100%)
- Hover: translateY(-2px), shadow elevation
- Cursor style: pointer with chevron icon

---

## PAGE 2: STORE SETUP FORM (Tell us about your store)

### Current State
- Basic form with fields
- Minimal styling
- No section grouping

### Figma Design Specification

**Layout**: Centered, card-based, ~560px wide
**Background**: #FCFDFF (light page background)
**Card Styling**:
```
┌────────────────────────────────────┐
│  [≡]                [bell]         │  (Header: burger menu, notification)
│                                    │
│  Tell us about your store          │  (Section title: 24px, 800 weight)
│  Set up your store to start         │  (Subtitle: 14px, 400 weight)
│  creating campaigns.               │
│                                    │
│  Your Name                         │  (Label: 14px, 500 weight, navy)
│  [Your full name________]          │  (Input: 14px, placeholder gray)
│                                    │
│  Store Name                        │  (Label)
│  [Your store name________]         │  (Input)
│                                    │
│  Business Type                     │  (Label)
│  [Choose Your Business ▼]          │  (Dropdown)
│                                    │
│  Contact Number                    │  (Label)
│  [+91 ▼] [Your phone number__]    │  (Input with country code)
│                                    │
│  Email                             │  (Label)
│  [your@email.com________]          │  (Input)
│                                    │
│  Store Address                     │  (Label)
│  [Current store location__]        │  (Input)
│                                    │
└────────────────────────────────────┘
```

**Form Specifications**:
- Card background: #FFFFFF (white)
- Card padding: 24px
- Card border-radius: 10px
- Card shadow: 0 2px 8px rgba(0,0,0,0.06)
- Field spacing: 20px between fields

**Input Field Specifications**:
- Height: 44px
- Padding: 10px 12px
- Border: 1px solid #E8E8E8
- Border-radius: 6px
- Font: 14px, 400 weight
- Focus: Orange border (#FFA500), 3px shadow ring
- Placeholder color: #999999
- Background: #FFFFFF

**Label Specifications**:
- Font: 14px, 500 weight, Afacad
- Color: #010F44 (navy)
- Margin-bottom: 8px

**Dropdown Specifications**:
- Same height/padding as inputs
- Arrow icon on right
- Options styling: light gray background on hover

**Header Styling**:
- Position: sticky/fixed at top
- Background: white
- Padding: 12px 20px
- Border-bottom: 1px solid #E0E0E0
- Display: flex with space-between
- Burger menu: 32x32px, navy
- Bell icon: 24x24px, navy with notification badge

**Color Specifications**:
- Page background: #FCFDFF
- Card background: #FFFFFF
- Labels: #010F44 (navy)
- Input borders: #E8E8E8 (light gray)
- Focus border: #FFA500 (orange)
- Placeholder: #999999 (medium gray)

**Typography**:
- Section title: 24px, 800 weight, Afacad
- Subtitle: 14px, 400 weight, Afacad Flux
- Labels: 14px, 500 weight, Afacad
- Input text: 14px, 400 weight, Afacad

---

## PAGE 3: STORE READY (Success Screen)

### Current State
- May not exist currently
- Appears after store setup

### Figma Design Specification

**Layout**: Centered, card-based, ~500px wide
**Background**: #FCFDFF

**Design**:
```
┌────────────────────────────────────┐
│                                    │
│         [Illustration]             │  (Store/shop illustration)
│      (colorful store graphic)       │
│                                    │
│   Your store is ready!             │  (Heading: 28px, 700 weight)
│                                    │
│   Let's launch your first          │  (Body: 14px, 400 weight)
│   campaign                         │
│                                    │
│ [CREATE MY FIRST CAMPAIGN]         │  (Button: orange, full width)
│                                    │
│    Skip for now                    │  (Link: underlined, gray)
│                                    │
└────────────────────────────────────┘
```

**Illustration**:
- Placeholder: Store/shop building graphic
- Colors: Blues, purples, oranges (illustrative)
- Size: 200x200px

**Button Specifications**:
- Text: "CREATE MY FIRST CAMPAIGN"
- Width: 100% (max 400px, centered)
- Height: 48px
- Background: Orange gradient (#FFA500 → #F59E0B)
- Color: White
- Border-radius: 6px
- Font: 14px, 600 weight, uppercase
- Hover: Shadow elevation, translateY(-2px)

**Link Specifications**:
- Text: "Skip for now"
- Color: #637080 (muted gray)
- Text-decoration: underline
- Font: 14px, 400 weight
- Hover: Color changes to navy

**Spacing**:
- Top padding: 40px
- Illustration to heading: 24px
- Heading to body: 12px
- Body to button: 32px
- Button to link: 16px

---

## PAGE 4: CREATE CAMPAIGN (Multi-step Form)

### Current State
- Single form page
- All fields on one page
- Minimal section grouping

### Figma Design Specification

**Layout**: Card-based, centered, ~600px wide
**Background**: #FCFDFF
**Flow**: Multi-step (Step 1 of 3, etc.)

**STEP 1: Campaign Details**
```
┌──────────────────────────────────┐
│ [≡]                    [bell]    │  (Header)
│                                  │
│ Create Your Campaign             │  (Title: 28px, 800 weight)
│ Let's launch your first campaign │  (Subtitle: 14px, 400 weight)
│                                  │
│ Campaign Name *                  │  (Label with asterisk for required)
│ [E.g. Summer Special_________]  │  (Input with placeholder)
│                                  │
│ Campaign Duration                │  (Label)
│ Start Date        │  End Date    │  (Two columns)
│ [DD/MM/YYYY 📅]   │ [DD/MM/YYYY] │  (Date inputs with calendar icon)
│                                  │
│ Number of Display Coupons        │  (Label)
│ [Choose No. of Coupons ▼]       │  (Dropdown)
│                                  │
│        [Save & Continue]         │  (Button: full width, gray on step 1)
│                                  │
└──────────────────────────────────┘
```

**STEP 2: Setup Billing Range**
```
┌──────────────────────────────────┐
│ [≡]                    [bell]    │  (Header)
│                                  │
│ Setup Billing Range              │  (Title)
│ Customers will receive rewards   │  (Subtitle)
│ based on their purchase range.   │
│                                  │
│ Range 1 [✎]                     │  (Range name with edit icon)
│ Min. Amount (₹)  │ Max (₹)      │  (Two input columns)
│ [e.g. 500]       │ [e.g. 999]   │
│                                  │
│ Range 2 [✎]                     │
│ Min. Amount (₹)  │ Max (₹)      │
│ [2000]           │              │
│                                  │
│ Range 3 →                        │  (Plus: Add more range)
│ [+ Add more range]              │
│                                  │
│ Set Reward Cards (Range 1)       │  (Section below)
│ Customers will receive one of    │
│ these rewards after scratching.  │
│                                  │
│ Coupon 1                         │  (Card list with edit icons)
│ Reward Type: [Fixed Amount ▼]   │
│ Reward Amount: [e.g. 5]         │
│                                  │
│        [Preview & Launch]        │  (Button: orange)
│                                  │
└──────────────────────────────────┘
```

**Form Field Specifications**:
- Input height: 44px
- Padding: 10px 12px
- Border: 1px solid #E8E8E8
- Border-radius: 6px
- Font: 14px, 400 weight
- Label: 14px, 500 weight, navy

**Two-Column Layout**:
- Gap between columns: 16px
- Each column: flex: 1
- On mobile: Stack vertically

**Date Input Specifications**:
- Calendar icon: Right-aligned in input
- Placeholder: "DD/MM/YYYY"
- Icon size: 20x20px
- Icon color: #999999

**Button Specifications**:
- Step 1 button: "Save & Continue" - Gray (#CCCCCC) background, navy text
- Step 2 button: "Preview & Launch" - Orange background, white text
- Width: 100% (full card width)
- Height: 48px
- Border-radius: 6px
- Font: 14px, 600 weight

**Dropdown Specifications** (for coupons count, reward type):
- Height: 44px
- Padding: 10px 12px
- Border: 1px solid #E8E8E8
- Arrow icon on right
- Background: white
- Options: Light gray hover state

**Edit Icon Specifications**:
- Size: 16x16px
- Color: #999999
- Hover: navy
- Cursor: pointer

**Coupon Card Specifications** (in reward section):
- Background: #F9F9F9 (very light gray)
- Padding: 12px
- Border-radius: 6px
- Margin-bottom: 12px
- Flexbox with space-between for title and edit icon

**Spacing**:
- Section to section: 28px
- Field to field: 16px
- Card padding: 24px
- Header to content: 20px

**Typography**:
- Title: 28px, 800 weight, Afacad
- Subtitle: 14px, 400 weight, Afacad Flux
- Labels: 14px, 500 weight, Afacad
- Input text: 14px, 400 weight, Afacad

---

## PAGE 5: CUSTOMER SCANNING (Mobile-First QR + Form)

### Current State
- Form-heavy layout
- QR code not prominently featured
- Not mobile-optimized visually

### Figma Design Specification

**Layout**: Mobile-first, two-section (QR left, form right on desktop; stacked on mobile)
**Background**: #FFFFFF
**Responsive**: Mobile (100vw), Tablet (flex columns)

**Desktop Layout** (1024px+):
```
┌─────────────────────────────────────────────┐
│ [QR CODE SECTION]  │  [FORM SECTION]       │
│                    │                        │
│  ┌──────────────┐  │  Unlock Your Reward   │
│  │              │  │  Please enter your    │
│  │   [QR CODE]  │  │  details to unlock    │
│  │              │  │  exclusive offers.    │
│  │              │  │                       │
│  └──────────────┘  │  Your Name *          │
│                    │  [Your full name__]   │
│  [Open URL]        │                       │
│                    │  Contact Number *     │
│                    │  [+91] [phone___]     │
│                    │                       │
│                    │  Select your purchase │
│                    │  range                │
│                    │  ☐ ₹1 - ₹499         │
│                    │  ☐ ₹500 - ₹1,999     │
│                    │  ☐ ₹2,000+           │
│                    │                       │
│                    │  [Show My Coupons]    │
└─────────────────────────────────────────────┘
```

**Mobile Layout** (< 768px):
```
┌──────────────────────┐
│  Scan QR Code        │
│                      │
│  ┌────────────────┐  │
│  │                │  │
│  │   [QR CODE]    │  │
│  │                │  │
│  └────────────────┘  │
│                      │
│  [Open URL]          │
│                      │
│  Unlock Your Reward  │
│  Please enter your   │
│  details...          │
│                      │
│  Your Name *         │
│  [Your name_____]    │
│                      │
│  Contact Number *    │
│  [+91] [phone_]      │
│                      │
│  Select your range   │
│  ☐ ₹1 - ₹499        │
│  ☐ ₹500 - ₹1,999    │
│  ☐ ₹2,000+          │
│                      │
│  [Show My Coupons]   │
└──────────────────────┘
```

**QR Code Section**:
- Width: 50% (desktop), 100% (mobile)
- Padding: 40px
- Background: #000000 (black) or dark gray
- QR container: 300x300px (max), centered
- QR code: Black and white
- Text below: "Open URL" link or button
- Font: 12px, gray text
- Rounded corners on QR display: 8px

**Form Section**:
- Width: 50% (desktop), 100% (mobile)
- Padding: 40px (desktop), 20px (mobile)
- Background: #FFFFFF
- Heading: "Unlock Your Reward"
  - Font: 28px, 700 weight, Afacad, navy
  - Margin-bottom: 8px
- Subheading: "Please enter your details to unlock..."
  - Font: 14px, 400 weight, Afacad Flux, gray
  - Margin-bottom: 24px

**Input Fields**:
- Height: 44px
- Padding: 10px 12px
- Border: 1px solid #E8E8E8
- Border-radius: 6px
- Font: 14px, 400 weight
- Margin-bottom: 16px
- Focus: Orange border, 3px shadow

**Label Specifications**:
- Font: 14px, 500 weight, Afacad, navy
- Margin-bottom: 8px
- Display asterisk for required fields in red

**Radio/Checkbox Section** (Range selection):
- Label: "Select your purchase range"
  - Font: 14px, 500 weight, navy
  - Margin-bottom: 12px
- Options:
  - ☐ ₹1 - ₹499
  - ☐ ₹500 - ₹1,999
  - ☐ ₹2,000+
- Each option: 44px height, padding 12px
- Checkbox: 18x18px, navy when selected
- Option text: 14px, 400 weight
- Margin-bottom between options: 8px
- Selected option: Light blue background (#E0E7FF)

**Button Specifications**:
- Text: "Show My Coupons"
- Width: 100% (form width)
- Height: 48px
- Background: Orange gradient (#FFA500 → #F59E0B)
- Color: White
- Border-radius: 6px
- Font: 14px, 600 weight, uppercase
- Margin-top: 24px
- Hover: Shadow elevation, transform

**Responsive Behavior**:
- Desktop (1024px+): Flex row, QR left 50%, form right 50%
- Tablet (768px-1023px): Flex column, full width
- Mobile (< 768px): Flex column, full width, smaller padding

**Color Specifications**:
- Background: #000000 (QR section), #FFFFFF (form)
- Heading: #010F44 (navy)
- Subheading: #637080 (muted gray)
- Input border: #E8E8E8
- Input focus: #FFA500 (orange)
- Option background (selected): #E0E7FF (light lavender)
- Button: Orange gradient

**Typography**:
- Heading: 28px, 700 weight, Afacad
- Subheading: 14px, 400 weight, Afacad Flux
- Labels: 14px, 500 weight, Afacad
- Input/Option text: 14px, 400 weight, Afacad

---

## PAGE 6: COUPON GRID / SCRATCH CARD SELECTION

### Current State
- Not visible in current implementation
- Critical customer-facing page

### Figma Design Specification

**Layout**: Grid layout, centered, mobile-first
**Background**: #FCD34D (Golden yellow)
**Card Grid**: 3 columns desktop, 2 columns tablet, 1 column mobile

**Design**:
```
┌──────────────────────────────────────────┐
│  [Store Logo] Bansal Store               │
│  Summer Hot Offer                        │  (Store badge + name)
│                                          │
│  Pick your lucky coupon                  │  (Heading: 28px, 800 weight)
│  You can scratch only one                │  (Subtitle: 14px, 400 weight)
│                                          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │  [🎁]   │ │  [🎁]   │ │  [🎁]   │  │
│  │  ₹ 50   │ │  ₹ 100  │ │  ₹ 500  │  │
│  └─────────┘ └─────────┘ └─────────┘  │
│                                          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │  [🎁]   │ │  [🎁]   │ │  [🎁]   │  │
│  │  ₹ 250  │ │  ₹ 300  │ │  ₹ 1000 │  │
│  └─────────┘ └─────────┘ └─────────┘  │
│                                          │
└──────────────────────────────────────────┘
```

**Header Specifications**:
- Padding: 20px
- Display: flex, align-items: center, gap: 12px
- Store badge: 32x32px, circular, background color
- Store name: 16px, 600 weight, navy
- Offer text: 12px, 400 weight, gray

**Section Title**:
- Font: 28px, 800 weight, Afacad, navy
- Margin: 32px 20px 8px 20px

**Subtitle**:
- Font: 14px, 400 weight, Afacad Flux, gray
- Margin: 0 20px 32px 20px

**Scratch Card**:
- Background: #FCD34D (golden yellow)
- Width: 100px (desktop), 80px (mobile)
- Height: 100px (square)
- Aspect ratio: 1:1
- Border-radius: 8px
- Display: Flex, centered
- Icon: Gift emoji or icon (🎁) - 40px
- Text below icon: Amount (₹50, ₹100, etc.)
  - Font: 16px, 700 weight, navy
  - Margin-top: 8px
- Border: 2px solid #F59E0B (darker gold) on hover
- Shadow: Subtle shadow, increases on hover
- Cursor: pointer
- Hover: Scale(1.05), border highlight
- Selected: Border becomes thicker, background slightly darker, checkmark overlay

**Grid Specifications**:
- Container padding: 20px
- Desktop (1024px+): 3 columns, gap 24px
- Tablet (768px-1023px): 2 columns, gap 20px
- Mobile (< 768px): 1 column, gap 16px
- Max-width: 1000px, centered

**Color Specifications**:
- Background: #FCD34D (golden yellow)
- Card background: #FCD34D (same)
- Card border (hover): #F59E0B (darker gold)
- Card border (selected): #01188E (navy)
- Text: #010F44 (navy)
- Icon: Black

**Typography**:
- Title: 28px, 800 weight, Afacad
- Subtitle: 14px, 400 weight, Afacad Flux
- Amount: 16px, 700 weight, Afacad

**Responsive Behavior**:
- Desktop: 3x2 grid (6 cards visible)
- Tablet: 2x3 grid
- Mobile: 1 column stack
- Card size scales responsively

---

## PAGE 7: DASHBOARD (Merchant Overview)

### Current State
- Simple grid of stat cards
- Missing analytics, charts
- Not matching Figma design

### Figma Design Specification

**Layout**: Multi-section, card-based, responsive
**Background**: #FCFDFF (light page background)
**Sidebar**: Navigation on left (200px fixed)
**Main content**: Flex: 1

**Dashboard Structure**:
```
┌────────────────────────────────────────────────────┐
│ MERCHANT DASHBOARD (OVERVIEW)                      │
│                                                    │
│ ┌──────────────────────────────────────────────┐  │
│ │ ACTIVE CAMPAIGNS  │  TOTAL STORES  │ TOTAL   │  │
│ │       0           │       0        │ SCANS 0 │  │
│ └──────────────────────────────────────────────┘  │
│                                                    │
│ ┌──────────────────────────────────────────────┐  │
│ │ REDEMPTIONS │                                │  │
│ │      0      │                                │  │
│ └──────────────────────────────────────────────┘  │
│                                                    │
│ ┌──────────────────────────────────────────────┐  │
│ │  SCRATCH INVENTORY                      [↑]  │  │
│ │  Unlimited Scratches  │  7,420 Used      │  │
│ │                       │  [======      ]  │  │
│ │  2,580 Scratches      │                  │  │
│ │  Remaining            │                  │  │
│ │                       │  ⚡ 18%          │  │
│ └──────────────────────────────────────────────┘  │
│                                                    │
│ ┌──────────────────────────────────────────────┐  │
│ │  Scratch Consumption                         │  │
│ │  [Bar Chart]                                 │  │
│ │  ▄▄▄ ▄▄▄ ▄▄▄ ▄▄▄ ▄▄▄ ▄▄▄ ▄▄▄               │  │
│ └──────────────────────────────────────────────┘  │
│                                                    │
│ ┌──────────────────────────────────────────────┐  │
│ │ ACTIVE CAMPAIGNS                             │  │
│ │ [Campaign card with chart]                   │  │
│ │ [Campaign card with chart]                   │  │
│ └──────────────────────────────────────────────┘  │
│                                                    │
└────────────────────────────────────────────────────┘
```

**Header Section**:
- Background: White
- Padding: 20px
- Border-bottom: 1px solid #E0E0E0
- Title: "MERCHANT DASHBOARD"
  - Font: 28px, 800 weight, Afacad, navy
- Subtitle: "Overview"
  - Font: 12px, 500 weight, uppercase, gray

**Stat Cards Row** (Top 4 cards):
- Layout: Flex, 4 columns (desktop), 2 columns (tablet), 1 column (mobile)
- Gap: 16px
- Each card width: calc(25% - 12px)

**Individual Stat Card**:
- Background: White
- Border: 1px solid #E0E0E0
- Border-left: 4px solid (color varies by card)
  - Active Campaigns: #01188E (navy)
  - Total Stores: #00B0B1 (teal)
  - Total Scans: #0A8905 (green)
  - Redemptions: #F59E0B (orange)
- Padding: 20px
- Border-radius: 10px
- Box-shadow: 0 2px 4px rgba(0,0,0,0.05)
- Hover: Shadow elevation, translateY(-2px)

**Stat Card Content**:
- Label: 12px, 500 weight, uppercase, gray, letter-spacing 0.5px
- Value: 32px, 800 weight, navy
- Layout: Flex column, label above value

**Scratch Inventory Card**:
- Background: Linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%) (Purple-blue gradient)
- Color: White text
- Padding: 28px
- Border-radius: 10px
- Box-shadow: 0 6px 20px rgba(0,0,0,0.1)
- Display: Flex with space-between

**Inventory Left Section**:
- Title: "Scratch Inventory"
  - Font: 16px, 600 weight, white
  - Margin-bottom: 16px
- Large number: "2,580"
  - Font: 48px, 800 weight, white
- Label: "Scratches Remaining"
  - Font: 12px, 400 weight, white/90%

**Inventory Right Section**:
- Used count: "7,420 Used"
  - Font: 14px, 500 weight, white
  - Margin-bottom: 12px
- Progress bar: 
  - Height: 8px
  - Background: rgba(255,255,255,0.3)
  - Fill: linear-gradient(90deg, #FCD34D, #F59E0B)
  - Border-radius: 4px
  - Width: 80% (example)
- Percentage: "⚡ 18%"
  - Font: 14px, 600 weight, #FCD34D (yellow)
  - Margin-top: 12px

**Chart Card**:
- Background: White
- Padding: 24px
- Border-radius: 10px
- Box-shadow: 0 2px 4px rgba(0,0,0,0.05)
- Margin-bottom: 20px
- Title: "Scratch Consumption"
  - Font: 16px, 600 weight, navy
  - Margin-bottom: 16px
- Chart: Bar chart visualization
  - Bars: Blue (#2196F3) 
  - Height: 200px
  - Grid lines: Light gray
  - X-axis labels: Day/Date
  - Y-axis: Values

**Campaign Cards Section**:
- Title: "ACTIVE CAMPAIGNS"
  - Font: 16px, 600 weight, navy
  - Margin: 24px 0 16px 0
- Layout: Grid (2 columns desktop, 1 column mobile)
- Gap: 16px

**Individual Campaign Card**:
- Background: White
- Padding: 20px
- Border: 1px solid #E0E0E0
- Border-radius: 10px
- Box-shadow: 0 2px 4px rgba(0,0,0,0.05)
- Display: Flex, space-between
- Left: Campaign info
  - Title: 16px, 600 weight, navy
  - Date: 12px, 400 weight, gray
  - Status badge: Small green/orange badge
- Right: Mini chart (small bar chart)

**Responsive Behavior**:
- Desktop (1024px+): Sidebar fixed, content flex
- Tablet (768px-1023px): Sidebar collapses, hamburger menu
- Mobile (< 768px): Full width, sidebar hidden

**Color Specifications**:
- Background: #FCFDFF (light)
- Cards: #FFFFFF (white)
- Text: #010F44 (navy)
- Labels: #637080 (muted gray)
- Borders: #E0E0E0 (light gray)
- Card left border colors vary by type
- Inventory gradient: Purple-blue (#8B5CF6 → #6366F1)
- Chart bars: #2196F3 (blue)

**Typography**:
- Page title: 28px, 800 weight, Afacad
- Section title: 16px, 600 weight, Afacad
- Card label: 12px, 500 weight, Afacad
- Card value: 32px, 800 weight, Afacad
- Inventory number: 48px, 800 weight, Afacad
- Body text: 14px, 400 weight, Afacad Flux

---

## PAGE 8: CAMPAIGN LISTING

### Current State
- Basic card grid
- Simple badge styling
- No tab filtering visible in Figma

### Figma Design Specification

**Layout**: Card-based grid, responsive
**Background**: #FCFDFF

**Header Section**:
- Title: "Campaigns"
  - Font: 28px, 800 weight, navy
- Subtitle: "Manage your campaigns and track performance"
  - Font: 14px, 400 weight, gray
- Button: "+ Create Campaign"
  - Position: Top right
  - Background: Navy (#010F44)
  - Color: White
  - Padding: 10px 20px
  - Border-radius: 6px
  - Font: 14px, 600 weight

**Stats Section**:
- Display: 3 stat boxes above grid
- Layout: Flex, 3 columns (desktop), 1 column (mobile)
- Stats: Total Campaigns, Active, Search Results
- Each stat:
  - Label: 12px, 500 weight, gray, uppercase
  - Value: 24px, 700 weight, navy

**Search Section**:
- Input: 
  - Width: 100%
  - Height: 44px
  - Padding: 10px 12px
  - Border: 1px solid #E8E8E8
  - Border-radius: 6px
  - Placeholder: "Search campaigns..."
  - Icon: Magnifying glass on left (20px)

**Tab/Filter Section**:
- Tabs: ALL, ACTIVE, LOW SCRATCHES, ENDING SOON, ENDED, DRAFT
- Active tab: Background #010F44, white text
- Inactive tab: White background, gray text
- Tab padding: 10px 16px
- Font: 13px, 500 weight
- Underline on active: 3px #010F44

**Campaign Card Grid**:
- Layout: 3 columns (desktop), 2 columns (tablet), 1 column (mobile)
- Gap: 20px
- Card width: calc(33.333% - 13px) on desktop
- Max-width card: 400px

**Individual Campaign Card**:
- Background: White
- Border: 1px solid #E0E0E0
- Border-radius: 10px
- Padding: 20px
- Box-shadow: 0 2px 4px rgba(0,0,0,0.05)
- Hover: Shadow elevation, translateY(-2px)

**Card Header**:
- Display: Flex, space-between
- Title: "test Campaign"
  - Font: 16px, 600 weight, navy
- Badge: "ACTIVE"
  - Background: #D4EDDA (light green)
  - Color: #155724 (green)
  - Padding: 4px 8px
  - Border-radius: 4px
  - Font: 10px, 600 weight, uppercase

**Card Content**:
- Date: "3 Jun 2026 - 6 Jun 2026"
  - Font: 12px, 400 weight, gray
  - Margin-bottom: 16px
- Section: "Billing Range:"
  - Label: 12px, 500 weight, gray
  - Value: "−" (placeholder)
  - Margin-bottom: 16px
- Section: "Days Remaining:"
  - Label: 12px, 500 weight, gray
  - Value: "3" (Large red number, 28px, 700 weight)
  - Margin-bottom: 16px
- Section: "Stores Assigned:"
  - Label: 12px, 500 weight, gray
  - Value: "1" (Large number, 24px, 700 weight)

**Scratch Allocation Section**:
- Background: #F5F5F5 (light gray)
- Padding: 12px
- Border-radius: 6px
- Title: "SCRATCH ALLOCATION"
  - Font: 11px, 600 weight, uppercase, gray
- Content: 
  - "Allocated Scratches: 7 / 1,606"
  - Font: 12px, 400 weight
  - Margin-bottom: 8px
- Progress bar:
  - Background: #E0E0E0
  - Fill: varies by allocation %
  - Height: 6px
  - Border-radius: 3px
- Remaining: "1599 of 1606 remaining"
  - Font: 11px, 400 weight, gray

**Card Footer**:
- Buttons: "View", "Edit", "Analytics"
- Layout: Flex, space-around
- Each button:
  - Background: White
  - Border: 1px solid #E0E0E0
  - Padding: 8px 16px
  - Border-radius: 6px
  - Font: 12px, 600 weight, navy
  - Cursor: pointer
  - Hover: Background #F5F5F5

**Color Specifications**:
- Background: #FCFDFF
- Card background: #FFFFFF
- Card border: #E0E0E0
- Text: #010F44 (navy)
- Labels: #637080 (muted gray)
- Active badge: #D4EDDA (light green) background, #155724 (green) text
- Days remaining: #FF6B6B (red) for countdown
- Active tab: #010F44 (navy) background
- Button hover: #F5F5F5 (light gray)

**Typography**:
- Title: 28px, 800 weight, Afacad
- Card title: 16px, 600 weight, Afacad
- Labels: 12px, 500 weight, Afacad
- Card values: 24px, 700 weight, Afacad
- Tab text: 13px, 500 weight, Afacad
- Body: 12px, 400 weight, Afacad Flux

---

## PAGE 9: STORE LISTING

### Current State
- Basic card layout
- Missing visual design details
- Not fully matching Figma

### Figma Design Specification

**Layout**: Card-based grid, responsive
**Background**: #FCFDFF

**Header**:
- Title: "Stores"
  - Font: 28px, 800 weight, navy
- Subtitle: "Manage all branches and store-level campaign activity."
  - Font: 14px, 400 weight, gray

**Search Section**:
- Input: 100% width, 44px height, same styling as Campaign Listing
- Icon: Search/magnifying glass on left

**Tab/Filter Section**:
- Tabs: All, Healthy, Needs Attention, Pending Request
- Same styling as Campaign tabs
- Active tab: Navy background, white text

**Stats Section** (4 stat boxes):
- Layout: Flex, 4 columns (desktop), 2 columns (tablet)
- Gap: 16px
- Each box:
  - Background: White
  - Border: 1px solid #E0E0E0
  - Padding: 20px
  - Border-radius: 10px
  - Icon: Left side (32x32px)
  - Label: 12px, 500 weight, gray, uppercase
  - Value: 28px, 700 weight, navy

**Store Card Grid**:
- Layout: 2 columns (desktop), 1 column (tablet/mobile)
- Gap: 20px
- Card width: calc(50% - 10px)

**Individual Store Card**:
- Background: White
- Border: 1px solid #E0E0E0
- Border-radius: 10px
- Padding: 24px
- Box-shadow: 0 2px 4px rgba(0,0,0,0.05)
- Hover: Shadow elevation

**Store Card Header**:
- Display: Flex, space-between, align-items: flex-start
- Store name: 18px, 600 weight, navy
- Badge: "ACTIVE"
  - Background: #D4EDDA (light green)
  - Color: #155724 (green)
  - Padding: 4px 8px
  - Font: 10px, 600 weight, uppercase

**Store Location**:
- Icon: 📍 (location pin)
- Text: "New Delhi, Delhi"
  - Font: 13px, 400 weight, gray
- Margin-bottom: 8px

**Manager Info**:
- Label: "Manager:"
  - Font: 12px, 500 weight, gray
- Name: "Abhishek Pratap Singh"
  - Font: 13px, 400 weight, navy

**Stats Grid** (2x3 grid below manager):
- Layout: Grid, 3 columns
- Gap: 16px
- Margin-top: 16px

**Stat Item**:
- Display: Flex, flex-direction: column, align-items: center
- Large number: 24px, 700 weight, navy (center aligned)
- Label: 12px, 400 weight, gray (center aligned)
- Examples:
  - "3 Campaigns"
  - "140 Scans Today"
  - "48 Redemptions"
  - "920 Customers"
  - "264 Repeat"
  - "0 Pending"

**Action Buttons** (Bottom):
- Layout: Flex, gap 8px
- Button 1: "✓ Assign"
  - Background: #00B0B1 (teal)
  - Color: White
  - Padding: 10px 20px
  - Border-radius: 6px
  - Font: 13px, 600 weight
  - Flex: 1
- Button 2: "Assign Campaign"
  - Background: White
  - Border: 1px solid #E0E0E0
  - Color: Navy
  - Padding: 10px 16px
  - Border-radius: 6px
  - Font: 13px, 600 weight
- Button 3: "Staff"
  - Background: White
  - Border: 1px solid #E0E0E0
  - Color: Navy
  - Padding: 10px 16px
  - Icon: 👤 (person icon)

**Color Specifications**:
- Background: #FCFDFF
- Card background: #FFFFFF
- Card border: #E0E0E0
- Text: #010F44 (navy)
- Labels: #637080 (muted gray)
- Badge: #D4EDDA (light green) background
- Assign button: #00B0B1 (teal)

**Typography**:
- Title: 28px, 800 weight, Afacad
- Store name: 18px, 600 weight, Afacad
- Labels: 12px, 500 weight, Afacad
- Stat values: 24px, 700 weight, Afacad
- Body: 13px, 400 weight, Afacad Flux

---

# PART 2: COMPONENT STYLING SPECIFICATIONS

## SHARED COMPONENTS

### FormButton (Updated for Figma)
**Primary (Default)**:
- Background: Linear-gradient(135deg, #FFA500 0%, #F59E0B 100%)
- Color: White
- Padding: 10px 20px
- Height: 44px (min)
- Border-radius: 6px
- Font: 14px, 600 weight
- Box-shadow: 0 2px 8px rgba(255, 165, 0, 0.2)
- Hover: translateY(-2px), shadow elevation
- Active: translateY(0)
- Disabled: opacity 0.6

**Secondary**:
- Background: #010F44 (navy)
- Color: White
- Same sizing/spacing as primary
- Hover: Background #01188E (navy-active)

**Outline**:
- Background: Transparent
- Border: 2px solid #010F44
- Color: #010F44
- Hover: Background #010F44, color white

### FormInput (Updated for Figma)
- Height: 44px
- Padding: 10px 12px
- Border: 1px solid #E8E8E8
- Border-radius: 6px
- Font: 14px, 400 weight
- Focus: Border #FFA500, shadow 0 0 0 3px rgba(255, 165, 0, 0.1)
- Label: 14px, 500 weight, navy
- Label margin-bottom: 8px

### Modal (Updated for Figma)
- Border-radius: 12px
- Max-width: 500px
- Box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)
- Header padding: 20px 24px
- Body padding: 24px
- Footer padding: 16px 24px
- Overlay: rgba(0,0,0,0.5)

---

# PART 3: COLOR PALETTE (Figma-Accurate)

```
PRIMARY:
- Orange: #FFA500
- Orange hover: #F59E0B
- Orange light: #FEF3C7

SECONDARY:
- Navy: #010F44
- Navy active: #01188E
- Navy light: #1A3A5C

SEMANTIC:
- Success: #4CAF50
- Warning: #FF9800
- Error: #FF6B6B
- Info: #2196F3

ACCENT:
- Teal: #00B0B1
- Green: #0A8905
- Purple: #8B5CF6
- Indigo: #6366F1
- Yellow: #FCD34D

NEUTRAL:
- White: #FFFFFF
- Off-white: #F9F9F9
- Light gray: #F5F5F5
- Medium gray: #E8E8E8
- Dark gray: #595858
- Muted: #637080
- Black: #010F44 (near-black)

BACKGROUNDS:
- Page: #FCFDFF
- Card: #FFFFFF
- Light section: #F5F5F5
```

---

# PART 4: RESPONSIVE BREAKPOINTS

**Desktop**: 1024px+
- Full layouts
- Multiple columns
- Sidebar visible

**Tablet**: 768px - 1023px
- 2-column layouts
- Sidebar hidden/hamburger
- Touch-friendly spacing

**Mobile**: < 768px
- Single column
- Full-width cards
- Hamburger navigation
- Larger touch targets

---

# PART 5: LOGIC PRESERVATION CHECKLIST

### API Integration (DO NOT CHANGE)
- ✅ All form submissions remain the same
- ✅ All API endpoints unchanged
- ✅ All data fetching logic preserved
- ✅ Authentication flow intact
- ✅ Validation logic unchanged

### State Management (DO NOT CHANGE)
- ✅ React Context usage preserved
- ✅ useEffect hooks unchanged
- ✅ useState logic preserved
- ✅ Form state management same
- ✅ Data flow unchanged

### Business Logic (DO NOT CHANGE)
- ✅ Campaign creation logic
- ✅ Store assignment logic
- ✅ QR generation logic
- ✅ Reward allocation logic
- ✅ All calculations preserved

### Routes (DO NOT CHANGE)
- ✅ All page routes same
- ✅ Navigation structure same
- ✅ Route parameters same
- ✅ Redirects same

---

# IMPLEMENTATION PRIORITY

**Phase 1 (Critical)**: Foundation
1. Update design tokens in globals.css
2. Update FormButton, FormInput, Modal components
3. Create page layout structure

**Phase 2 (High Impact)**: Pages
1. Dashboard redesign
2. Campaign Listing redesign
3. Store Listing redesign

**Phase 3 (Customer-Facing)**: Flows
1. Customer Scanning page
2. Coupon Grid/Selection
3. Create Campaign multi-step

**Phase 4 (Onboarding)**: New flows
1. Store Setup/Onboarding
2. Store Ready success screen

---

**Document Status**: ✅ COMPLETE - Ready for implementation  
**Last Updated**: June 4, 2026  
**Total Pages**: 9 major pages  
**Components**: 12+ components  
**Color Palette**: 25+ colors documented
