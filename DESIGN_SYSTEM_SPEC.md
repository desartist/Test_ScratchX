# Design System Specification for ScratchX Figma Alignment

**Version:** 1.0  
**Date:** 2026-06-04  
**Target:** Align Figma design with Next.js implementation

---

## 1. CURRENT DESIGN TOKENS EXTRACTION

### 1.1 Color Palette

#### Primary Colors
| Token | Hex | Usage | Var Name |
|-------|-----|-------|----------|
| Primary | `#ef9e1b` | Buttons, CTAs, accents | `--color-primary` |
| Primary Hover | `#d98e14` | Hover state | `--color-primary-hover` |
| Primary Light | `#fff3e0` | Light backgrounds | `--color-primary-light` |
| Primary Disabled | `#ffcc80` | Disabled state | `--color-primary-disabled` |

#### Navy/Dark
| Token | Hex | Usage | Var Name |
|-------|-----|-------|----------|
| Navy (Main) | `#010f44` | Text, headings | `--color-navy` |
| Navy Light | `#1a3a5c` | Secondary text | `--color-navy-light` |
| Navy Dark | `#0a0a0a` | Background (dark mode) | `--color-navy-dark` |
| Navy Active | `#01188e` | Active states | `--color-navy-active` |
| Dark Navy | `#032c5a` | Hover states | `--color-dark-navy` |

#### Semantic Colors
| Token | Hex | Usage | Var Name |
|-------|-----|-------|----------|
| Success | `#4caf50` | Success states, checkmarks | `--color-success` |
| Warning | `#ff9800` | Warning messages | `--color-warning` |
| Error | `#ff6b6b` | Error messages, validation | `--color-error` |
| Info | `#2196f3` | Information messages | `--color-info` |
| Growth | `#0a8905` | Growth indicators | `--color-growth` |

#### Accent Colors
| Token | Hex | Usage | Var Name |
|-------|-----|-------|----------|
| Teal | `#00b0b1` | Secondary accent | `--color-teal` |
| Lavender BG | `#e0e4ff` | Light background | `--color-lavender-bg` |
| Lavender Active | `#dce2fd` | Active/selected state | `--color-lavender-active` |

#### Neutral Colors
| Token | Hex | Usage | Var Name |
|-------|-----|-------|----------|
| White | `#ffffff` | Primary background | `--color-white` |
| Off-White | `#f9f9f9` | Subtle background | `--color-off-white` |
| Gray Light | `#f5f5f5` | Section backgrounds | `--color-gray-light` |
| Gray Medium | `#e8e8e8` | Borders, dividers | `--color-gray-medium` |
| Gray Dark | `#595858` | Secondary text | `--color-gray-dark` |
| Muted | `#637080` | Disabled text | `--color-muted` |
| Black | `#000000` | Overlays, very dark | `--color-black` |

#### Page Backgrounds
| Token | Hex | Usage | Var Name |
|-------|-----|-------|----------|
| Page BG | `#fcfdff` | Page background | `--color-page-bg` |
| Card BG | `#f8f8f8` | Card backgrounds | `--color-card-bg` |
| Border | `rgba(0,0,0,0.1)` | Borders | `--color-border` |

### 1.2 Typography System

#### Font Families
```css
--font-afacad: 'Afacad', system-ui, sans-serif;
--font-afacad-flux: 'Afacad Flux', system-ui, sans-serif;
--font-avenir: 'Gill Sans', 'Calibri', 'Trebuchet MS', system-ui, sans-serif;
```

**Font Import:** Google Fonts
```
https://fonts.googleapis.com/css2?family=Afacad:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Afacad+Flux:wght@100..1000&display=swap
```

#### Font Sizes (px)
| Token | Size | Usage | Var Name |
|-------|------|-------|----------|
| XS | 11px | Small labels | `--font-size-xs` |
| SM | 12px | Captions, hints | `--font-size-sm` |
| Base | 14px | Body text | `--font-size-base` |
| MD | 16px | Larger body | `--font-size-md` |
| LG | 18px | Section titles | `--font-size-lg` |
| XL | 20px | Page titles | `--font-size-xl` |
| 2XL | 24px | Large headings | `--font-size-2xl` |
| 3XL | 28px | Extra large | `--font-size-3xl` |
| 4XL | 32px | Hero text | `--font-size-4xl` |

