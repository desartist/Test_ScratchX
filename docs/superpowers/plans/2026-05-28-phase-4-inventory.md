# Phase 4: Scratch Card Inventory - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement scratch card inventory management with allocation tracking and movement history.

**Architecture:** Three-tier inventory system: main dashboard showing current levels, allocation form for distributing cards to campaigns/stores, and tracking page displaying movement history. All pages use the established fetch-based pattern to API routes with auth headers. Forms include validation. Pages display data using the reusable DataTable component from Phase 1.

**Tech Stack:** Next.js 16.2.3, React 19.2.4, CSS Modules, Fetch API with JWT auth

---

## File Structure Overview

```
components/inventory/
├── InventoryForm.js                    (Allocation form component)
├── InventoryForm.module.css            (Form styling)
├── InventoryTracking.js                (Tracking history component)
└── InventoryTracking.module.css        (Tracking styling)

app/(dashboard)/scratch-inventory/
├── page.js                             (Main inventory dashboard)
├── page.module.css                     (Dashboard styling)
├── allocate/
│   ├── page.js                         (Allocation page)
│   └── page.module.css                 (Allocation page styling)
└── tracking/
    ├── page.js                         (Tracking history page)
    └── page.module.css                 (Tracking page styling)
```

---

## Task 1: Create InventoryForm.module.css

**Files:**
- Create: `components/inventory/InventoryForm.module.css`

- [ ] **Step 1: Write form styling with fields and validation states**

```css
/* components/inventory/InventoryForm.module.css */

.form {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
  background: #f9f9f9;
  border-radius: 8px;
}

.fieldGroup {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.label {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.select,
.input,
.textarea {
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.select:focus,
.input:focus,
.textarea:focus {
  outline: none;
  border-color: #4a90e2;
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
}

.input[type="number"] {
  padding: 10px 12px;
}

.errorMessage {
  font-size: 12px;
  color: #e74c3c;
  margin-top: 4px;
}

.successMessage {
  font-size: 12px;
  color: #27ae60;
  margin-top: 4px;
}

.checkmark {
  display: inline-block;
  width: 16px;
  height: 16px;
  background-color: #27ae60;
  color: white;
  border-radius: 50%;
  text-align: center;
  line-height: 16px;
  font-size: 12px;
  font-weight: bold;
  margin-left: 8px;
}

.buttonGroup {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 12px;
}

.submitButton {
  padding: 10px 24px;
  background-color: #4a90e2;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.submitButton:hover {
  background-color: #357abd;
}

.submitButton:disabled {
  background-color: #bbb;
  cursor: not-allowed;
}

.cancelButton {
  padding: 10px 24px;
  background-color: #e8e8e8;
  color: #333;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.cancelButton:hover {
  background-color: #d3d3d3;
}

.quantityInfo {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .form {
    background: #2a2a2a;
  }

  .label {
    color: #e8e8e8;
  }

  .select,
  .input,
  .textarea {
    background: #1a1a1a;
    color: #e8e8e8;
    border-color: #444;
  }

  .select:focus,
  .input:focus,
  .textarea:focus {
    border-color: #5ba3ff;
    box-shadow: 0 0 0 3px rgba(91, 163, 255, 0.1);
  }

  .quantityInfo {
    color: #999;
  }
}
```

- [ ] **Step 2: Commit CSS module**

```bash
git add components/inventory/InventoryForm.module.css
git commit -m "feat: add InventoryForm styling with validation states"
```

---

## Task 2: Create InventoryForm.js

**Files:**
- Create: `components/inventory/InventoryForm.js`

- [ ] **Step 1: Write allocation form component with validation**

