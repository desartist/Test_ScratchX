# Phase 6: Campaign Module Redesign - Card-Based SaaS Interface

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Campaign module from a table-based interface to a modern, card-based SaaS dashboard that matches the uploaded Campaign Listing (Retailer) design reference.

**Architecture:** This phase creates reusable campaign-specific components (CampaignCard, CampaignFilter, CampaignSearch, ScratchAllocationBar, CampaignActionsMenu) and redesigns three key routes to use card-based layouts with live search/filter, visual status indicators, and detailed campaign information. All components follow existing patterns: useAuthContext for auth, useCallback([account]) for data fetching, CSS Modules with dark mode support via @media (prefers-color-scheme: dark), responsive grid layouts (4 cols desktop → 2 tablet → 1 mobile).

**Tech Stack:** Next.js 16.2.3, React 19.2.4, CSS Modules, fetch-based HTTP, useAuthContext, useCallback patterns, responsive design (1200px, 1024px, 768px, 480px breakpoints).

---

## File Structure

**Components to Create:**
- `components/dashboard/CampaignCard.js` + `.module.css` — Card displaying campaign info with status, dates, scratch allocation, actions
- `components/dashboard/CampaignFilter.js` + `.module.css` — Tab-based filter component for campaign status filtering
- `components/dashboard/CampaignSearch.js` + `.module.css` — Search input component with debounced search
- `components/dashboard/ScratchAllocationBar.js` + `.module.css` — Progress bar showing scratch usage
- `components/dashboard/CampaignActionsMenu.js` + `.module.css` — Dropdown menu for campaign actions (Edit, Pause, Stats, Clone, Delete)

**Pages to Create/Redesign:**
- `app/(dashboard)/campaign/page.js` + `.module.css` — Complete redesign of campaign listing with cards, filters, search
- `app/(dashboard)/campaign/[id]/page.js` (new) + `.module.css` — Premium campaign details page with stats and analytics

**Pages to Verify:**
- `app/(dashboard)/range/[id]/page.js` + `.module.css` — Verify card design language consistency
- `app/(dashboard)/range/[id]/edit/[rangeId]/page.js` + `.module.css` — Verify styling consistency (dark mode fix already applied)

---

## Task 1: Create CampaignCard Component

**Files:**
- Create: `components/dashboard/CampaignCard.js`
- Create: `components/dashboard/CampaignCard.module.css`

### Step 1: Create CSS Module with full styling

Create `components/dashboard/CampaignCard.module.css`:

