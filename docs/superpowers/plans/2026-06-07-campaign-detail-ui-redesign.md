# Campaign Detail Page UI Redesign - Figma Implementation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Campaign Detail page CSS styling to match the Figma prototype with improved visual hierarchy, spacing, typography, and component styling while preserving all existing functionality.

**Architecture:** Update the CSS Module file (`page.module.css`) to match Figma design tokens (colors, spacing, typography). The page structure and React logic remain unchanged. Focus on visual hierarchy improvements through better spacing, larger stat cards, improved section styling, and enhanced button styling.

**Tech Stack:** React, Next.js, CSS Modules

---

## File Structure

**Files to Modify:**
- `app/(dashboard)/campaign/[id]/page.module.css` - Main stylesheet (primary focus)

**Files Remain Unchanged:**
- `app/(dashboard)/campaign/[id]/page.js` - Page component logic
- All component files (AssignStoresModal, CampaignStoresTable, etc.)

---

## Task Breakdown

### Task 1: Update Stat Cards Styling

**Files:**
- Modify: `app/(dashboard)/campaign/[id]/page.module.css` (`.statsGrid` and `.statCard` sections)

- [ ] **Step 1: Read current stat cards CSS**

```bash
grep -A 20 "\.statsGrid" app/\(dashboard\)/campaign/\[id\]/page.module.css
```

- [ ] **Step 2: Replace stat cards CSS with improved styling**

Replace the `.statsGrid` and `.statCard` sections with:

```css
/* Stats Grid */
.statsGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.statCard {
  padding: 24px;
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
}

@media (prefers-color-scheme: dark) {
  .statCard {
    background: #1a1a1a;
    border-color: #333;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }
}

.statCard:hover {
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

@media (prefers-color-scheme: dark) {
  .statCard:hover {
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
  }
}

.statLabel {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
}

@media (prefers-color-scheme: dark) {
  .statLabel {
    color: #666;
  }
}

.statValue {
  display: block;
  font-size: 2.5rem;
  font-weight: 800;
  color: #010f44;
}

@media (prefers-color-scheme: dark) {
  .statValue {
    color: #fff;
  }
}
```

- [ ] **Step 3: Verify changes in browser**

Navigate to `http://localhost:3000/campaign/6a2458a4a553f7439c4d7666` and verify:
- Stats cards are larger and more prominent
- Hover effect shows subtle shadow + lift
- Dark mode colors are correct

- [ ] **Step 4: Commit**

```bash
git add app/\(dashboard\)/campaign/\[id\]/page.module.css
git commit -m "style: improve stat cards with larger typography and hover effects"
```

---

### Task 2: Enhance Section Styling

**Files:**
- Modify: `app/(dashboard)/campaign/[id]/page.module.css` (`.section` and related sections)

- [ ] **Step 1: Update section base styling**

Replace or add `.section` styles:

```css
.section {
  padding: 24px;
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  margin-bottom: 24px;
}

@media (prefers-color-scheme: dark) {
  .section {
    background: #1a1a1a;
    border-color: #333;
  }
}

.sectionHeader {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 20px;
}

@media (max-width: 768px) {
  .sectionHeader {
    flex-direction: column;
    align-items: stretch;
  }
}

.sectionTitle {
  margin: 0 0 8px 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: #010f44;
}

@media (prefers-color-scheme: dark) {
  .sectionTitle {
    color: #fff;
  }
}

.sectionDescription {
  margin: 0;
  font-size: 0.9375rem;
  color: #666;
  line-height: 1.5;
}

@media (prefers-color-scheme: dark) {
  .sectionDescription {
    color: #aaa;
  }
}
```

- [ ] **Step 2: Update primary button styling**

Add/replace `.primaryButton` styles:

```css
.primaryButton {
  padding: 12px 24px;
  background: linear-gradient(135deg, #ef9e1b 0%, #ff9500 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(239, 158, 27, 0.3);
  transition: all 0.3s ease;
  white-space: nowrap;
}

.primaryButton:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(239, 158, 27, 0.4);
}

.primaryButton:active {
  transform: translateY(0);
}

@media (max-width: 768px) {
  .primaryButton {
    width: 100%;
    text-align: center;
  }
}
```

- [ ] **Step 3: Verify in browser**

Check that:
- Sections have proper padding and borders
- Primary buttons show orange gradient with hover lift
- Section headers are properly sized

- [ ] **Step 4: Commit**

```bash
git add app/\(dashboard\)/campaign/\[id\]/page.module.css
git commit -m "style: enhance section styling and primary button appearance"
```

---

### Task 3: Improve Details Grid Layout

**Files:**
- Modify: `app/(dashboard)/campaign/[id]/page.module.css` (`.detailsGrid` and `.detailItem`)

- [ ] **Step 1: Update details grid styling**

Replace `.detailsGrid` and `.detailItem` styles:

```css
.detailsGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
  margin-top: 16px;
}

.detailItem {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detailLabel {
  font-size: 0.75rem;
  font-weight: 600;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

@media (prefers-color-scheme: dark) {
  .detailLabel {
    color: #666;
  }
}

.detailValue {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 500;
  color: #010f44;
  line-height: 1.5;
  word-break: break-word;
}

@media (prefers-color-scheme: dark) {
  .detailValue {
    color: #fff;
  }
}
```

- [ ] **Step 2: Verify layout in browser**

Check that details grid is responsive and properly spaced

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/campaign/\[id\]/page.module.css
git commit -m "style: improve details grid layout and typography"
```

---

### Task 4: Enhance QR Code Section

**Files:**
- Modify: `app/(dashboard)/campaign/[id]/page.module.css` (`.qrSection`)

- [ ] **Step 1: Add QR section styling**

Add or replace `.qrSection` styles:

```css
.qrSection {
  padding: 24px;
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  margin-bottom: 24px;
}

