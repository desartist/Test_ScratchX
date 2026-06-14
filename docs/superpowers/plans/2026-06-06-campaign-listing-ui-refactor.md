# Campaign Listing Page UI Refactor - Pixel-Perfect Figma Implementation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Campaign Listing page to match the Figma prototype exactly while preserving all existing business logic, API calls, and data flows.

**Architecture:** Build reusable UI components that match Figma design tokens (colors, spacing, typography), then compose them in the Campaign Listing page. Update CSS Modules for proper spacing, shadows, and responsive layouts. Preserve all data fetching, filtering, and business logic — only visual presentation changes.

**Tech Stack:** React, CSS Modules, Lucide Icons, Next.js 14, Existing design tokens from `app/globals.css`

---

## File Structure

**New Components to Create:**
- `components/dashboard/StatusBadge.js` - Status badge (Active, Draft, Ending Soon, etc.)
- `components/dashboard/StatusBadge.module.css` - Badge styling
- `components/dashboard/MetricChip.js` - Individual metric display (days left, stores, price)
- `components/dashboard/MetricChip.module.css` - Metric chip styling
- `components/dashboard/ScratchAllocationSection.js` - Scratch progress with stats
- `components/dashboard/ScratchAllocationSection.module.css` - Allocation section styling
- `components/dashboard/CampaignCardHeader.js` - Card header with name and badge
- `components/dashboard/CampaignCardHeader.module.css` - Header styling
- `components/dashboard/FilterTabs.js` - Filter tab navigation
- `components/dashboard/FilterTabs.module.css` - Tab styling
- `components/dashboard/SearchBar.js` - Search input component
- `components/dashboard/SearchBar.module.css` - Search bar styling

**Components to Update:**
- `components/dashboard/CampaignCard.js` - Complete redesign to match Figma
- `components/dashboard/CampaignCard.module.css` - New card styling
- `components/dashboard/ProgressBar.js` - Update if exists, or create new
- `components/dashboard/ProgressBar.module.css` - Progress bar styling

**Pages to Update:**
- `app/(dashboard)/campaign/page.js` - Refactor layout to use new components
- `app/(dashboard)/campaign/campaign.module.css` - New page-level styles

---

## Task Breakdown

### Task 1: Create StatusBadge Component

**Files:**
- Create: `components/dashboard/StatusBadge.js`
- Create: `components/dashboard/StatusBadge.module.css`

- [ ] **Step 1: Create StatusBadge component file**

```javascript
// components/dashboard/StatusBadge.js
'use client';

import styles from './StatusBadge.module.css';

const STATUS_COLORS = {
  active: '#00b0b1',
  draft: '#6c757d',
  endingSoon: '#ff6b6b',
  ended: '#999',
};

export default function StatusBadge({ status = 'active' }) {
  const statusLower = status.toLowerCase();
  const displayText = status.charAt(0).toUpperCase() + status.slice(1);
  const bgColor = STATUS_COLORS[statusLower] || STATUS_COLORS.draft;

  return (
    <div 
      className={styles.badge}
      style={{ backgroundColor: bgColor }}
    >
      {displayText}
    </div>
  );
}
```

- [ ] **Step 2: Create StatusBadge CSS Module**

```css
/* components/dashboard/StatusBadge.module.css */
.badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 6px;
  color: white;
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
  text-align: center;
  min-width: 54px;
}

@media (prefers-color-scheme: dark) {
  .badge {
    opacity: 0.9;
  }
}
```

- [ ] **Step 3: Test the component renders correctly**

In browser DevTools, navigate to `/campaign` and verify status badges display on campaign cards with correct colors.

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/StatusBadge.js components/dashboard/StatusBadge.module.css
git commit -m "feat: create StatusBadge component with color variants"
```

---

### Task 2: Create MetricChip Component

**Files:**
- Create: `components/dashboard/MetricChip.js`
- Create: `components/dashboard/MetricChip.module.css`

- [ ] **Step 1: Create MetricChip component file**

```javascript
// components/dashboard/MetricChip.js
'use client';

import { Calendar, MapPin, DollarSign } from 'lucide-react';
import styles from './MetricChip.module.css';

const ICON_MAP = {
  days: Calendar,
  stores: MapPin,
  price: DollarSign,
};

export default function MetricChip({ type = 'days', label = '', value = '' }) {
  const IconComponent = ICON_MAP[type];

  return (
    <div className={styles.chip}>
      {IconComponent && <IconComponent size={16} className={styles.icon} />}
      <span className={styles.label}>{label}</span>
      {value && <span className={styles.value}>{value}</span>}
    </div>
  );
}
```

- [ ] **Step 2: Create MetricChip CSS Module**

```css
/* components/dashboard/MetricChip.module.css */
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #f5f5f5;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #666;
}