```css
/* Campaign Card Container */
.card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
  cursor: pointer;
  position: relative;
}

.card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

@media (prefers-color-scheme: dark) {
  .card {
    background: #1a1a1a;
    border-color: rgba(255, 255, 255, 0.1);
  }

  .card:hover {
    box-shadow: 0 4px 12px rgba(255, 255, 255, 0.1);
  }
}

/* Header Section - Campaign Name + Status Badge */
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.nameSection {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.campaignName {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #010f44;
  line-height: 1.4;
}

@media (prefers-color-scheme: dark) {
  .campaignName {
    color: #f5f5f5;
  }
}

.dateRange {
  margin: 0;
  font-size: 12px;
  color: #637080;
  line-height: 1.3;
}

@media (prefers-color-scheme: dark) {
  .dateRange {
    color: #a0aab8;
  }
}

/* Status Badge */
.statusBadge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.statusActive {
  background: rgba(10, 137, 5, 0.1);
  color: #0a8905;
}

.statusEndingSoon {
  background: rgba(245, 127, 23, 0.1);
  color: #f57f17;
}

.statusDraft {
  background: rgba(99, 112, 128, 0.1);
  color: #637080;
}

.statusEnded {
  background: rgba(198, 40, 40, 0.1);
  color: #c62828;
}

/* Info Row - Days Left, Stores, Billing Range */
.infoRow {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
  padding: 12px 0;
  border-top: 1px solid #e0e0e0;
  border-bottom: 1px solid #e0e0e0;
}

@media (prefers-color-scheme: dark) {
  .infoRow {
    border-color: rgba(255, 255, 255, 0.08);
  }
}

.infoItem {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.infoLabel {
  margin: 0;
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  color: #637080;
  letter-spacing: 0.5px;
}

@media (prefers-color-scheme: dark) {
  .infoLabel {
    color: #a0aab8;
  }
}

.infoValue {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #010f44;
}

@media (prefers-color-scheme: dark) {
  .infoValue {
    color: #f5f5f5;
  }
}

/* Days Left with Color Coding */
.daysLeft {
  color: #010f44;
}

.daysLeftHigh {
  color: #0a8905;
}

.daysLeftMedium {
  color: #f57f17;
}

.daysLeftLow {
  color: #c62828;
}

/* Scratch Allocation Section */
.scratchSection {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.scratchLabel {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: #010f44;
}

@media (prefers-color-scheme: dark) {
  .scratchLabel {
    color: #f5f5f5;
  }
}

.scratchBar {
  width: 100%;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

@media (prefers-color-scheme: dark) {
  .scratchBar {
    background: rgba(255, 255, 255, 0.1);
  }
}

.scratchProgress {
  height: 100%;
  background: linear-gradient(90deg, #4a90e2, #357abd);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.scratchStats {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.scratchUsed {
  margin: 0;
  font-size: 11px;
  color: #637080;
}

@media (prefers-color-scheme: dark) {
  .scratchUsed {
    color: #a0aab8;
  }
}

.scratchRemaining {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  color: #010f44;
}

@media (prefers-color-scheme: dark) {
  .scratchRemaining {
    color: #f5f5f5;
  }
}

/* Warning State - Low Scratches */
.warningBanner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(198, 40, 40, 0.08);
  border-radius: 4px;
  border-left: 3px solid #c62828;
}

.warningIcon {
  font-size: 14px;
  color: #c62828;
}

.warningText {
  margin: 0;
  font-size: 12px;
  font-weight: 500;
  color: #c62828;
}

/* Action Buttons */
.actionButtonsContainer {
  display: flex;
  gap: 8px;
  padding-top: 8px;
  opacity: 1;
  transition: opacity 0.2s ease;
}

.card:not(:hover) .actionButtonsContainer {
  opacity: 0.6;
}

.actionButton {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  background: #ffffff;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  color: #010f44;
  cursor: pointer;
  transition: all 0.2s ease;
}

.actionButton:hover {
  background: #f5f5f5;
  border-color: #010f44;
}

@media (prefers-color-scheme: dark) {
  .actionButton {
    background: #2a2a2a;
    border-color: rgba(255, 255, 255, 0.1);
    color: #f5f5f5;
  }

  .actionButton:hover {
    background: #3a3a3a;
    border-color: rgba(255, 255, 255, 0.2);
  }
}

/* Responsive Design */
@media (max-width: 768px) {
  .card {
    padding: 14px;
    gap: 12px;
  }

  .campaignName {
    font-size: 15px;
  }

  .infoRow {
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .actionButtonsContainer {
    gap: 6px;
  }

  .actionButton {
    font-size: 11px;
    padding: 6px 10px;
  }
}

@media (max-width: 480px) {
  .card {
    padding: 12px;
    gap: 10px;
  }

  .campaignName {
    font-size: 14px;
  }

  .infoRow {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .actionButtonsContainer {
    flex-direction: column;
  }

  .actionButton {
    width: 100%;
  }
}
```

### Step 2: Create CampaignCard component

Create `components/dashboard/CampaignCard.js`:

