# Design Token Specification - ScratchX Figma

**Date**: June 4, 2026  
**Task**: 55 - Extract Design Tokens from Figma  
**Status**: In Progress

---

## Overview

This document captures exact design tokens extracted from the Figma design file to ensure pixel-perfect alignment across the ScratchX platform.

### Design Token Categories
1. **Colors** - Primary, secondary, success, warning, error, neutral
2. **Typography** - Fonts, sizes, weights, line-heights
3. **Spacing** - Gaps, padding, margins
4. **Shadows** - Card, hover, focus effects
5. **Border Radius** - Cards, buttons, inputs, modals
6. **Animations** - Transitions, durations, easing functions

---

## 1. COLOR SYSTEM

### Primary Colors
```
Primary: #EF9E1B (Orange) - Main action color
Primary Hover: #D98E14 (Darker Orange) - Hover state
Primary Light: #FFF3E0 (Light Orange) - Background
Primary Disabled: #FFCC80 (Pale Orange) - Disabled state
```

### Secondary Colors
```
Navy: #010F44 - Headings, text
Navy Light: #1A3A5C - Secondary text
Navy Dark: #0A0A0A - Near black for dark mode
Navy Active: #01188E - Active/selected state
```

### Semantic Colors
```
Success: #4CAF50 (Green) - Success states, checks
Warning: #FF9800 (Orange) - Warning states, alerts
Error: #FF6B6B (Red) - Error states, validation
Info: #2196F3 (Blue) - Information, hints
```

### Accent Colors
```
Teal: #00B0B1 - Accent color
Growth: #0A8905 - Growth/positive trends
```

### Neutral Colors
```
White: #FFFFFF - Light backgrounds
Off-White: #F9F9F9 - Input backgrounds
Gray Light: #F5F5F5 - Hover states
Gray Medium: #E8E8E8 - Borders
Gray Dark: #595858 - Disabled text
Muted: #637080 - Helper text
Black: #000000 - Text
```

### Background Colors
```
Page Background (Light): #FCFDFF - Page bg
Card Background (Light): #F8F8F8 - Card bg
Card Background (Dark): #1A1A1a - Dark mode card
Page Background (Dark): #0A0A0A - Dark mode page
```

### Border Colors
```
Border Light: #E0E0E0 (Light mode)
Border Dark: rgba(255,255,255,0.1) (Dark mode)
```

---

## 2. TYPOGRAPHY SYSTEM

### Font Families
```
Primary Font: Afacad
- Used for: Headings, bold text, labels
- Weight range: 400, 600, 700, 800
- Line-height: 1.2-1.4

Secondary Font: Afacad Flux
- Used for: Body text, descriptions, helper text
- Weight range: 400, 500, 600
- Line-height: 1.4-1.6
```

### Type Scale
```
Heading 1 (H1): 32px, 800 weight, 1.2 line-height
Heading 2 (H2): 28px, 700 weight, 1.3 line-height
Heading 3 (H3): 24px, 700 weight, 1.3 line-height
Heading 4 (H4): 20px, 600 weight, 1.4 line-height
Heading 5 (H5): 18px, 600 weight, 1.4 line-height
Body Large: 16px, 400 weight, 1.5 line-height
Body Medium: 14px, 400 weight, 1.5 line-height
Body Small: 12px, 400 weight, 1.6 line-height
Caption: 11px, 500 weight, 1.5 line-height
```

### Font Weights
```
Light: 300
Regular: 400
Medium: 500
Semibold: 600
Bold: 700
Extrabold: 800
```

---

## 3. SPACING SYSTEM

### Base Unit: 8px

### Spacing Scale
```
xs: 4px (rare, use with caution)
sm: 8px
md: 12px
lg: 16px
xl: 20px
2xl: 24px
3xl: 28px
4xl: 32px
5xl: 40px
6xl: 48px
```

### Common Spacing Values
```
Component Padding: 16px, 20px, 24px
Gap between items: 8px, 12px, 16px, 20px, 24px
Card padding: 20px, 24px, 28px
Container padding: 20px (mobile), 24px (desktop)
Section spacing: 24px, 28px, 32px
```

---

## 4. SHADOW SYSTEM

### Card Shadow (Default)
```
Box Shadow: 0 2px 8px rgba(0, 0, 0, 0.06)
Used for: Cards, containers, default elevation
```

### Card Shadow (Elevated)
```
Box Shadow: 0 6px 10px 3px rgba(0, 0, 0, 0.1)
Used for: Hovered cards, modals, elevated elements
```

### Hover Shadow
```
Box Shadow: 0 6px 16px rgba(228, 158, 37, 0.3)
Used for: Button hover, card hover, interactive elements
```

### Focus Shadow
```
Box Shadow: 0 0 0 3px rgba(239, 158, 37, 0.1)
Used for: Input focus, button focus
```

### Dark Mode Shadows
```
Card Shadow: 0 4px 12px rgba(0, 0, 0, 0.3)
Hover Shadow: 0 6px 16px rgba(228, 158, 37, 0.4)
Focus Shadow: 0 0 0 3px rgba(239, 158, 37, 0.15)
```

---

## 5. BORDER RADIUS

### Component Border Radii
```
Button: 6px, 8px
Input: 6px, 8px
Card: 10px, 12px
Modal: 12px, 16px
Avatar: 50% (circular)
```

---

## 6. ANIMATION SYSTEM

### Transition Timing
```
Quick: 0.15s (micro-interactions)
Normal: 0.2s - 0.3s (standard interactions)
Slow: 0.4s - 0.5s (complex animations)
```

### Easing Functions
```
Ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)
Ease-out: cubic-bezier(0, 0, 0.2, 1)
Linear: linear
```