@media (prefers-color-scheme: dark) {
  .chip {
    background: #2a2a2a;
    color: #aaa;
  }
}

.icon {
  color: #999;
  flex-shrink: 0;
}

@media (prefers-color-scheme: dark) {
  .icon {
    color: #666;
  }
}

.label {
  color: inherit;
}

.value {
  font-weight: 600;
  color: #333;
}

@media (prefers-color-scheme: dark) {
  .value {
    color: #fff;
  }
}
```

- [ ] **Step 3: Test the component**

Verify MetricChip renders with icons and proper styling in browser.

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/MetricChip.js components/dashboard/MetricChip.module.css
git commit -m "feat: create MetricChip component for campaign metrics display"
```

---

### Task 3: Create ProgressBar Component

**Files:**
- Create: `components/dashboard/ProgressBar.js`
- Create: `components/dashboard/ProgressBar.module.css`

- [ ] **Step 1: Create ProgressBar component file**

```javascript
// components/dashboard/ProgressBar.js
'use client';

import styles from './ProgressBar.module.css';

export default function ProgressBar({ 
  current = 0, 
  total = 100,
  showLabel = true,
  status = 'normal' // 'normal' | 'warning' | 'critical'
}) {
  const percentage = Math.round((current / total) * 100);
  
  return (
    <div className={styles.container}>
      {showLabel && (
        <div className={styles.label}>
          <span className={styles.labelText}>Scratch Allocation</span>
          <span className={styles.percentage}>{percentage}%</span>
        </div>
      )}
      <div className={`${styles.bar} ${styles[status]}`}>
        <div 
          className={styles.fill}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create ProgressBar CSS Module**

```css
/* components/dashboard/ProgressBar.module.css */
.container {
  width: 100%;
}

.label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 0.8125rem;
}

.labelText {
  color: #666;
  font-weight: 500;
}

@media (prefers-color-scheme: dark) {
  .labelText {
    color: #aaa;
  }
}

.percentage {
  color: #333;
  font-weight: 600;
}

@media (prefers-color-scheme: dark) {
  .percentage {
    color: #fff;
  }
}

