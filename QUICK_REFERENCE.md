# Quick Reference - Figma Alignment Audit

**Document:** Quick lookup guide for audit findings  
**Date:** 2026-06-04  
**Audience:** Designers, Frontend Developers, Product Managers

---

## What's in This Audit?

Three comprehensive documents created:

1. **AUDIT_REPORT.md** (Main Document)
   - Full page inventory (52 pages)
   - Pages requiring redesign (P0-P4)
   - Styling approach & CSS Modules (50+ files)
   - 40+ API endpoints
   - Risk assessment
   - Implementation sequence

2. **DESIGN_SYSTEM_SPEC.md** (Design System)
   - Complete color palette with hex values
   - Typography system (fonts, sizes, weights)
   - Spacing scale (8px base unit)
   - Border radius & shadows
   - Button, input, card, modal specifications
   - Responsive breakpoints
   - Dark mode guidelines

3. **COMPONENT_MANIFEST.md** (Component Library)
   - 70+ reusable components listed
   - Component purpose & usage
   - Props documentation
   - Component dependencies
   - Missing components to build

---

## Key Findings at a Glance

### Pages Requiring Redesign

| Priority | Pages | Count |
|----------|-------|-------|
| **P0 (Critical)** | Scan, Coupon, Participate | 3 |
| **P1 (High)** | Campaign mgmt, Store mgmt | 8 |
| **P2 (Medium)** | Analytics, Inventory, Billing | 6 |
| **P3 (Low)** | Remaining features | 21 |
| **Total Pages** | **52** | **38 Active** |

### Styling Status

| Item | Status |
|------|--------|
| **CSS Modules** | 50+ files with hardcoded colors |
| **Global Tokens** | 30+ CSS variables defined (underused) |
| **Design System** | Does NOT exist (needs creation) |
| **Color Palette** | 15 colors, fully extracted |
| **Typography** | Afacad + Afacad Flux fonts |
| **Spacing Scale** | 10-step scale (8px base) |

### Components Available

| Category | Count | Status |
|----------|-------|--------|
| **Layout Wrappers** | 5 | Ready |
| **Form Components** | 14 | Partial |
| **Card Components** | 6 | Ready |
| **Table/Data** | 4 | Functional |
| **Modals** | 8 | Mostly page-specific |
| **Badges/Status** | 3 | Minimal |
| **Customer** | 3 | Specialized |
| **Dashboard** | 11 | Scattered |
| **Auth** | 3 | Functional |
| **Total** | **70+** | Ready for enhancement |

---

## Color Palette (Copy-Paste Ready)

### Primary
- Orange: `#ef9e1b` (Use for CTAs, highlights)
- Orange Hover: `#d98e14`

### Navy (Main Text)
- Navy: `#010f44` (Use for text, headings)
- Navy Active: `#01188e`

### Semantic
- Success: `#4caf50` (Green)
- Error: `#ff6b6b` (Red)
- Warning: `#ff9800` (Orange-red)
- Info: `#2196f3` (Blue)

### Neutral
- White: `#ffffff`
- Gray: `#f5f5f5` (Light background)
- Gray Border: `#e0e0e0`

---

## Design System Token Variables

All available in `app/globals.css`:

```css
/* Colors */
--color-primary: #ef9e1b
--color-navy: #010f44
--color-success: #4caf50
--color-error: #ff6b6b

/* Spacing (8px base) */
--spacing-4: 8px
--spacing-8: 16px
--spacing-12: 24px
--spacing-16: 32px

/* Typography */
--font-afacad: 'Afacad', system-ui, sans-serif
--font-size-base: 14px
--font-size-lg: 18px
--font-size-2xl: 24px

/* Sizing */
--radius-button: 6px
--card-radius: 10px
--radius-modal: 12px

/* Shadows */
--shadow-card: 0 2px 8px rgba(0,0,0,0.06)
--shadow-hover: 0 6px 16px rgba(228,158,37,0.3)

/* Animations */
--transition-fast: 0.15s ease-in-out
--transition-normal: 0.2s ease-in-out
```

---

## Critical Path (What to Do First)

### Week 1: Setup Foundation
- [ ] Review Figma design files
- [ ] Align on color scheme
- [ ] Finalize typography
- [ ] Create design tokens file
- [ ] Build base component styles

### Week 2: P0 Pages
- [ ] Redesign Scan page (mobile)
- [ ] Redesign Coupon redemption (mobile)
- [ ] Redesign Participate form (mobile)

### Week 3-4: P1 Pages
- [ ] Campaign management pages
- [ ] Store management pages
- [ ] Update all modals
- [ ] Update tables & lists

### Week 5+: P2 & P3
- [ ] Analytics pages
- [ ] Billing pages
- [ ] Admin pages
- [ ] Remaining features

---

## File Locations Quick Index

### Key Pages
- **Campaign List:** `app/(dashboard)/campaign/page.js`
- **Campaign Details:** `app/(dashboard)/campaign/[id]/page.js`
- **Scan Page:** `app/(client)/scan/[campaignId]/page.js` ⭐ P0
- **Store List:** `app/(dashboard)/stores/page.js`
- **Auth Pages:** `app/auth/*/page.js`

### Core Components
- **Auth Layout:** `components/layouts/AuthLayout.js`
- **Dashboard Layout:** `components/dashboards/DashboardLayout.js`
- **Form Input:** `components/common/FormInput.js`
- **Campaign Card:** `components/dashboard/CampaignCard.js`
- **Scratch Card:** `components/customer/ScratchCard.js` ⭐ P0

