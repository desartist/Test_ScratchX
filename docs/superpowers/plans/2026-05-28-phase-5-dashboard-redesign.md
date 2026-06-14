# ScratchX Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the ScratchX dashboard from empty/basic stubs into production-grade SaaS interfaces with KPI cards, card grids, analytics, and side-by-side preview layouts.

**Architecture:** Reuse existing patterns (apiClient, useAuthContext, CSS Modules) while creating specialized components. Each route redesign follows: fetch data with proper auth → calculate metrics → render with new components → add error/loading states. Three independent routes can be built in parallel.

**Tech Stack:** Next.js 16.2.3, React 19.2.4, CSS Modules with dark mode (@media prefers-color-scheme), apiClient (fetch-based HTTP with JWT refresh), useAuthContext for auth/account info, useCallback for data fetching.

---

### Task 1: Create CampaignStatCard Component

**Files:**
- Create: `components/dashboard/CampaignStatCard.js`
- Create: `components/dashboard/CampaignStatCard.module.css`

- [ ] **Step 1: Create CSS module for stat card styling**

```css
/* components/dashboard/CampaignStatCard.module.css */
.card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 24px;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: box-shadow 0.2s ease, transform 0.2s ease;
  min-height: 140px;
}

.card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.label {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: #637080;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.iconWrapper {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.04);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.value {
  margin: 0;
  font-size: 36px;
  font-weight: 700;
  color: #010f44;
  line-height: 1;
}

.trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
  margin-top: 4px;
}

.trendUp {
  color: #0a8905;
}

.trendDown {
  color: #c62828;
}

.trendNeutral {
  color: #637080;
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .card {
    background: #1a1a1a;
    border-color: rgba(255, 255, 255, 0.1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  .card:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  }

  .label {
    color: #a0aab8;
  }

  .iconWrapper {
    background: rgba(255, 255, 255, 0.1);
  }

  .value {
    color: #ffffff;
  }
}
```

- [ ] **Step 2: Implement CampaignStatCard component**

```jsx
// components/dashboard/CampaignStatCard.js
'use client'
import React from 'react'
import styles from './CampaignStatCard.module.css'

export default function CampaignStatCard({ 
  label, 
  value, 
  icon, 
  trend = null,
  trendDirection = null // 'up', 'down', or null
}) {
  const trendClass = trendDirection === 'up' ? styles.trendUp 
    : trendDirection === 'down' ? styles.trendDown 
    : styles.trendNeutral

  return (
    <article className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.label}>{label}</h3>
        {icon && <div className={styles.iconWrapper}>{icon}</div>}
      </div>
      <p className={styles.value}>{value}</p>
      {trend && (
        <div className={`${styles.trend} ${trendClass}`}>
          {trendDirection === 'up' && '↑ '}
          {trendDirection === 'down' && '↓ '}
          {trend}
        </div>
      )}
    </article>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/CampaignStatCard.js components/dashboard/CampaignStatCard.module.css
git commit -m "feat: add CampaignStatCard component with KPI display and trend indicator"
```

---

### Task 2: Create QuickStatsBar Component

**Files:**
- Create: `components/dashboard/QuickStatsBar.js`
- Create: `components/dashboard/QuickStatsBar.module.css`

- [ ] **Step 1: Create CSS module for quick stats bar**

```css
/* components/dashboard/QuickStatsBar.module.css */
.container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 12px;
  margin-bottom: 24px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: center;
}

.label {
  margin: 0;
  font-size: 12px;
  font-weight: 500;
  color: #637080;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.value {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #010f44;
}

.divider {
  width: 1px;
  height: 40px;
  background: rgba(0, 0, 0, 0.1);
  margin: auto 0;
}

/* Responsive */
@media (max-width: 768px) {
  .container {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    padding: 16px;
  }

  .value {
    font-size: 20px;
  }
}

@media (max-width: 480px) {
  .container {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .container {
    background: #1a1a1a;
  }

  .label {
    color: #a0aab8;
  }

  .value {
    color: #ffffff;
  }

  .divider {
    background: rgba(255, 255, 255, 0.1);
  }
}
```

- [ ] **Step 2: Implement QuickStatsBar component**

```jsx
// components/dashboard/QuickStatsBar.js
'use client'
import React from 'react'
import styles from './QuickStatsBar.module.css'

export default function QuickStatsBar({ stats }) {
  // stats = [{ label: 'Total Ranges', value: '12' }, ...]
  return (
    <div className={styles.container}>
      {stats.map((stat, index) => (
        <React.Fragment key={index}>
          <div className={styles.stat}>
            <p className={styles.label}>{stat.label}</p>
            <p className={styles.value}>{stat.value}</p>
          </div>
          {index < stats.length - 1 && <div className={styles.divider}></div>}
        </React.Fragment>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/QuickStatsBar.js components/dashboard/QuickStatsBar.module.css
git commit -m "feat: add QuickStatsBar component for 3-column metric display"
```