@media (prefers-color-scheme: dark) {
  .qrSection {
    background: #1a1a1a;
    border-color: #333;
  }
}

.qrSection h2 {
  margin: 0 0 20px 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: #010f44;
}

@media (prefers-color-scheme: dark) {
  .qrSection h2 {
    color: #fff;
  }
}
```

- [ ] **Step 2: Verify QR section styling in browser**

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/campaign/\[id\]/page.module.css
git commit -m "style: enhance QR code section styling"
```

---

### Task 5: Update Header Styling

**Files:**
- Modify: `app/(dashboard)/campaign/[id]/page.module.css` (`.header`, `.title`, `.dateRange`)

- [ ] **Step 1: Improve header styling**

Update header styles:

```css
.header {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 2px solid #e8e8e8;
}

@media (prefers-color-scheme: dark) {
  .header {
    border-bottom-color: #333;
  }
}

.backButton {
  padding: 8px;
  background: transparent;
  border: none;
  color: #666;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s ease;
  flex-shrink: 0;
  margin-top: 2px;
}

@media (prefers-color-scheme: dark) {
  .backButton {
    color: #aaa;
  }
}

.backButton:hover {
  background: #f5f5f5;
  color: #010f44;
}

@media (prefers-color-scheme: dark) {
  .backButton:hover {
    background: #2a2a2a;
    color: #fff;
  }
}

.headerContent {
  flex: 1;
  min-width: 0;
}

.title {
  margin: 0 0 8px 0;
  font-size: 2rem;
  font-weight: 800;
  color: #010f44;
  line-height: 1.2;
}

@media (prefers-color-scheme: dark) {
  .title {
    color: #fff;
  }
}

@media (max-width: 768px) {
  .title {
    font-size: 1.5rem;
  }
}

.dateRange {
  margin: 0;
  font-size: 0.9375rem;
  color: #666;
}

@media (prefers-color-scheme: dark) {
  .dateRange {
    color: #aaa;
  }
}
```

- [ ] **Step 2: Verify header in browser**

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/campaign/\[id\]/page.module.css
git commit -m "style: improve header styling with better spacing and typography"
```

---

### Task 6: Add Container and Responsive Improvements

**Files:**
- Modify: `app/(dashboard)/campaign/[id]/page.module.css` (general container updates)

- [ ] **Step 1: Update container and add responsive utilities**

Update `.container` and add utility styles:

```css
.container {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px;
  background-color: #ffffff;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  min-height: 100vh;
}

@media (max-width: 768px) {
  .container {
    padding: 16px;
    gap: 16px;
  }
}

@media (prefers-color-scheme: dark) {
  .container {
    background-color: #0a0a0a;
  }
}

/* Loading and Error States */
.loadingContainer {
  padding: 60px 24px;
  text-align: center;
  color: #666;
  font-size: 1rem;
}

@media (prefers-color-scheme: dark) {
  .loadingContainer {
    color: #aaa;
  }
}

.errorContainer {
  padding: 40px 24px;
  text-align: center;
  color: #d32f2f;
  background: #ffebee;
  border-radius: 8px;
  border: 1px solid #f5c6cb;
}

@media (prefers-color-scheme: dark) {
  .errorContainer {
    background: rgba(211, 47, 47, 0.1);
    border-color: rgba(211, 47, 47, 0.3);
    color: #ff6b6b;
  }
}

.emptyState {
  padding: 60px 24px;
  text-align: center;
  color: #999;
  font-size: 1.125rem;
}

@media (prefers-color-scheme: dark) {
  .emptyState {
    color: #666;
  }
}
```

- [ ] **Step 2: Verify responsive behavior at mobile (480px), tablet (768px), and desktop (1200px+)**

Test in browser DevTools with different viewport sizes

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/campaign/\[id\]/page.module.css
git commit -m "style: improve container responsiveness and add loading/error state styling"
```

---

### Task 7: Visual Verification and Final Touches

**Files:**
- No file changes - verification only

- [ ] **Step 1: Test page at http://localhost:3000/campaign/6a2458a4a553f7439c4d7666**

Verify:
- ✓ Stats cards are large (2.5rem font) with uppercase labels
- ✓ Sections have proper white backgrounds with borders
- ✓ Primary buttons show orange gradient with hover lift
- ✓ Details grid is responsive
- ✓ Header has proper spacing and typography
- ✓ Dark mode colors are correct throughout
- ✓ Responsive layout works on mobile/tablet/desktop
- ✓ All icons and badges display correctly

- [ ] **Step 2: Compare with Figma prototype**

Open Figma prototype: https://www.figma.com/proto/K98XasrbuaVfBxiN4BovzA/ScractchX_Proto--Copy-?node-id=1186-7111

Check that:
- Stat card styling matches
- Campaign Details section layout matches
- Section styling and spacing match
- QR Code section appearance matches
- Button styling matches
- Typography hierarchy matches
- Colors match design system

- [ ] **Step 3: Test dark mode toggle**

In DevTools, enable dark mode and verify all sections have proper colors

- [ ] **Step 4: Final commit (no code changes)**

```bash
git log --oneline -7  # Verify all styling commits are there
```

---

## Summary

This plan updates the Campaign Detail page CSS styling to match the Figma prototype through 7 focused tasks:

1. **Stat Cards** - Larger, more prominent styling
2. **Sections** - Better base styling and button appearance
3. **Details Grid** - Improved layout and typography
4. **QR Section** - Enhanced styling
5. **Header** - Better spacing and hierarchy
6. **Container** - Responsiveness and state styling
7. **Verification** - Visual comparison with Figma

**Total Tasks:** 7  
**Files Modified:** 1 (page.module.css)  
**Estimated Time:** 1-2 hours