### Global Files
- **Design Tokens:** `app/globals.css` (has CSS variables)
- **Layout CSS:** `app/layout.module.css` (drawer, navigation)
- **Global Imports:** `app/layout.js` (root entry point)

### APIs (DO NOT MODIFY)
- All endpoints: `app/api/**/*.js`
- Models: `models/*.js`
- Services: `lib/*.js`, `lib/services/*.js`

---

## Common Pattern: Adding Figma Design to a Page

### Example: Campaign Card Component

**Current (Hardcoded Colors):**
```css
/* components/dashboard/CampaignCard.module.css */
.card {
  background: #ffffff;
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.title {
  color: #010f44;
  font-size: 16px;
  font-weight: 600;
}

.status {
  background: #4caf50;
  color: white;
}
```

**After Figma Alignment (Using Tokens):**
```css
/* components/dashboard/CampaignCard.module.css */
.card {
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: var(--card-radius);
  padding: var(--spacing-8);
  box-shadow: var(--shadow-card);
}

.title {
  color: var(--color-navy);
  font-size: var(--font-size-md);
  font-weight: 600;
}

.status {
  background: var(--color-success);
  color: var(--color-white);
}
```

**Benefits:**
- Single source of truth for colors
- Easy to change entire theme
- Consistent across all pages
- Supports dark mode easily

---

## Responsive Design Quick Reference

### Mobile First (430px max)
```css
/* Base/mobile styles */
.container {
  width: 100%;
  padding: 16px;
}

/* Tablet (768px+) */
@media (min-width: 768px) {
  .container {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}

/* Desktop (1200px+) */
@media (min-width: 1200px) {
  .container {
    max-width: 1200px;
    margin: 0 auto;
  }
}
```

---

## API Integration Pattern (Do NOT Change)

All pages use this fetch pattern (keep as-is):

```javascript
const response = await fetch(`/api/campaigns`, {
  method: "GET",
  credentials: "include",
  headers: {
    "x-user-id": account.id,
    "x-user-role": account.role,
  },
});

const data = await response.json();
```

**Critical:** Do NOT modify any API endpoint implementations.

---

## Component Props to Know

### FormInput
```javascript
<FormInput
  label="Email"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  error={errors.email}
  disabled={loading}
/>
```

### Modal
```javascript
<Modal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  title="Confirm Action"
  actions={[
    { label: 'Cancel', onClick: () => setShowModal(false) },
    { label: 'Confirm', onClick: handleConfirm }
  ]}
>
  <p>Are you sure?</p>
</Modal>
```

### CampaignCard
```javascript
<CampaignCard
  campaignId="123"
  name="Summer Sale"
  status="active"
  stores={5}
  scratches={1000}
  redeemed={234}
  onClick={() => router.push(`/campaign/123`)}
/>
```

---

## Testing Checklist (Per Page)

After redesigning each page, verify:

- [ ] Mobile layout (430px)
- [ ] Tablet layout (768px)
- [ ] Desktop layout (1200px+)
- [ ] Touch targets >= 44px
- [ ] Color contrast >= 4.5:1 (WCAG)
- [ ] Loading states work
- [ ] Error states work
- [ ] Empty states work
- [ ] Forms submit correctly
- [ ] Modals open/close correctly
- [ ] Links navigate correctly
- [ ] API calls complete
- [ ] Dark mode (if applicable)

---

## FAQs

**Q: Can I change the API endpoints?**  
A: No. All APIs are locked. Only CSS/layout changes permitted.

**Q: Should I use Tailwind CSS?**  
A: No. Use CSS Modules (already in place) with new design tokens.

**Q: What about dark mode?**  
A: Partially implemented. Only update if Figma includes dark designs.

**Q: How do I use design tokens?**  
A: Replace hardcoded values with `var(--color-primary)`, etc.

**Q: Which pages are most important?**  
A: P0 pages (Scan, Coupon, Participate) - these are customer-facing.

**Q: How many components need updates?**  
A: All 70+ components should use design tokens, but not all need visual redesign.

**Q: What's the priority order?**  
A: Foundation (tokens) → P0 pages → P1 pages → P2+ pages

---

## Contact & Questions

For clarifications on this audit:
1. Review the detailed documents (AUDIT_REPORT.md, etc.)
2. Check DESIGN_SYSTEM_SPEC.md for visual specs
3. Reference COMPONENT_MANIFEST.md for component details
4. Use this QUICK_REFERENCE.md for quick lookup

---

## Document Map

```
📄 AUDIT_REPORT.md
  ├─ Page inventory (all 52 pages)
  ├─ Redesign priorities (P0-P4)
  ├─ Current styling approach
  ├─ Reusable components list
  ├─ API endpoints catalog
  └─ Risk assessment & implementation plan

📄 DESIGN_SYSTEM_SPEC.md
  ├─ Color palette (15 colors)
  ├─ Typography system
  ├─ Spacing scale
  ├─ Component specifications
  ├─ Responsive breakpoints
  └─ Figma handoff guide

📄 COMPONENT_MANIFEST.md
  ├─ 70+ components detailed
  ├─ Component props
  ├─ Dependencies
  ├─ Styling patterns
  └─ Missing components

📄 QUICK_REFERENCE.md (You are here)
  ├─ Quick summary
  ├─ Critical path
  ├─ Color palette (copy-paste)
  ├─ File locations
  └─ Common patterns
```

---

**Quick Reference Complete**  
**All 4 Audit Documents Ready**  
**Status: ✅ Ready for Figma Alignment**  
**Last Updated:** 2026-06-04