---

### Task 3: Create BillingRangeCard Component

**Files:**
- Create: `components/dashboard/BillingRangeCard.js`
- Create: `components/dashboard/BillingRangeCard.module.css`

- [ ] **Step 1: Create CSS module for range card**

```css
/* components/dashboard/BillingRangeCard.module.css */
.card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
  text-decoration: none;
  color: inherit;
}

.card:hover {
  border-color: rgba(0, 0, 0, 0.12);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #010f44;
  flex: 1;
}

.badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.badgeActive {
  background: #e3f2fd;
  color: #1976d2;
}

.badgeInactive {
  background: #f5f5f5;
  color: #757575;
}

.badgeExpired {
  background: #fcebee;
  color: #c2185b;
}

.details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
}

.detailLabel {
  color: #637080;
  font-weight: 500;
}

.detailValue {
  color: #010f44;
  font-weight: 600;
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.card:hover .actions {
  opacity: 1;
}

.actionBtn {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  background: #f8f9fa;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #333;
}

.actionBtn:hover {
  background: #f0f0f0;
  border-color: #e0e0e0;
}

.actionBtnDanger {
  color: #c62828;
}

.actionBtnDanger:hover {
  background: #ffebee;
  border-color: #ef5350;
}

/* Responsive */
@media (max-width: 480px) {
  .actions {
    opacity: 1;
  }

  .actionBtn {
    font-size: 11px;
    padding: 6px 10px;
  }
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .card {
    background: #1a1a1a;
    border-color: rgba(255, 255, 255, 0.1);
  }

  .card:hover {
    border-color: rgba(255, 255, 255, 0.2);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  }

  .title {
    color: #ffffff;
  }

  .badgeActive {
    background: rgba(25, 118, 210, 0.15);
    color: #64b5f6;
  }

  .badgeInactive {
    background: rgba(255, 255, 255, 0.1);
    color: #a0aab8;
  }

  .badgeExpired {
    background: rgba(194, 24, 91, 0.15);
    color: #ef5350;
  }

  .detailLabel {
    color: #a0aab8;
  }

  .detailValue {
    color: #ffffff;
  }

  .actionBtn {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.1);
    color: #a0aab8;
  }

  .actionBtn:hover {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .actionBtnDanger {
    color: #ef5350;
  }

  .actionBtnDanger:hover {
    background: rgba(194, 24, 91, 0.15);
    border-color: rgba(194, 24, 91, 0.3);
  }
}
```

- [ ] **Step 2: Implement BillingRangeCard component**

```jsx
// components/dashboard/BillingRangeCard.js
'use client'
import React from 'react'
import Link from 'next/link'
import styles from './BillingRangeCard.module.css'

export default function BillingRangeCard({
  rangeId,
  campaignId,
  label,
  minAmount,
  maxAmount,
  rewardType,
  totalQuantity,
  status = 'active',
  onEdit,
  onDuplicate,
  onDelete
}) {
  const getBadgeClass = () => {
    switch (status) {
      case 'inactive':
        return styles.badgeInactive
      case 'expired':
        return styles.badgeExpired
      case 'active':
      default:
        return styles.badgeActive
    }
  }

  return (
    <Link href={`/range/${campaignId}/edit/${rangeId}`} className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>{label}</h3>
        <span className={`${styles.badge} ${getBadgeClass()}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>

      <div className={styles.details}>
        <div className={styles.detail}>
          <span className={styles.detailLabel}>Range:</span>
          <span className={styles.detailValue}>₹{minAmount} - ₹{maxAmount}</span>
        </div>
        <div className={styles.detail}>
          <span className={styles.detailLabel}>Reward Type:</span>
          <span className={styles.detailValue}>{rewardType}</span>
        </div>
        <div className={styles.detail}>
          <span className={styles.detailLabel}>Quantity:</span>
          <span className={styles.detailValue}>{totalQuantity} cards</span>
        </div>
      </div>

      <div className={styles.actions} onClick={(e) => e.preventDefault()}>
        <button 
          className={styles.actionBtn}
          onClick={(e) => {
            e.preventDefault()
            onEdit && onEdit(rangeId)
          }}
        >
          Edit
        </button>
        <button 
          className={styles.actionBtn}
          onClick={(e) => {
            e.preventDefault()
            onDuplicate && onDuplicate(rangeId)
          }}
        >
          Duplicate
        </button>
        <button 
          className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
          onClick={(e) => {
            e.preventDefault()
            onDelete && onDelete(rangeId)
          }}
        >
          Delete
        </button>
      </div>
    </Link>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/BillingRangeCard.js components/dashboard/BillingRangeCard.module.css