#### Font Weights
| Weight | Value | Usage |
|--------|-------|-------|
| Regular | 400 | Body text |
| Medium | 500 | Slightly bold |
| Semibold | 600 | Subheadings |
| Bold | 700 | Headings, CTAs |
| ExtraBold | 800 | Hero titles |

#### Line Heights
- **Headings:** 1.2
- **Body:** 1.5
- **Captions:** 1.4
- **Default:** 1.6

### 1.3 Spacing Scale (8px base unit)

| Token | Size | Usage | Var Name |
|-------|------|-------|----------|
| 2 | 4px | Micro spacing | `--spacing-2` |
| 4 | 8px | Small spacing | `--spacing-4` |
| 6 | 12px | Input padding | `--spacing-6` |
| 8 | 16px | Standard padding | `--spacing-8` |
| 10 | 20px | Large padding | `--spacing-10` |
| 12 | 24px | Section spacing | `--spacing-12` |
| 14 | 28px | Large sections | `--spacing-14` |
| 16 | 32px | Extra large | `--spacing-16` |
| 20 | 40px | Huge spacing | `--spacing-20` |
| 24 | 48px | Page margins | `--spacing-24` |

### 1.4 Border Radius

| Token | Size | Usage | Var Name |
|-------|------|-------|----------|
| Button | 6px | Buttons, inputs | `--radius-button` |
| Input | 6px | Form inputs | `--radius-input` |
| Card | 10px | Cards, containers | `--card-radius` |
| Modal | 12px | Modals, dialogs | `--radius-modal` |

### 1.5 Shadows

| Token | Value | Usage | Var Name |
|-------|-------|-------|----------|
| Card | `0 2px 8px rgba(0,0,0,0.06)` | Cards, containers | `--shadow-card` |
| Elevated | `0 6px 10px 3px rgba(0,0,0,0.1)` | Raised elements | `--shadow-card-elevated` |
| Hover | `0 6px 16px rgba(228,158,37,0.3)` | Hover state | `--shadow-hover` |
| Focus | `0 0 0 3px rgba(239,158,37,0.1)` | Focus ring | `--shadow-focus` |

### 1.6 Transitions & Animations

| Token | Duration | Easing | Usage | Var Name |
|-------|----------|--------|-------|----------|
| Fast | 150ms | ease-in-out | UI interactions | `--transition-fast` |
| Normal | 200ms | ease-in-out | Standard transitions | `--transition-normal` |
| Slow | 300ms | ease-in-out | Page transitions | `--transition-slow` |
| Very Slow | 500ms | ease-in-out | Animations | `--transition-very-slow` |

---

## 2. COMPONENT SPECIFICATIONS

### 2.1 Button Component

#### Variants
```
Primary    (orange bg, white text, full width common)
Secondary  (gray bg, navy text)
Tertiary   (transparent, orange text)
Ghost      (no bg, navy text)
Danger     (red bg, white text)
Success    (green bg, white text)
```

#### States
- **Default:** Base color
- **Hover:** Color darken + shadow
- **Active:** Color darken more
- **Disabled:** Gray, opacity 0.5
- **Loading:** Spinner, disabled

#### Sizes
- **Small:** 32px height, 12px font
- **Medium:** 40px height, 14px font (default)
- **Large:** 48px height, 16px font

#### Padding
- **Small:** 8px 12px
- **Medium:** 12px 16px
- **Large:** 16px 24px

**CSS Class Pattern:**
```css
.button {
  padding: var(--spacing-8) var(--spacing-10);
  border-radius: var(--radius-button);
  font-family: var(--font-afacad);
  font-weight: 600;
  transition: background var(--transition-fast);
}

.button.primary {
  background: var(--color-primary);
  color: white;
}

.button.primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
  box-shadow: var(--shadow-hover);
}
```

### 2.2 Input Component