```jsx
'use client';
import { useState, useEffect } from 'react';
import { useAuthContext } from '@/components/auth/AuthContext';
import styles from './InventoryForm.module.css';

export default function InventoryForm({ 
  onSubmit, 
  onCancel, 
  loading = false,
  campaigns = [],
  locations = []
}) {
  const { account } = useAuthContext();
  const [formData, setFormData] = useState({
    campaignId: '',
    locationId: '',
    quantity: ''
  });
  const [errors, setErrors] = useState({});
  const [validFields, setValidFields] = useState({});

  // Get available quantity for selected campaign
  const [availableQuantity, setAvailableQuantity] = useState(null);

  // Update available quantity when campaign changes
  useEffect(() => {
    if (formData.campaignId) {
      const campaign = campaigns.find(c => c._id === formData.campaignId);
      if (campaign) {
        const available = campaign.totalQuantity - (campaign.distributeQuantity || 0);
        setAvailableQuantity(available);
      }
    }
  }, [formData.campaignId, campaigns]);

  const validateField = (field, value) => {
    const newErrors = { ...errors };
    const newValid = { ...validFields };

    switch (field) {
      case 'campaignId':
        if (!value.trim()) {
          newErrors.campaignId = 'Campaign is required';
          delete newValid.campaignId;
        } else {
          delete newErrors.campaignId;
          newValid.campaignId = true;
        }
        break;

      case 'locationId':
        if (!value.trim()) {
          newErrors.locationId = 'Location is required';
          delete newValid.locationId;
        } else {
          delete newErrors.locationId;
          newValid.locationId = true;
        }
        break;

      case 'quantity':
        if (!value) {
          newErrors.quantity = 'Quantity is required';
          delete newValid.quantity;
        } else if (isNaN(value) || value <= 0) {
          newErrors.quantity = 'Quantity must be greater than 0';
          delete newValid.quantity;
        } else if (availableQuantity && value > availableQuantity) {
          newErrors.quantity = `Cannot exceed available quantity (${availableQuantity})`;
          delete newValid.quantity;
        } else {
          delete newErrors.quantity;
          newValid.quantity = true;
        }
        break;

      default:
        break;
    }

    setErrors(newErrors);
    setValidFields(newValid);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error on user input
    validateField(field, value);
  };

  const validateForm = () => {
    const newErrors = {};
    const newValid = {};

    if (!formData.campaignId.trim()) {
      newErrors.campaignId = 'Campaign is required';
    } else {
      newValid.campaignId = true;
    }

    if (!formData.locationId.trim()) {
      newErrors.locationId = 'Location is required';
    } else {
      newValid.locationId = true;
    }

    if (!formData.quantity) {
      newErrors.quantity = 'Quantity is required';
    } else if (isNaN(formData.quantity) || formData.quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    } else if (availableQuantity && formData.quantity > availableQuantity) {
      newErrors.quantity = `Cannot exceed available quantity (${availableQuantity})`;
    } else {
      newValid.quantity = true;
    }

    setErrors(newErrors);
    setValidFields(newValid);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit({
        campaignId: formData.campaignId,
        locationId: formData.locationId,
        quantity: parseInt(formData.quantity, 10)
      });
    } catch (err) {
      console.error('Allocation error:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.fieldGroup}>
        <label className={styles.label}>
          Campaign
          {validFields.campaignId && <span className={styles.checkmark}>✓</span>}
        </label>
        <select
          value={formData.campaignId}
          onChange={(e) => handleInputChange('campaignId', e.target.value)}
          className={styles.select}
          disabled={loading}
        >
          <option value="">Select a campaign...</option>
          {campaigns.map(campaign => (
            <option key={campaign._id} value={campaign._id}>
              {campaign.name} (Available: {campaign.totalQuantity - (campaign.distributeQuantity || 0)})
            </option>
          ))}
        </select>
        {errors.campaignId && <span className={styles.errorMessage}>{errors.campaignId}</span>}
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.label}>
          Location
          {validFields.locationId && <span className={styles.checkmark}>✓</span>}
        </label>
        <select
          value={formData.locationId}
          onChange={(e) => handleInputChange('locationId', e.target.value)}
          className={styles.select}
          disabled={loading}
        >
          <option value="">Select a location...</option>
          {locations.map(location => (
            <option key={location._id} value={location._id}>
              {location.name}
            </option>
          ))}
        </select>
        {errors.locationId && <span className={styles.errorMessage}>{errors.locationId}</span>}
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.label}>
          Quantity
          {validFields.quantity && <span className={styles.checkmark}>✓</span>}
        </label>
        <input
          type="number"
          value={formData.quantity}
          onChange={(e) => handleInputChange('quantity', e.target.value)}
          className={styles.input}
          disabled={loading}
          min="1"
          placeholder="Enter quantity to allocate"
        />
        {availableQuantity !== null && (
          <span className={styles.quantityInfo}>
            Available: {availableQuantity} units
          </span>
        )}
        {errors.quantity && <span className={styles.errorMessage}>{errors.quantity}</span>}
      </div>

      <div className={styles.buttonGroup}>
        <button
          type="button"
          onClick={onCancel}
          className={styles.cancelButton}
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className={styles.submitButton}
          disabled={loading}
        >
          {loading ? 'Allocating...' : 'Allocate Cards'}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Commit form component**

```bash
git add components/inventory/InventoryForm.js
git commit -m "feat: add InventoryForm with allocation validation"
```

---

## Task 3: Create InventoryTracking.module.css

**Files:**
- Create: `components/inventory/InventoryTracking.module.css`

- [ ] **Step 1: Write tracking history styling**

```css
/* components/inventory/InventoryTracking.module.css */