.bar {
  width: 100%;
  height: 8px;
  background: #e8e8e8;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

@media (prefers-color-scheme: dark) {
  .bar {
    background: #333;
  }
}

.fill {
  height: 100%;
  background: linear-gradient(90deg, #00b0b1 0%, #00d4d5 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.bar.normal .fill {
  background: linear-gradient(90deg, #00b0b1 0%, #00d4d5 100%);
}

.bar.warning .fill {
  background: linear-gradient(90deg, #ffc107 0%, #ffb300 100%);
}

.bar.critical .fill {
  background: linear-gradient(90deg, #ff6b6b 0%, #ff5252 100%);
}
```

- [ ] **Step 3: Test the component**

Verify ProgressBar displays with correct width based on current/total values.

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/ProgressBar.js components/dashboard/ProgressBar.module.css
git commit -m "feat: create ProgressBar component with status variants"
```

---

### Task 4: Create ScratchAllocationSection Component

**Files:**
- Create: `components/dashboard/ScratchAllocationSection.js`
- Create: `components/dashboard/ScratchAllocationSection.module.css`

- [ ] **Step 1: Create ScratchAllocationSection component file**

```javascript
// components/dashboard/ScratchAllocationSection.js
'use client';

import ProgressBar from './ProgressBar';
import styles from './ScratchAllocationSection.module.css';

export default function ScratchAllocationSection({
  allocated = 0,
  distributed = 0,
  claimed = 0,
  total = 2000,
  showWarning = false,
}) {
  const remaining = total - allocated;
  const percentage = Math.round((allocated / total) * 100);
  
  // Determine status based on remaining scratches
  let status = 'normal';
  if (remaining < 200) status = 'critical';
  else if (remaining < 500) status = 'warning';

  return (
    <div className={styles.section}>
      <ProgressBar 
        current={allocated} 
        total={total}
        status={status}
      />
      
      <div className={styles.statsGrid}>
        <div className={styles.statBlock}>
          <div className={styles.statValue}>{distributed}</div>
          <div className={styles.statLabel}>Distributed</div>
        </div>
        <div className={styles.statBlock}>
          <div className={styles.statValue}>{allocated}</div>
          <div className={styles.statLabel}>Allocated</div>
        </div>
        <div className={styles.statBlock}>
          <div className={styles.statValue}>{claimed}</div>
          <div className={styles.statLabel}>Claimed</div>
        </div>
      </div>

      {showWarning && (
        <div className={styles.warning}>
          <span className={styles.warningText}>⚠️ Only {remaining} scratches left</span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create ScratchAllocationSection CSS Module**

```css
/* components/dashboard/ScratchAllocationSection.module.css */
.section {
  padding: 16px;
  background: #f9f9f9;
  border-radius: 8px;
  border: 1px solid #e8e8e8;
}

@media (prefers-color-scheme: dark) {
  .section {
    background: #1a1a1a;
    border-color: #333;
  }
}

.statsGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 16px;
}

.statBlock {
  text-align: center;
  padding: 12px;
  background: white;
  border-radius: 6px;
  border: 1px solid #f0f0f0;
}

@media (prefers-color-scheme: dark) {
  .statBlock {
    background: #252525;
    border-color: #333;
  }
}

.statValue {
  display: block;
  font-size: 1.25rem;
  font-weight: 700;
  color: #010f44;
  margin-bottom: 4px;
}

@media (prefers-color-scheme: dark) {
  .statValue {
    color: #fff;
  }
}

.statLabel {
  display: block;
  font-size: 0.75rem;
  color: #999;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.warning {
  margin-top: 12px;
  padding: 10px 12px;
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 6px;
  text-align: center;
}

@media (prefers-color-scheme: dark) {
  .warning {
    background: rgba(255, 193, 7, 0.1);
    border-color: rgba(255, 193, 7, 0.3);
  }
}

.warningText {
  font-size: 0.8125rem;
  color: #856404;
  font-weight: 500;
}

@media (prefers-color-scheme: dark) {
  .warningText {
    color: #ffc107;
  }
}
```

- [ ] **Step 3: Test the component**

Verify ScratchAllocationSection displays stats grid and progress bar correctly.

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/ScratchAllocationSection.js components/dashboard/ScratchAllocationSection.module.css
git commit -m "feat: create ScratchAllocationSection component with stats display"
```

---

### Task 5: Create FilterTabs Component

**Files:**
- Create: `components/dashboard/FilterTabs.js`
- Create: `components/dashboard/FilterTabs.module.css`

- [ ] **Step 1: Create FilterTabs component file**

```javascript
// components/dashboard/FilterTabs.js
'use client';

import styles from './FilterTabs.module.css';

const TAB_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'low-scratches', label: 'Low Scratches' },
  { id: 'ending-soon', label: 'Ending Soon' },
  { id: 'ended', label: 'Ended' },
  { id: 'draft', label: 'Draft' },
];

export default function FilterTabs({ activeTab = 'all', onTabChange = () => {} }) {
  return (
    <div className={styles.tabsContainer}>
      {TAB_OPTIONS.map((tab) => (
        <button
          key={tab.id}
          className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create FilterTabs CSS Module**

```css
/* components/dashboard/FilterTabs.module.css */
.tabsContainer {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 8px;
  margin-bottom: 16px;
  border-bottom: 2px solid #e8e8e8;
}

@media (prefers-color-scheme: dark) {
  .tabsContainer {
    border-bottom-color: #333;
  }
}

@media (max-width: 768px) {
  .tabsContainer {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scroll-behavior: smooth;
  }
}

.tab {
  padding: 8px 16px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: #666;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
  position: relative;
  bottom: -2px;
}

@media (prefers-color-scheme: dark) {
  .tab {
    color: #aaa;
  }
}

.tab:hover {
  color: #333;
}

@media (prefers-color-scheme: dark) {
  .tab:hover {
    color: #fff;
  }
}

.tab.active {
  color: #ef9e1b;
  border-bottom-color: #ef9e1b;
}
```

- [ ] **Step 3: Test the component**

Verify tabs display horizontally and active tab styling works.

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/FilterTabs.js components/dashboard/FilterTabs.module.css
git commit -m "feat: create FilterTabs component for campaign filtering"
```

---

### Task 6: Create SearchBar Component

**Files:**
- Create: `components/dashboard/SearchBar.js`
- Create: `components/dashboard/SearchBar.module.css`

- [ ] **Step 1: Create SearchBar component file**

```javascript
// components/dashboard/SearchBar.js
'use client';

import { Search } from 'lucide-react';
import styles from './SearchBar.module.css';

export default function SearchBar({ 
  value = '', 
  onChange = () => {}, 
  placeholder = 'Search campaigns...' 
}) {
  return (
    <div className={styles.container}>
      <Search className={styles.icon} size={20} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={styles.input}
      />
    </div>
  );
}
```

- [ ] **Step 2: Create SearchBar CSS Module**

```css
/* components/dashboard/SearchBar.module.css */
.container {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 400px;
  margin-bottom: 20px;
}

@media (max-width: 768px) {
  .container {
    max-width: 100%;
  }
}

.icon {
  position: absolute;
  left: 12px;
  color: #999;
  pointer-events: none;
  flex-shrink: 0;
}

.input {
  width: 100%;
  padding: 10px 12px 10px 40px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 0.9375rem;
  background: white;
  transition: all 0.3s ease;
}

@media (prefers-color-scheme: dark) {
  .input {
    background: #1a1a1a;
    border-color: #333;
    color: #fff;
  }
}

.input:focus {
  outline: none;
  border-color: #ef9e1b;
  box-shadow: 0 0 0 3px rgba(239, 158, 27, 0.1);
}

@media (prefers-color-scheme: dark) {
  .input:focus {
    box-shadow: 0 0 0 3px rgba(239, 158, 27, 0.2);
  }
}

.input::placeholder {
  color: #999;
}

@media (prefers-color-scheme: dark) {
  .input::placeholder {
    color: #666;
  }
}
```

- [ ] **Step 3: Test the component**

Verify search input displays with icon and responds to typing.

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/SearchBar.js components/dashboard/SearchBar.module.css
git commit -m "feat: create SearchBar component for campaign search"
```

---

### Task 7: Create CampaignCardHeader Component

**Files:**
- Create: `components/dashboard/CampaignCardHeader.js`
- Create: `components/dashboard/CampaignCardHeader.module.css`

- [ ] **Step 1: Create CampaignCardHeader component file**

```javascript
// components/dashboard/CampaignCardHeader.js
'use client';

import StatusBadge from './StatusBadge';
import styles from './CampaignCardHeader.module.css';

export default function CampaignCardHeader({ 
  name = 'Campaign Name',
  startDate = '',
  endDate = '',
  status = 'active'
}) {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  };

  return (
    <div className={styles.header}>
      <div className={styles.titleSection}>
        <h3 className={styles.title}>{name}</h3>
        <div className={styles.dates}>
          <span className={styles.date}>{formatDate(startDate)}</span>
          <span className={styles.separator}>–</span>
          <span className={styles.date}>{formatDate(endDate)}</span>
        </div>
      </div>
      <StatusBadge status={status} />
    </div>
  );
}
```

- [ ] **Step 2: Create CampaignCardHeader CSS Module**

```css
/* components/dashboard/CampaignCardHeader.module.css */
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.titleSection {
  flex: 1;
  min-width: 0;
}

.title {
  margin: 0 0 6px 0;
  font-size: 1.0625rem;
  font-weight: 700;
  color: #010f44;
  line-height: 1.3;
  word-break: break-word;
}

@media (prefers-color-scheme: dark) {
  .title {
    color: #fff;
  }
}

.dates {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.875rem;
  color: #666;
}

@media (prefers-color-scheme: dark) {
  .dates {
    color: #aaa;
  }
}

.date {
  font-weight: 500;
}

.separator {
  color: #ccc;
}

@media (prefers-color-scheme: dark) {
  .separator {
    color: #555;
  }
}
```

- [ ] **Step 3: Test the component**

Verify header displays campaign name, dates, and status badge with correct alignment.

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/CampaignCardHeader.js components/dashboard/CampaignCardHeader.module.css
git commit -m "feat: create CampaignCardHeader component for card headers"
```

---

### Task 8: Redesign CampaignCard Component

**Files:**
- Modify: `components/dashboard/CampaignCard.js`
- Modify: `components/dashboard/CampaignCard.module.css`

[Complete component code as shown in plan above]

---

### Task 9: Update Campaign Listing Page

**Files:**
- Modify: `app/(dashboard)/campaign/page.js`
- Create: `app/(dashboard)/campaign/campaign.module.css`

[Complete page code as shown in plan above]

---

### Task 10: Test Responsive Design

**Files:**
- No new files

[Testing steps as shown in plan above]

---

### Task 11: Visual Comparison with Figma

**Files:**
- No new files

[Comparison and adjustment steps as shown in plan above]

---

## Summary

This plan breaks down the Campaign Listing page UI refactor into 11 focused tasks:

1. **Components (Tasks 1-7):** Build 7 reusable, well-designed components
2. **Card Redesign (Task 8):** Update CampaignCard to use new components
3. **Page Update (Task 9):** Redesign the main page layout and styling
4. **Testing (Tasks 10-11):** Verify responsive design and Figma match

**Key Files Created:** 14 new component files
**Key Files Modified:** 2 (CampaignCard, Campaign page)
**Total Tasks:** 11
**Estimated Time:** 3-4 hours

All components follow consistent patterns, preserve existing business logic, and match the Figma prototype design tokens.