#### States
- **Default:** White bg, gray border
- **Focus:** White bg, orange border
- **Error:** White bg, red border
- **Disabled:** Gray bg, gray border
- **Success:** White bg, green border

#### Specifications
- **Height:** 40px
- **Padding:** 10px 12px
- **Border:** 1px solid #e0e0e0
- **Border Radius:** 6px
- **Font Size:** 14px
- **Placeholder Color:** #999

**CSS Pattern:**
```css
.input {
  width: 100%;
  height: 40px;
  padding: var(--spacing-6) var(--spacing-6);
  border: 1px solid #e0e0e0;
  border-radius: var(--radius-input);
  font-family: var(--font-afacad);
  font-size: var(--font-size-base);
  transition: border-color var(--transition-fast);
}

.input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(239,158,37,0.1);
}

.input.error {
  border-color: var(--color-error);
}
```

### 2.3 Card Component

#### Specifications
- **Background:** White
- **Border Radius:** 10px
- **Box Shadow:** var(--shadow-card)
- **Padding:** 16px (default)
- **Border:** 1px solid #f0f0f0 (optional)

**CSS Pattern:**
```css
.card {
  background: white;
  border-radius: var(--card-radius);
  box-shadow: var(--shadow-card);
  padding: var(--spacing-8);
}
```

### 2.4 Modal Component

#### Backdrop
- **Background:** rgba(0,0,0,0.65)
- **Backdrop Filter:** blur(2.5px)
- **Z-Index:** 200

#### Modal Container
- **Background:** White
- **Border Radius:** 12px
- **Max Width:** 90% or 600px
- **Padding:** 24px
- **Box Shadow:** var(--shadow-card-elevated)

**CSS Pattern:**
```css
.modalBackdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.65);
  backdrop-filter: blur(2.5px);
  z-index: 200;
}

.modal {
  background: white;
  border-radius: var(--radius-modal);
  box-shadow: var(--shadow-card-elevated);
  padding: var(--spacing-12);
  max-width: 90%;
}
```

### 2.5 Badge Component

#### Variants
- **Success:** Green bg, green text (light)
- **Warning:** Yellow bg, dark text
- **Error:** Red bg, red text (light)
- **Info:** Blue bg, white text
- **Primary:** Orange bg, white text
- **Secondary:** Gray bg, dark text

#### Sizes
- **Small:** 18px height, 11px font
- **Medium:** 24px height, 12px font

### 2.6 Skeleton Loader

#### Specifications
- **Background:** Linear gradient animation
- **Animation:** Shimmer effect
- **Duration:** 1.5s infinite
- **Opacity:** 0.6 → 1.0 → 0.6

---

## 3. RESPONSIVE BREAKPOINTS

### Mobile-First Approach

```css
/* Mobile (430px max) */
@media (max-width: 430px) {
  /* Default styles */
}

/* Tablet (768px) */
@media (min-width: 768px) {
  /* Larger layouts */
}

/* Desktop (1200px) */
@media (min-width: 1200px) {
  /* Full-width layouts */
}
```

### Layout Adjustments

#### Mobile (< 430px)
- Single column layout
- Full width cards
- Bottom sheet modals
- Hamburger menu
- Smaller fonts

#### Tablet (430px - 768px)
- Two column layout (optional)
- 90% width containers
- Center aligned modals
- Tab navigation
- Standard fonts

#### Desktop (≥ 768px)
- Multi-column layout
- Sidebar navigation
- Center modal dialogs
- Drop-down menus
- Larger fonts

---

## 4. DARK MODE SPECIFICATION

### Dark Mode Colors (Partial Implementation)

```css
@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
    --color-page-bg: #0a0a0a;
    --color-card-bg: #1a1a1a;
    --color-text: #e5e5e5;
  }
}
```

**Note:** Dark mode not fully implemented in all pages. Current status: ~30% coverage.

---

## 5. ACCESSIBILITY GUIDELINES

### Color Contrast (WCAG AA Minimum)
- **Text on Primary:** 4.5:1 ratio
- **Text on Cards:** 7:1 ratio
- **Borders:** 3:1 ratio
- **Icons:** 3:1 ratio