.container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 12px;
}

.title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.filterGroup {
  display: flex;
  gap: 12px;
  align-items: center;
}

.filterInput {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
  width: 200px;
}

.filterInput:focus {
  outline: none;
  border-color: #4a90e2;
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
}

.tableContainer {
  overflow-x: auto;
  border-radius: 8px;
  border: 1px solid #ddd;
}

.table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}

.table thead {
  background-color: #f5f5f5;
  border-bottom: 2px solid #ddd;
}

.table th {
  padding: 12px 16px;
  text-align: left;
  font-size: 13px;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
}

.table td {
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
  font-size: 13px;
  color: #666;
}

.table tbody tr:hover {
  background-color: #f9f9f9;
}

.statusBadge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  text-transform: capitalize;
}

.statusAllocated {
  background-color: #e3f2fd;
  color: #1976d2;
}

.statusRedeemed {
  background-color: #e8f5e9;
  color: #388e3c;
}

.statusTransferred {
  background-color: #fff3e0;
  color: #f57c00;
}

.statusExpired {
  background-color: #fce4ec;
  color: #c2185b;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #999;
  font-size: 14px;
}

.empty {
  text-align: center;
  padding: 60px 20px;
  color: #999;
}

.emptyIcon {
  font-size: 48px;
  margin-bottom: 16px;
}

.pagination {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  border-top: 1px solid #eee;
}

.paginationButton {
  padding: 6px 12px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.paginationButton:hover:not(:disabled) {
  border-color: #4a90e2;
  color: #4a90e2;
}

.paginationButton:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pageInfo {
  display: flex;
  align-items: center;
  padding: 0 12px;
  font-size: 12px;
  color: #666;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .title {
    color: #e8e8e8;
  }

  .filterInput {
    background: #1a1a1a;
    color: #e8e8e8;
    border-color: #444;
  }

  .filterInput:focus {
    border-color: #5ba3ff;
    box-shadow: 0 0 0 3px rgba(91, 163, 255, 0.1);
  }

  .tableContainer {
    border-color: #444;
  }

  .table {
    background: #2a2a2a;
  }

  .table thead {
    background-color: #1a1a1a;
    border-bottom-color: #444;
  }

  .table th {
    color: #e8e8e8;
  }

  .table td {
    color: #ccc;
    border-bottom-color: #333;
  }

  .table tbody tr:hover {
    background-color: #333;
  }

  .paginationButton {
    background: #2a2a2a;
    color: #e8e8e8;
    border-color: #444;
  }

  .paginationButton:hover:not(:disabled) {
    border-color: #5ba3ff;
    color: #5ba3ff;
  }

  .pageInfo {
    color: #aaa;
  }
}
```

- [ ] **Step 2: Commit styling**

```bash
git add components/inventory/InventoryTracking.module.css
git commit -m "feat: add InventoryTracking table styling"
```

---

## Task 4: Create InventoryTracking.js

**Files:**
- Create: `components/inventory/InventoryTracking.js`

- [ ] **Step 1: Write tracking history component with filtering and pagination**

```jsx
'use client';
import { useState, useMemo } from 'react';
import styles from './InventoryTracking.module.css';