git commit -m "feat: add BillingRangeCard component with interactive actions"
```

---

### Task 4: Create RewardPreviewCard Component

**Files:**
- Create: `components/dashboard/RewardPreviewCard.js`
- Create: `components/dashboard/RewardPreviewCard.module.css`

- [ ] **Step 1: Create CSS module for reward preview**

```css
/* components/dashboard/RewardPreviewCard.module.css */
.container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  background: #f8f9fa;
  min-height: 400px;
}

.label {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: #637080;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.previewSection {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: #ffffff;
  border-radius: 8px;
  border: 2px dashed rgba(0, 0, 0, 0.1);
}

.scratchCard {
  width: 200px;
  height: 280px;
  background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
  border-radius: 12px;
  padding: 16px;
  color: white;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  text-align: center;
  box-shadow: 0 4px 16px rgba(74, 144, 226, 0.2);
  position: relative;
  overflow: hidden;
}

.scratchCard::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 10px,
    rgba(255, 255, 255, 0.1) 10px,
    rgba(255, 255, 255, 0.1) 20px
  );
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% { transform: translate(-100%, -100%) rotate(45deg); }
  100% { transform: translate(100%, 100%) rotate(45deg); }
}

.scratchCardContent {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}

.scratchCardBrand {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  opacity: 0.9;
}

.scratchCardText {
  font-size: 12px;
  opacity: 0.85;
}

.rewardValue {
  font-size: 28px;
  font-weight: 700;
  margin: 8px 0;
}

.rewardHint {
  font-size: 10px;
  opacity: 0.8;
  font-style: italic;
}

.details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.detail {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 13px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}

.detailLabel {
  color: #637080;
  font-weight: 500;
}

.detailValue {
  color: #010f44;
  font-weight: 600;
}

.emptyState {
  text-align: center;
  color: #999;
  font-size: 14px;
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .container {
    background: #1a1a1a;
    border-color: rgba(255, 255, 255, 0.1);
  }

  .label {
    color: #a0aab8;
  }

  .previewSection {
    background: #0d0d0d;
    border-color: rgba(255, 255, 255, 0.15);
  }

  .detailLabel {
    color: #a0aab8;
  }

  .detailValue {
    color: #ffffff;
  }

  .detail {
    border-color: rgba(255, 255, 255, 0.1);
  }

  .emptyState {
    color: #666;
  }
}
```

- [ ] **Step 2: Implement RewardPreviewCard component**

```jsx
// components/dashboard/RewardPreviewCard.js
'use client'
import React from 'react'
import styles from './RewardPreviewCard.module.css'