### Touch Targets
- **Minimum Size:** 44px × 44px (iOS standard)
- **Buttons:** 40px+ height
- **Links:** 44px+ height
- **Icons:** 24px+ size

### Focus Management
- **Visible Focus Ring:** 2-3px
- **Color:** Unique from disabled state
- **Outline:** Not removed

### Semantic HTML
- Use `<button>` for actions
- Use `<a>` for navigation
- Use `<form>` for forms
- Use `<input type="...">` for form fields

---

## 6. NAMING CONVENTIONS

### CSS Class Names
```css
/* Block component */
.button { }
.card { }
.modal { }

/* Element within block */
.button__text { }
.card__header { }
.modal__close { }

/* Modifier/variant */
.button--primary { }
.button--disabled { }
.card--elevated { }

/* State */
.button.is-loading { }
.input.is-focused { }
.modal.is-open { }
```

### Component File Names
```
FormInput.js          (Form field component)
FormButton.js         (Form submission button)
Modal.js              (Modal wrapper)
StatusBadge.js        (Status indicator)
CampaignCard.js       (Campaign card component)
```

### CSS Module Names
```
page.module.css       (Page-level styles)
Button.module.css     (Component styles)
layout.module.css     (Layout styles)
```

---

## 7. ANIMATION & INTERACTION

### Micro-interactions

#### Button Click
```css
.button:active {
  transform: scale(0.98);
}
```

#### Card Hover
```css
.card:hover {
  box-shadow: var(--shadow-hover);
  transform: translateY(-2px);
}
```

#### Input Focus
```css
.input:focus {
  border-color: var(--color-primary);
}
```

### Page Transitions
- **Duration:** 300ms
- **Easing:** ease-in-out
- **Property:** opacity, transform

### Loading Animation
```css
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.spinner {
  animation: spin 1s linear infinite;
}
```

### Scroll Behavior
```css
html {
  scroll-behavior: smooth;
}
```

---

## 8. TYPOGRAPHY HIERARCHY

### Headings
```
H1: 32px, 700 weight, Navy
H2: 24px, 700 weight, Navy
H3: 20px, 600 weight, Navy
H4: 18px, 600 weight, Navy
H5: 16px, 600 weight, Navy
H6: 14px, 600 weight, Navy
```

### Body Text
```
Paragraph: 14px, 400 weight, Navy-light
Label: 12px, 500 weight, Muted
Caption: 11px, 400 weight, Gray-dark
```

### Special
```
Button Text: 14px, 600 weight, White
Link: 14px, 500 weight, Primary (underline on hover)
Error: 12px, 400 weight, Error
Success: 12px, 400 weight, Success
```

---

## 9. ICON SPECIFICATIONS

### Icon Library
- **Primary:** Lucide React (24+ icons)
- **Sizes:** 16px, 20px, 24px, 32px
- **Color:** Inherit from text color
- **Stroke:** 2px (default for Lucide)

### Common Icons Used
```
ChevronLeft, ChevronRight, ChevronDown
Plus, Minus
Check, X
Search, Filter
Menu, Settings
Bell, Mail
MapPin, Navigation
Clock, Calendar
TrendingUp, BarChart
```

### Icon Naming Pattern
```javascript
import { ChevronLeft, Plus, Check } from 'lucide-react';

// In component
<ChevronLeft size={20} className={styles.icon} />
```

---

## 10. FORM PATTERNS

### Form Structure
```html
<form>
  <div class="formGroup">
    <label>Field Label</label>
    <input type="text" />
    <span class="errorMessage">Error message</span>
  </div>
  
  <button type="submit">Submit</button>
</form>
```

### Validation States
- **Valid:** Green border, checkmark
- **Invalid:** Red border, error message
- **Required:** Asterisk (*) after label

### Form Layout
- **Desktop:** 2 columns (if needed)
- **Mobile:** 1 column (stacked)
- **Spacing:** 12px vertical gap between fields

---

## 11. GRID & LAYOUT SYSTEM

### Container Sizes
```css
.container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 16px; /* Mobile padding */
}

@media (min-width: 768px) {
  .container {
    padding: 0 24px;
  }
}
```