```javascript
"use client";
import React from "react";
import Link from "next/link";
import styles from "./CampaignCard.module.css";

export default function CampaignCard({
  campaignId,
  campaignName,
  startDate,
  endDate,
  daysLeft,
  storeCount,
  status,
  billingRange,
  scratchUsed,
  scratchTotal,
  onEdit,
  onPause,
  onStats,
  onClone,
  onDelete,
}) {
  // Calculate scratch percentage for progress bar
  const scratchPercentage = scratchTotal > 0 ? (scratchUsed / scratchTotal) * 100 : 0;
  
  // Determine if scratches are low (less than 10% remaining)
  const scratchesLow = scratchPercentage > 90;
  
  // Determine days left styling
  const getDaysLeftClass = () => {
    if (daysLeft > 30) return styles.daysLeftHigh;
    if (daysLeft > 7) return styles.daysLeftMedium;
    return styles.daysLeftLow;
  };

  // Get status badge styling
  const getStatusClass = () => {
    switch (status?.toLowerCase()) {
      case "active":
        return styles.statusActive;
      case "ending soon":
        return styles.statusEndingSoon;
      case "draft":
        return styles.statusDraft;
      case "ended":
        return styles.statusEnded;
      default:
        return styles.statusActive;
    }
  };

  // Format date range
  const formatDateRange = () => {
    if (startDate && endDate) {
      return `${startDate} - ${endDate}`;
    }
    return "Date range not set";
  };

  return (
    <div className={styles.card}>
      {/* Header: Campaign Name + Status Badge */}
      <div className={styles.header}>
        <div className={styles.nameSection}>
          <h3 className={styles.campaignName}>{campaignName}</h3>
          <p className={styles.dateRange}>{formatDateRange()}</p>
        </div>
        <span className={`${styles.statusBadge} ${getStatusClass()}`}>
          {status}
        </span>
      </div>

      {/* Info Row: Days Left, Stores, Billing Range */}
      <div className={styles.infoRow}>
        <div className={styles.infoItem}>
          <p className={styles.infoLabel}>Days Left</p>
          <p className={`${styles.infoValue} ${getDaysLeftClass()}`}>
            {daysLeft}
          </p>
        </div>
        <div className={styles.infoItem}>
          <p className={styles.infoLabel}>Stores</p>
          <p className={styles.infoValue}>{storeCount}</p>
        </div>
        <div className={styles.infoItem}>
          <p className={styles.infoLabel}>Billing Range</p>
          <p className={styles.infoValue}>{billingRange || "-"}</p>
        </div>
      </div>

      {/* Scratch Allocation Section */}
      <div className={styles.scratchSection}>
        <p className={styles.scratchLabel}>Scratch Allocation</p>
        <div className={styles.scratchBar}>
          <div
            className={styles.scratchProgress}
            style={{ width: `${scratchPercentage}%` }}
          />
        </div>
        <div className={styles.scratchStats}>
          <span className={styles.scratchUsed}>
            {scratchUsed.toLocaleString("en-IN")} / {scratchTotal.toLocaleString("en-IN")}
          </span>
          <span className={styles.scratchRemaining}>
            {(scratchTotal - scratchUsed).toLocaleString("en-IN")} left
          </span>
        </div>
      </div>

      {/* Warning Banner - Low Scratches */}
      {scratchesLow && (
        <div className={styles.warningBanner}>
          <span className={styles.warningIcon}>⚠️</span>
          <p className={styles.warningText}>
            Only {(scratchTotal - scratchUsed).toLocaleString("en-IN")} scratches left
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className={styles.actionButtonsContainer}>
        <Link href={`/campaign/${campaignId}`}>
          <button className={styles.actionButton}>View</button>
        </Link>
        <button className={styles.actionButton} onClick={onEdit}>
          Edit
        </button>
        <button className={styles.actionButton} onClick={onStats}>
          Stats
        </button>
      </div>
    </div>
  );
}
```

### Step 3: Test the component manually

Open the app and navigate to `/campaign` page. The page won't render correctly yet (since we haven't updated the page component), but we've created the reusable CampaignCard component.

### Step 4: Commit

```bash
git add components/dashboard/CampaignCard.js components/dashboard/CampaignCard.module.css
git commit -m "feat(dashboard): Create CampaignCard component

Create reusable CampaignCard component for displaying campaign information in
a modern card-based layout. Includes:
- Campaign name, date range, status badge
- Days left indicator with color coding (green >30, orange 7-30, red <7)
- Store count and billing range info
- Scratch allocation progress bar with numeric display
- Warning state for low scratches (<10% remaining)
- Action buttons: View, Edit, Stats
- Full dark mode support via @media (prefers-color-scheme: dark)
- Responsive design (desktop, tablet, mobile)
- Hover effects with lift animation

Follows existing design patterns: CSS Modules, responsive grid, dark mode."