export default function InventoryTracking({ 
  trackingData = [],
  loading = false 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm) return trackingData;
    
    const term = searchTerm.toLowerCase();
    return trackingData.filter(item => 
      item.campaignName?.toLowerCase().includes(term) ||
      item.locationName?.toLowerCase().includes(term) ||
      item.movementType?.toLowerCase().includes(term)
    );
  }, [trackingData, searchTerm]);

  // Paginate data
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const startIdx = (currentPage - 1) * rowsPerPage;
  const paginatedData = filteredData.slice(startIdx, startIdx + rowsPerPage);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'allocated':
        return styles.statusAllocated;
      case 'redeemed':
        return styles.statusRedeemed;
      case 'transferred':
        return styles.statusTransferred;
      case 'expired':
        return styles.statusExpired;
      default:
        return '';
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading inventory history...</div>;
  }

  if (trackingData.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>📦</div>
        <p>No inventory movement history yet</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Inventory Movement History</h3>
        <div className={styles.filterGroup}>
          <input
            type="text"
            placeholder="Search by campaign, location, or type..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // Reset to first page on search
            }}
            className={styles.filterInput}
          />
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Location</th>
              <th>Movement Type</th>
              <th>Quantity</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((item) => (
              <tr key={item._id}>
                <td>{item.campaignName}</td>
                <td>{item.locationName}</td>
                <td>{item.movementType}</td>
                <td>{item.quantity}</td>
                <td>
                  <span className={`${styles.statusBadge} ${getStatusBadgeClass(item.status)}`}>
                    {item.status}
                  </span>
                </td>
                <td>{formatDate(item.createdDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredData.length > rowsPerPage && (
        <div className={styles.pagination}>
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className={styles.paginationButton}
          >
            Previous
          </button>
          <div className={styles.pageInfo}>
            Page {currentPage} of {totalPages}
          </div>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className={styles.paginationButton}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit tracking component**

```bash
git add components/inventory/InventoryTracking.js
git commit -m "feat: add InventoryTracking component with search and pagination"
```

---

## Task 5: Create scratch-inventory/page.module.css

**Files:**
- Create: `app/(dashboard)/scratch-inventory/page.module.css`

- [ ] **Step 1: Write main inventory dashboard styling**

```css
/* app/(dashboard)/scratch-inventory/page.module.css */

.container {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.titleSection h1 {
  font-size: 28px;
  font-weight: 700;
  color: #333;
  margin: 0;
}

.titleSection p {
  font-size: 14px;
  color: #666;
  margin: 4px 0 0 0;
}

.actionButton {
  padding: 10px 24px;
  background-color: #4a90e2;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.actionButton:hover {
  background-color: #357abd;
}

.error {
  padding: 12px 16px;
  background-color: #fce4e4;
  color: #c33;
  border: 1px solid #e5bfbf;
  border-radius: 6px;
  font-size: 14px;
}

.statsGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.statCard {
  padding: 20px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.statLabel {
  font-size: 12px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.statValue {
  font-size: 32px;
  font-weight: 700;
  color: #333;
}

.statMeta {
  font-size: 12px;
  color: #999;
}

.inventoryTable {
  padding: 20px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.tableTitle {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0 0 16px 0;
}

.loading {
  text-align: center;
  padding: 60px 20px;
  color: #999;
  font-size: 14px;
}

.empty {
  text-align: center;
  padding: 60px 20px;
  background: #f9f9f9;
  border-radius: 8px;
  color: #999;
}

.emptyIcon {
  font-size: 48px;
  margin-bottom: 12px;
}

.locationFilter {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  align-items: center;
}

.filterLabel {
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.filterSelect {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  min-width: 180px;
}

.filterSelect:focus {
  outline: none;
  border-color: #4a90e2;
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .container {
    background: #1a1a1a;
  }

  .titleSection h1 {
    color: #e8e8e8;
  }

  .titleSection p {
    color: #aaa;
  }

  .error {
    background-color: #5c2a2a;
    color: #ff9999;
    border-color: #6d3a3a;
  }

  .statCard {
    background: #2a2a2a;
    border-color: #444;
  }

  .statLabel {
    color: #999;
  }

  .statValue {
    color: #e8e8e8;
  }

  .statMeta {
    color: #666;
  }

  .inventoryTable {
    background: #2a2a2a;
    border-color: #444;
  }

  .tableTitle {
    color: #e8e8e8;
  }

  .filterLabel {
    color: #e8e8e8;
  }

  .filterSelect {
    background: #1a1a1a;
    color: #e8e8e8;
    border-color: #444;
  }

  .filterSelect:focus {
    border-color: #5ba3ff;
    box-shadow: 0 0 0 3px rgba(91, 163, 255, 0.1);
  }

  .empty {
    background: #2a2a2a;
    color: #666;
  }
}
```

- [ ] **Step 2: Commit dashboard styling**

```bash
git add app/(dashboard)/scratch-inventory/page.module.css
git commit -m "feat: add scratch-inventory dashboard styling"
```

---

## Task 6: Create scratch-inventory/page.js

**Files:**
- Create: `app/(dashboard)/scratch-inventory/page.js`

- [ ] **Step 1: Write main inventory dashboard page with stats and table**

```jsx
'use client';
import { useEffect, useState } from 'react';
import { useAuthContext } from '@/components/auth/AuthContext';
import { useRouter } from 'next/navigation';
import DataTable from '@/components/common/DataTable';
import styles from './page.module.css';

export default function ScratchInventoryPage() {
  const { account } = useAuthContext();
  const router = useRouter();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [stats, setStats] = useState({
    totalCards: 0,
    allocatedCards: 0,
    redeemedCards: 0,
    availableCards: 0
  });
  const [locations, setLocations] = useState([]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      setError(null);

      const headers = {
        'Content-Type': 'application/json',
        'x-user-id': account?.id,
        'x-user-role': account?.role
      };

      // Fetch inventory data
      const inventoryRes = await fetch('/api/inventory', { headers });
      if (!inventoryRes.ok) {
        throw new Error('Failed to fetch inventory');
      }
      const inventoryData = await inventoryRes.json();
      setInventory(inventoryData);

      // Calculate stats
      const total = inventoryData.reduce((sum, item) => sum + item.totalQuantity, 0);
      const allocated = inventoryData.reduce((sum, item) => sum + (item.allocatedQuantity || 0), 0);
      const redeemed = inventoryData.reduce((sum, item) => sum + (item.redeemedQuantity || 0), 0);
      const available = total - allocated - redeemed;

      setStats({
        totalCards: total,
        allocatedCards: allocated,
        redeemedCards: redeemed,
        availableCards: available
      });

      // Extract unique locations
      const uniqueLocations = [...new Set(inventoryData.map(item => item.location))]
        .map(loc => ({ _id: loc, name: loc }));
      setLocations(uniqueLocations);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (account?.id) {
      fetchInventory();
    }
  }, [account?.id]);

  const filteredInventory = selectedLocation === 'all'
    ? inventory
    : inventory.filter(item => item.location === selectedLocation);

  const columns = [
    { field: 'campaignName', label: 'Campaign' },
    { field: 'location', label: 'Location' },
    { field: 'totalQuantity', label: 'Total Cards' },
    { 
      field: 'allocatedQuantity', 
      label: 'Allocated',
      render: (val) => val || 0
    },
    { 
      field: 'redeemedQuantity', 
      label: 'Redeemed',
      render: (val) => val || 0
    },
    { 
      field: 'availableQuantity', 
      label: 'Available',
      render: (_, row) => {
        const available = row.totalQuantity - (row.allocatedQuantity || 0) - (row.redeemedQuantity || 0);
        return available;
      }
    }
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1>Scratch Card Inventory</h1>
          <p>Manage and track scratch card allocation across locations</p>
        </div>
        <button 
          onClick={() => router.push('/scratch-inventory/allocate')}
          className={styles.actionButton}
        >
          + Allocate Cards
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total Cards</span>
          <span className={styles.statValue}>{stats.totalCards.toLocaleString()}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Allocated</span>
          <span className={styles.statValue}>{stats.allocatedCards.toLocaleString()}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Redeemed</span>
          <span className={styles.statValue}>{stats.redeemedCards.toLocaleString()}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Available</span>
          <span className={styles.statValue}>{stats.availableCards.toLocaleString()}</span>
        </div>
      </div>

      {/* Inventory Table */}
      <div className={styles.inventoryTable}>
        <div className={styles.locationFilter}>
          <label className={styles.filterLabel}>Filter by Location:</label>
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">All Locations</option>
            {locations.map(location => (
              <option key={location._id} value={location._id}>
                {location.name}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className={styles.loading}>Loading inventory...</div>
        ) : filteredInventory.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>📦</div>
            <p>No inventory data available</p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredInventory}
            loading={loading}
          />
        )}

        {!loading && inventory.length > 0 && (
          <div style={{ marginTop: '16px', textAlign: 'right' }}>
            <button 
              onClick={() => router.push('/scratch-inventory/tracking')}
              style={{
                padding: '8px 16px',
                background: '#f5f5f5',
                border: '1px solid #ddd',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              View Movement History →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit main inventory page**

```bash
git add app/(dashboard)/scratch-inventory/page.js
git commit -m "feat: add scratch-inventory dashboard with stats and table"
```

---

## Task 7: Create scratch-inventory/allocate/page.module.css

**Files:**
- Create: `app/(dashboard)/scratch-inventory/allocate/page.module.css`

- [ ] **Step 1: Write allocation page styling**

```css
/* app/(dashboard)/scratch-inventory/allocate/page.module.css */

.container {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px;
  max-width: 600px;
  margin: 0 auto;
}

.header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.backButton {
  padding: 8px 12px;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: background-color 0.2s;
}

.backButton:hover {
  background-color: #e8e8e8;
}

.titleSection h1 {
  font-size: 28px;
  font-weight: 700;
  color: #333;
  margin: 0;
}

.titleSection p {
  font-size: 14px;
  color: #666;
  margin: 4px 0 0 0;
}

.formCard {
  padding: 24px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.successMessage {
  padding: 12px 16px;
  background-color: #e8f5e9;
  color: #27ae60;
  border: 1px solid #c3e6cb;
  border-radius: 6px;
  font-size: 14px;
  margin-bottom: 16px;
}

.error {
  padding: 12px 16px;
  background-color: #fce4e4;
  color: #c33;
  border: 1px solid #e5bfbf;
  border-radius: 6px;
  font-size: 14px;
  margin-bottom: 16px;
}

.loading {
  text-align: center;
  padding: 60px 20px;
  color: #999;
  font-size: 14px;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .container {
    background: #1a1a1a;
  }

  .backButton {
    background: #2a2a2a;
    border-color: #444;
    color: #e8e8e8;
  }

  .backButton:hover {
    background-color: #333;
  }

  .titleSection h1 {
    color: #e8e8e8;
  }

  .titleSection p {
    color: #aaa;
  }

  .formCard {
    background: #2a2a2a;
    border-color: #444;
  }

  .successMessage {
    background-color: #1b4d2e;
    color: #90ee90;
    border-color: #2d6a3a;
  }

  .error {
    background-color: #5c2a2a;
    color: #ff9999;
    border-color: #6d3a3a;
  }
}
```

- [ ] **Step 2: Commit allocation page styling**

```bash
git add app/(dashboard)/scratch-inventory/allocate/page.module.css
git commit -m "feat: add allocate page styling"
```

---

## Task 8: Create scratch-inventory/allocate/page.js

**Files:**
- Create: `app/(dashboard)/scratch-inventory/allocate/page.js`

- [ ] **Step 1: Write allocation page with form integration**

```jsx
'use client';
import { useEffect, useState } from 'react';
import { useAuthContext } from '@/components/auth/AuthContext';
import { useRouter } from 'next/navigation';
import InventoryForm from '@/components/inventory/InventoryForm';
import styles from './page.module.css';

export default function AllocateInventoryPage() {
  const { account } = useAuthContext();
  const router = useRouter();
  const [campaigns, setCampaigns] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const headers = {
        'Content-Type': 'application/json',
        'x-user-id': account?.id,
        'x-user-role': account?.role
      };

      // Fetch campaigns
      const campaignRes = await fetch('/api/campaigns', { headers });
      if (!campaignRes.ok) {
        throw new Error('Failed to fetch campaigns');
      }
      const campaignData = await campaignRes.json();
      setCampaigns(campaignData);

      // Fetch locations (stores)
      const locationRes = await fetch('/api/stores', { headers });
      if (!locationRes.ok) {
        throw new Error('Failed to fetch locations');
      }
      const locationData = await locationRes.json();
      setLocations(locationData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (account?.id) {
      fetchData();
    }
  }, [account?.id]);

  const handleAllocate = async (formData) => {
    try {
      setSubmitLoading(true);
      setError(null);
      setSuccessMessage('');

      const headers = {
        'Content-Type': 'application/json',
        'x-user-id': account?.id,
        'x-user-role': account?.role
      };

      const response = await fetch('/api/inventory/allocate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          campaignId: formData.campaignId,
          locationId: formData.locationId,
          quantity: formData.quantity
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to allocate cards');
      }

      setSuccessMessage('Cards allocated successfully!');
      
      // Reset form and redirect after 2 seconds
      setTimeout(() => {
        router.push('/scratch-inventory');
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button 
          onClick={() => router.back()}
          className={styles.backButton}
        >
          ← Back
        </button>
        <div className={styles.titleSection}>
          <h1>Allocate Scratch Cards</h1>
          <p>Distribute scratch cards from your inventory to stores and campaigns</p>
        </div>
      </div>

      <div className={styles.formCard}>
        {error && <div className={styles.error}>{error}</div>}
        {successMessage && <div className={styles.successMessage}>{successMessage}</div>}
        
        <InventoryForm
          campaigns={campaigns}
          locations={locations}
          onSubmit={handleAllocate}
          onCancel={() => router.back()}
          loading={submitLoading}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit allocation page**

```bash
git add app/(dashboard)/scratch-inventory/allocate/page.js
git commit -m "feat: add allocation page with form"
```

---

## Task 9: Create scratch-inventory/tracking/page.module.css

**Files:**
- Create: `app/(dashboard)/scratch-inventory/tracking/page.module.css`

- [ ] **Step 1: Write tracking page styling**

```css
/* app/(dashboard)/scratch-inventory/tracking/page.module.css */

.container {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.backButton {
  padding: 8px 12px;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: background-color 0.2s;
}

.backButton:hover {
  background-color: #e8e8e8;
}

.titleSection h1 {
  font-size: 28px;
  font-weight: 700;
  color: #333;
  margin: 0;
}

.titleSection p {
  font-size: 14px;
  color: #666;
  margin: 4px 0 0 0;
}

.trackingCard {
  padding: 20px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.error {
  padding: 12px 16px;
  background-color: #fce4e4;
  color: #c33;
  border: 1px solid #e5bfbf;
  border-radius: 6px;
  font-size: 14px;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .container {
    background: #1a1a1a;
  }

  .backButton {
    background: #2a2a2a;
    border-color: #444;
    color: #e8e8e8;
  }

  .backButton:hover {
    background-color: #333;
  }

  .titleSection h1 {
    color: #e8e8e8;
  }

  .titleSection p {
    color: #aaa;
  }

  .trackingCard {
    background: #2a2a2a;
    border-color: #444;
  }

  .error {
    background-color: #5c2a2a;
    color: #ff9999;
    border-color: #6d3a3a;
  }
}
```

- [ ] **Step 2: Commit tracking page styling**

```bash
git add app/(dashboard)/scratch-inventory/tracking/page.module.css
git commit -m "feat: add tracking page styling"
```

---

## Task 10: Create scratch-inventory/tracking/page.js

**Files:**
- Create: `app/(dashboard)/scratch-inventory/tracking/page.js`

- [ ] **Step 1: Write tracking history page**

```jsx
'use client';
import { useEffect, useState } from 'react';
import { useAuthContext } from '@/components/auth/AuthContext';
import InventoryTracking from '@/components/inventory/InventoryTracking';
import styles from './page.module.css';

export default function TrackingPage() {
  const { account } = useAuthContext();
  const [trackingData, setTrackingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTracking = async () => {
    try {
      setLoading(true);
      setError(null);

      const headers = {
        'Content-Type': 'application/json',
        'x-user-id': account?.id,
        'x-user-role': account?.role
      };

      const response = await fetch('/api/inventory/tracking', { headers });
      if (!response.ok) {
        throw new Error('Failed to fetch tracking data');
      }
      const data = await response.json();
      setTrackingData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (account?.id) {
      fetchTracking();
    }
  }, [account?.id]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button 
          onClick={() => window.history.back()}
          className={styles.backButton}
        >
          ← Back
        </button>
        <div className={styles.titleSection}>
          <h1>Inventory Movement History</h1>
          <p>Track all scratch card allocations, transfers, and redemptions</p>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.trackingCard}>
        <InventoryTracking 
          trackingData={trackingData}
          loading={loading}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit tracking page**

```bash
git add app/(dashboard)/scratch-inventory/tracking/page.js
git commit -m "feat: add tracking history page"
```

---

## Task Summary

- **Task 1:** InventoryForm.module.css ✓
- **Task 2:** InventoryForm.js ✓
- **Task 3:** InventoryTracking.module.css ✓
- **Task 4:** InventoryTracking.js ✓
- **Task 5:** scratch-inventory/page.module.css ✓
- **Task 6:** scratch-inventory/page.js ✓
- **Task 7:** scratch-inventory/allocate/page.module.css ✓
- **Task 8:** scratch-inventory/allocate/page.js ✓
- **Task 9:** scratch-inventory/tracking/page.module.css ✓
- **Task 10:** scratch-inventory/tracking/page.js ✓

---