### Grid System (Optional - if Figma uses)
```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--spacing-8);
}
```

### Flexbox Utilities
```css
.flex { display: flex; }
.flex-col { flex-direction: column; }
.flex-center { align-items: center; justify-content: center; }
.gap-4 { gap: var(--spacing-4); }
.gap-8 { gap: var(--spacing-8); }
```

---

## 12. IMPLEMENTATION CHECKLIST

### Token Setup
- [ ] Create `app/design-tokens.css` with all CSS variables
- [ ] Import in `globals.css`
- [ ] Remove hardcoded colors from component modules
- [ ] Replace with `var(--color-*)` references

### Component Updates
- [ ] Create base button styles
- [ ] Create base input styles
- [ ] Create base card styles
- [ ] Create modal base styles
- [ ] Update all component modules

### Page Updates (Priority Order)
- [ ] Auth pages (login, signup, reset)
- [ ] Scan page (mobile)
- [ ] Coupon redemption (mobile)
- [ ] Campaign list (desktop)
- [ ] Campaign details (desktop)
- [ ] Store management (desktop)
- [ ] Remaining pages

### Testing
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Dark mode (if using)
- [ ] Accessibility audit
- [ ] Performance check
- [ ] Cross-browser testing

---

## 13. MIGRATION GUIDE

### From Current to New Design System

#### Step 1: Create Tokens File
```bash
# Create new file with all CSS variables
touch app/design-tokens.css
```

#### Step 2: Update globals.css
```css
@import 'design-tokens.css';
```

#### Step 3: Update Components
**Before:**
```css
.button {
  background: #ef9e1b;
  color: #ffffff;
  border-radius: 6px;
}
```

**After:**
```css
.button {
  background: var(--color-primary);
  color: var(--color-white);
  border-radius: var(--radius-button);
}
```

#### Step 4: Remove Hardcoded Values
Search and replace in all .module.css files:
- `#ef9e1b` → `var(--color-primary)`
- `#010f44` → `var(--color-navy)`
- `#ffffff` → `var(--color-white)`
- `6px` → `var(--radius-button)`
- `16px` → `var(--spacing-8)`

---

## 14. DESIGN SYSTEM FILE STRUCTURE

```
app/
├── globals.css (Import all tokens and base styles)
├── design-tokens.css (All CSS variables)
├── base-styles.css (Button, input, card base)
└── ...

components/
├── Button/
│   ├── Button.js
│   └── Button.module.css (Only variant/layout)
├── Input/
│   ├── Input.js
│   └── Input.module.css
├── Card/
│   ├── Card.js
│   └── Card.module.css
└── ...
```

---

## 15. FIGMA TO CODE HANDOFF

### What Designers Provide
1. **Color Specs**
   - Hex values for all colors
   - Opacity/alpha values
   - Dark mode variants

2. **Typography Specs**
   - Font names, weights, sizes
   - Line heights, letter spacing
   - Text transforms

3. **Component Specs**
   - Button sizes & states
   - Input field variations
   - Modal dimensions

4. **Layout Specs**
   - Spacing between elements
   - Padding/margins
   - Grid systems

5. **Animation Specs**
   - Durations
   - Easing functions
   - Trigger conditions

### Implementation Timeline
- **Day 1-2:** Token extraction & setup
- **Day 3-4:** Base component styles
- **Day 5-7:** Page redesigns (P0)
- **Day 8-10:** Secondary pages (P1)
- **Day 11+:** Remaining pages (P2+)

---

## 16. QUALITY ASSURANCE

### Before Launch Checklist
- [ ] All colors match Figma
- [ ] All spacing matches Figma
- [ ] All fonts match Figma
- [ ] All icons match Figma
- [ ] Responsive design tested on real devices
- [ ] Accessibility audit passed
- [ ] Performance metrics acceptable
- [ ] Cross-browser testing completed
- [ ] Dark mode (if applicable) working
- [ ] Form validation styling correct

---

**Design System Spec Complete**  
**Status:** Ready for Figma import  
**Last Updated:** 2026-06-04