### Hover Animations
```
Translate: translateY(-2px)
Scale: scale(1.02) or scale(1.05)
Shadow: Add elevation shadow
Opacity: 0.7 to 1 or similar
```

### Loading Animations
```
Spinner Rotation: 1s linear infinite
Pulse Animation: 2s ease-in-out infinite
Skeleton Loading: 1.5s ease-in-out infinite
```

---

## 7. INTERACTIVE STATES

### Button States
```
Default: Base color, no transform
Hover: Color change + translateY(-2px) + shadow
Active/Pressed: translateY(0) + shadow
Disabled: opacity 0.6, cursor: not-allowed
Focus: Focus ring (3px shadow) + outline

Transitions: all 0.3s ease
```

### Input States
```
Default: Border #E8E8E8, background #F9F9F9
Focus: Border #EF9E1B, shadow 0 0 0 3px rgba(239, 158, 37, 0.1)
Error: Border #FF6B6B, background #FFF5F5
Disabled: opacity 0.6, background #F5F5F5
Filled: Background #F9F9F9

Transition: all 0.2s ease
```

### Hover States
```
Card: Transform scale(1.02), shadow elevation
Link: Color #EF9E1B, underline
Button: Shadow elevation, transform
Disabled: No hover effect
```

---

## 8. RESPONSIVE BREAKPOINTS

### Mobile-First Breakpoints
```
Mobile: 320px - 480px
Tablet: 481px - 768px
Desktop: 769px - 1024px
Wide: 1025px+

Customer flows: 430px base width
Merchant dashboard: 1024px desktop-first
```

### Typography Scaling
```
Desktop: 100% (base size)
Tablet: 95% (slight reduction)
Mobile: 90% (further reduction)
Mobile Small (320px): 85%
```

---

## 9. COMPONENT SPECIFIC TOKENS

### Badge Component
```
Padding: 6px 12px (small), 8px 14px (medium), 10px 16px (large)
Font Size: 11px (small), 12px (medium), 13px (large)
Border Radius: 6px
Font Weight: 500, 600
```

### Progress Bar Component
```
Height: 8px (normal), 12px (large)
Border Radius: 4px
State Colors:
  - Normal: #00B0B1 (teal)
  - Warning: #FF9800 (orange)
  - Critical: #FF6B6B (red)
Font: 12px, 500 weight
```

### Stat Card Component
```
Padding: 20px (small), 24px (medium), 28px (large)
Border Radius: 10px
Border (left): 4px, color varies by variant
Shadow: 0 2px 8px rgba(0, 0, 0, 0.06)
Font Size: 14px (label), 28px (value large), 24px (value medium)
```

### Button Component
```
Padding: 10px 16px (small), 12px 20px (medium), 14px 24px (large)
Border Radius: 6px
Font Size: 14px, 600 weight
Min Height: 40px (medium), 44px (mobile for touch)
Gradient: linear-gradient(135deg, #EF9E1B, #D98E14)
```

---

## 10. CSS VARIABLE MAPPING

### Current globals.css Structure
```css
:root {
  /* Colors */
  --color-primary: #ef9e1b;
  --color-primary-hover: #d98e14;
  --color-navy: #010f44;
  --color-teal: #00b0b1;
  --color-growth: #0a8905;
  
  /* Spacing */
  --spacing-8: 8px;
  --spacing-12: 12px;
  --spacing-16: 16px;
  --spacing-20: 20px;
  --spacing-24: 24px;
  --spacing-28: 28px;
  
  /* Shadows */
  --card-shadow: 0 6px 10px 3px rgba(0,0,0,0.1);
  --card-radius: 10px;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-page-bg: #0a0a0a;
    --color-card-bg: #1a1a1a;
    /* ... dark mode overrides */
  }
}
```

---

## 11. VERIFICATION CHECKLIST

### Color Verification
- [ ] All primary colors match Figma hex codes
- [ ] All semantic colors (success, warning, error) verified
- [ ] Dark mode color overrides verified
- [ ] Neutral palette covers all use cases

### Typography Verification
- [ ] Font families available in app
- [ ] Font sizes match Figma type scale
- [ ] Font weights available (300-800)
- [ ] Line heights set correctly
- [ ] Mobile scaling applied

### Spacing Verification
- [ ] Gap values match grid system (8px multiples)
- [ ] Padding consistent across components
- [ ] Margin values align with spacing scale
- [ ] Responsive spacing adjustments applied

### Shadow Verification
- [ ] Card shadows match Figma
- [ ] Hover shadows match Figma
- [ ] Focus shadows have correct blur/spread
- [ ] Dark mode shadow adjustments applied

### Animation Verification
- [ ] Transition durations (0.2s-0.5s)
- [ ] Easing functions match Figma
- [ ] Hover transforms correct (translateY, scale)
- [ ] Loading animations smooth

---

## 12. IMPLEMENTATION STATUS

### ✅ Extracted (From Analysis)
- [x] Color system (primary, semantic, neutral)
- [x] Typography scale
- [x] Spacing units
- [x] Shadow values
- [x] Border radius values
- [x] Animation timings

### ⏳ To Verify Against Figma
- [ ] Exact hex color codes
- [ ] Precise font size values
- [ ] Exact spacing measurements
- [ ] Shadow blur/spread values
- [ ] Border radius per component
- [ ] Animation easing curves

### 🚀 Next Step
Update `app/globals.css` with verified tokens and create component-specific token files.

---

## Document Status

**Created**: June 4, 2026  
**Task**: 55 - Design Token Extraction  
**Progress**: Token specification drafted, awaiting Figma verification  
**Next**: Verify against Figma and update globals.css