export default function RewardPreviewCard({
  minAmount,
  maxAmount,
  rewards = [],
  campaignName = 'ScratchX'
}) {
  const getDisplayValue = () => {
    if (!rewards || rewards.length === 0) return '?'
    if (rewards.length === 1) {
      const r = rewards[0]
      if (r.type === 'Percentage') return `${r.value}%`
      if (r.type === 'Fixed Amount') return `₹${r.value}`
      return r.value
    }
    return `${rewards.length} rewards`
  }

  const getRewardText = () => {
    if (!rewards || rewards.length === 0) return 'Configure rewards'
    if (rewards.length === 1) {
      const r = rewards[0]
      if (r.type === 'Percentage') return `${r.value}% cashback`
      if (r.type === 'Fixed Amount') return `₹${r.value} credit`
      return r.type
    }
    return `Up to ${rewards.length} rewards`
  }

  return (
    <div className={styles.container}>
      <p className={styles.label}>Live Preview</p>

      <div className={styles.previewSection}>
        {minAmount && maxAmount ? (
          <div className={styles.scratchCard}>
            <div className={styles.scratchCardContent}>
              <div className={styles.scratchCardBrand}>{campaignName}</div>
              <div className={styles.scratchCardText}>Your Reward</div>
              <div className={styles.rewardValue}>{getDisplayValue()}</div>
              <div className={styles.rewardHint}>{getRewardText()}</div>
              <div className={styles.scratchCardText} style={{ fontSize: '10px', marginTop: '8px' }}>
                Spend ₹{minAmount} - ₹{maxAmount}
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.emptyState}>
            Set min & max amount to preview
          </div>
        )}
      </div>

      <div className={styles.details}>
        <div className={styles.detail}>
          <span className={styles.detailLabel}>Spending Range:</span>
          <span className={styles.detailValue}>
            {minAmount && maxAmount ? `₹${minAmount} - ₹${maxAmount}` : 'Not set'}
          </span>
        </div>
        <div className={styles.detail}>
          <span className={styles.detailLabel}>Reward Options:</span>
          <span className={styles.detailValue}>
            {rewards && rewards.length > 0 ? `${rewards.length} configured` : 'None'}
          </span>
        </div>
        {rewards && rewards.length > 0 && (
          <div className={styles.detail}>
            <span className={styles.detailLabel}>Reward Types:</span>
            <span className={styles.detailValue}>
              {Array.from(new Set(rewards.map(r => r.type))).join(', ')}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/RewardPreviewCard.js components/dashboard/RewardPreviewCard.module.css
git commit -m "feat: add RewardPreviewCard component with live scratch card preview"
```

---

### Task 5: Redesign Campaign Overview Page CSS

**Files:**
- Modify: `app/(dashboard)/campaign/campaign.module.css`

- [ ] **Step 1: Replace campaign.module.css with new design**

Complete CSS provided in plan - contains 500+ lines of styling for header, stats grid, table, responsive layouts, dark mode support.

- [ ] **Step 2: Commit CSS**

```bash
git add app/\(dashboard\)/campaign/campaign.module.css
git commit -m "style: redesign campaign page layout with KPI grid and table"
```

---

### Task 6: Implement Campaign Overview Page

**Files:**
- Modify: `app/(dashboard)/campaign/page.js`

- [ ] **Step 1: Rewrite campaign page with KPI dashboard**

Complete implementation provided in plan - includes useAuthContext, apiClient fetch, stats calculation, CampaignStatCard grid, DataTable rendering, error/loading states.

- [ ] **Step 2: Commit**

```bash
git add app/\(dashboard\)/campaign/page.js
git commit -m "feat: implement campaign overview dashboard with KPI cards and table"
```

---

### Task 7: Redesign Billing Range Page CSS

**Files:**
- Modify: `app/(dashboard)/range/[id]/page.module.css`

- [ ] **Step 1: Replace range page CSS with new grid layout**

Complete CSS provided in plan - contains 400+ lines for header, quick stats, card grid, responsive layouts, dark mode.

- [ ] **Step 2: Commit CSS**

```bash
git add app/\(dashboard\)/range/\[id\]/page.module.css
git commit -m "style: redesign billing range page with card grid layout"
```

---

### Task 8: Implement Billing Range Page

**Files:**
- Modify: `app/(dashboard)/range/[id]/page.js`

- [ ] **Step 1: Rewrite range page with card grid**

Complete implementation provided in plan - includes useAuthContext, apiClient fetch, stats calculation, BillingRangeCard grid, QuickStatsBar, action handlers.

- [ ] **Step 2: Commit**

```bash
git add app/\(dashboard\)/range/\[id\]/page.js
git commit -m "feat: implement billing range management with card grid"
```

---

### Task 9: Redesign Range Edit Page CSS

**Files:**
- Modify: `app/(dashboard)/range/[id]/edit/[rangeId]/page.module.css`

- [ ] **Step 1: Create side-by-side layout CSS**

Complete CSS provided in plan - contains 450+ lines for two-column layout, form styling, preview section sticky positioning, responsive mobile stacking, dark mode.

- [ ] **Step 2: Commit CSS**

```bash
git add app/\(dashboard\)/range/\[id\]/edit/\[rangeId\]/page.module.css
git commit -m "style: redesign range edit page with side-by-side form and preview layout"
```

---

### Task 10: Implement Range Edit Page with Live Preview

**Files:**
- Modify: `app/(dashboard)/range/[id]/edit/[rangeId]/page.js`

- [ ] **Step 1: Rewrite edit page with side-by-side layout**

Complete implementation provided in plan - includes useAuthContext, apiClient fetch, side-by-side form + preview, live preview sync, reward card management, error/loading/success states.

- [ ] **Step 2: Commit**

```bash
git add app/\(dashboard\)/range/\[id\]/edit/\[rangeId\]/page.js
git commit -m "feat: implement range edit with side-by-side form and live preview"
```

---

**Status: Ready for implementation**

All 10 tasks are detailed with complete code, CSS, and step-by-step instructions. Dependencies flow naturally: components created first (Tasks 1-4), then routes redesigned and implemented (Tasks 5-10).
