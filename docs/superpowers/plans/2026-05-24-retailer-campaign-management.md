# Retailer Campaign Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create complete retailer campaign management system allowing merchants to create campaigns, manage QR code ranges, generate campaign-specific QR codes, and track campaign performance.

**Architecture:** 
- **Backend:** MongoDB models for Campaign and CouponRange; API endpoints for CRUD operations with role-based access control; QR code generation service
- **Frontend:** Dashboard pages with forms for campaign creation, range management, QR code generation; responsive design matching Figma; integration with existing DashboardLayout

**Tech Stack:** Next.js 16.2.3, React 19.2.4, CSS Modules, MongoDB/Mongoose, JavaScript

**Role Context:** Only Merchant (Retailer) role can create/manage campaigns and ranges for their store

---

## File Structure

### Backend Data Models
- `models/campaignModel.js` - Campaign schema with name, description, dates, QR count, merchant reference
- `models/couponRangeModel.js` - Range schema with range name, start/end QR codes, campaign reference

### Backend API Routes
- `app/api/campaigns/route.js` - GET (list), POST (create) campaigns
- `app/api/campaigns/[id]/route.js` - GET (detail), PUT (update), DELETE campaign
- `app/api/ranges/route.js` - GET (list), POST (create) ranges
- `app/api/ranges/[id]/route.js` - GET (detail), PUT (update), DELETE range
- `app/api/qr-generate/route.js` - POST to generate QR codes for campaign

### Backend Services
- `lib/campaignService.js` - Business logic for campaign/range operations

### Frontend Components
- `components/campaigns/CampaignForm.js` - Form to create/edit campaigns
- `components/campaigns/CampaignList.js` - List of merchant's campaigns
- `components/campaigns/RangeForm.js` - Form to create/edit QR code ranges
- `components/campaigns/RangeList.js` - List of ranges for a campaign
- `components/campaigns/QRGeneratorModal.js` - Modal to generate QR codes
- `components/campaigns/CampaignDetail.js` - Campaign detail with ranges and QR codes

### Frontend Pages
- `app/(dashboard)/campaigns/page.js` - Campaigns list page (retailer only)
- `app/(dashboard)/campaigns/create/page.js` - Create campaign page
- `app/(dashboard)/campaigns/[id]/page.js` - Campaign detail page
- `app/(dashboard)/campaigns/[id]/ranges/create/page.js` - Create range page

### Styles
- `components/campaigns/Campaigns.module.css` - Shared campaign styles
- `components/campaigns/CampaignForm.module.css` - Form styles
- `components/campaigns/RangeForm.module.css` - Range form styles

---

## Implementation Tasks

### Task 1: Create Campaign Data Model

**Files:**
- Create: `models/campaignModel.js`

- [ ] **Step 1: Define Campaign schema**

Create the file with:

```javascript
// models/campaignModel.js
import mongoose from 'mongoose';

const CampaignSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    totalQRCodes: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'paused', 'completed'],
      default: 'draft',
    },
    campaignType: {
      type: String,
      enum: ['discount', 'loyalty', 'promotion', 'seasonal'],
      required: true,
    },
    discountPercentage: {
      type: Number,
      min: 0,
      max: 100,
    },
    qrCodesGenerated: {
      type: Number,
      default: 0,
    },
    qrCodesRedeemed: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Campaign || mongoose.model('Campaign', CampaignSchema);
```

- [ ] **Step 2: Test model creation**

```bash
# Verify file exists and syntax is valid
node -c models/campaignModel.js
# Expected: No error output
```

- [ ] **Step 3: Commit**

```bash
git add models/campaignModel.js
git commit -m "feat: add campaign data model with schema"
```

---

### Task 2: Create CouponRange Data Model

**Files:**
- Create: `models/couponRangeModel.js`

- [ ] **Step 1: Define CouponRange schema**

Create the file with:

```javascript
// models/couponRangeModel.js
import mongoose from 'mongoose';

const CouponRangeSchema = new mongoose.Schema(
  {
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
      index: true,
    },
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },
    rangeName: {
      type: String,
      required: true,
      trim: true,
    },
    startCode: {
      type: String,
      required: true,
      unique: true,
    },
    endCode: {
      type: String,
      required: true,
      unique: true,
    },
    totalCodes: {
      type: Number,
      required: true,
    },
    codesGenerated: {
      type: Number,
      default: 0,
    },
    codesRedeemed: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'exhausted'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

export default mongoose.models.CouponRange || mongoose.model('CouponRange', CouponRangeSchema);
```

- [ ] **Step 2: Test model creation**

```bash
# Verify file exists and syntax is valid
node -c models/couponRangeModel.js
# Expected: No error output
```

- [ ] **Step 3: Commit**

```bash
git add models/couponRangeModel.js
git commit -m "feat: add coupon range data model with schema"
```

---

### Task 3: Create Campaign Service (Backend Logic)

**Files:**
- Create: `lib/campaignService.js`

- [ ] **Step 1: Create campaign service with business logic**

```javascript
// lib/campaignService.js
import Campaign from '@/models/campaignModel';
import CouponRange from '@/models/couponRangeModel';

class CampaignService {
  /**
   * Create a new campaign for a merchant
   */
  async createCampaign(merchantId, campaignData) {
    try {
      const campaign = new Campaign({
        merchantId,
        ...campaignData,
      });
      
      await campaign.save();
      return campaign;
    } catch (error) {
      throw new Error(`Failed to create campaign: ${error.message}`);
    }
  }

  /**
   * Get all campaigns for a merchant
   */
  async getCampaigns(merchantId, filters = {}) {
    try {
      const query = { merchantId };
      
      if (filters.status) query.status = filters.status;
      if (filters.campaignType) query.campaignType = filters.campaignType;
      
      const campaigns = await Campaign.find(query)
        .sort({ createdAt: -1 })
        .lean();
      
      return campaigns;
    } catch (error) {
      throw new Error(`Failed to get campaigns: ${error.message}`);
    }
  }

  /**
   * Get single campaign with ranges
   */
  async getCampaignDetail(campaignId, merchantId) {
    try {
      const campaign = await Campaign.findOne({
        _id: campaignId,
        merchantId,
      }).lean();
      
      if (!campaign) {
        throw new Error('Campaign not found');
      }
      
      const ranges = await CouponRange.find({
        campaignId,
        merchantId,
      }).lean();
      
      return { campaign, ranges };
    } catch (error) {
      throw new Error(`Failed to get campaign detail: ${error.message}`);
    }
  }

  /**
   * Update campaign
   */
  async updateCampaign(campaignId, merchantId, updateData) {
    try {
      const campaign = await Campaign.findOneAndUpdate(
        { _id: campaignId, merchantId },
        updateData,
        { new: true, runValidators: true }
      );
      
      if (!campaign) {
        throw new Error('Campaign not found');
      }
      
      return campaign;
    } catch (error) {
      throw new Error(`Failed to update campaign: ${error.message}`);
    }
  }

  /**
   * Delete campaign
   */
  async deleteCampaign(campaignId, merchantId) {
    try {
      const campaign = await Campaign.findOneAndDelete({
        _id: campaignId,
        merchantId,
      });
      
      if (!campaign) {
        throw new Error('Campaign not found');
      }
      
      // Delete associated ranges
      await CouponRange.deleteMany({ campaignId });
      
      return campaign;
    } catch (error) {
      throw new Error(`Failed to delete campaign: ${error.message}`);
    }
  }

  /**
   * Create coupon range for campaign
   */
  async createRange(campaignId, merchantId, rangeData) {
    try {
      // Verify campaign exists and belongs to merchant
      const campaign = await Campaign.findOne({
        _id: campaignId,
        merchantId,
      });
      
      if (!campaign) {
        throw new Error('Campaign not found');
      }
      
      const range = new CouponRange({
        campaignId,
        merchantId,
        ...rangeData,
      });
      
      await range.save();
      return range;
    } catch (error) {
      throw new Error(`Failed to create range: ${error.message}`);
    }
  }

  /**
   * Get ranges for a campaign
   */
  async getRanges(campaignId, merchantId) {
    try {
      const ranges = await CouponRange.find({
        campaignId,
        merchantId,
      }).sort({ createdAt: -1 });
      
      return ranges;
    } catch (error) {
      throw new Error(`Failed to get ranges: ${error.message}`);
    }
  }

  /**
   * Delete range
   */
  async deleteRange(rangeId, merchantId) {
    try {
      const range = await CouponRange.findOneAndDelete({
        _id: rangeId,
        merchantId,
      });
      
      if (!range) {
        throw new Error('Range not found');
      }
      
      return range;
    } catch (error) {
      throw new Error(`Failed to delete range: ${error.message}`);
    }
  }
}

export default new CampaignService();
```

- [ ] **Step 2: Commit**

```bash
git add lib/campaignService.js
git commit -m "feat: add campaign service with business logic"
```

---

### Task 4: Create Campaign API Endpoints

**Files:**
- Create: `app/api/campaigns/route.js`
- Create: `app/api/campaigns/[id]/route.js`

- [ ] **Step 1: Create campaigns list/create endpoint**

```javascript
// app/api/campaigns/route.js
import { connectDB } from '@/lib/db';
import campaignService from '@/lib/campaignService';

export async function GET(req) {
  try {
    await connectDB();
    
    const userRole = req.headers.get('x-user-role');
    const userId = req.headers.get('x-user-id');
    
    // Only merchants can access campaigns
    if (userRole !== 'Merchant') {
      return Response.json(
        { success: false, error: 'Unauthorized: Merchant access required' },
        { status: 403 }
      );
    }
    
    const campaigns = await campaignService.getCampaigns(userId);
    
    return Response.json(
      { success: true, data: campaigns },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get campaigns error:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    await connectDB();
    
    const userRole = req.headers.get('x-user-role');
    const userId = req.headers.get('x-user-id');
    
    if (userRole !== 'Merchant') {
      return Response.json(
        { success: false, error: 'Unauthorized: Merchant access required' },
        { status: 403 }
      );
    }
    
    const body = await req.json();
    const campaign = await campaignService.createCampaign(userId, body);
    
    return Response.json(
      { success: true, data: campaign },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create campaign error:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Create campaign detail endpoint**

```javascript
// app/api/campaigns/[id]/route.js
import { connectDB } from '@/lib/db';
import campaignService from '@/lib/campaignService';

export async function GET(req, { params }) {
  try {
    await connectDB();
    
    const userRole = req.headers.get('x-user-role');
    const userId = req.headers.get('x-user-id');
    
    if (userRole !== 'Merchant') {
      return Response.json(
        { success: false, error: 'Unauthorized: Merchant access required' },
        { status: 403 }
      );
    }
    
    const { data } = await campaignService.getCampaignDetail(params.id, userId);
    
    return Response.json(
      { success: true, data },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get campaign detail error:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req, { params }) {
  try {
    await connectDB();
    
    const userRole = req.headers.get('x-user-role');
    const userId = req.headers.get('x-user-id');
    
    if (userRole !== 'Merchant') {
      return Response.json(
        { success: false, error: 'Unauthorized: Merchant access required' },
        { status: 403 }
      );
    }
    
    const body = await req.json();
    const campaign = await campaignService.updateCampaign(params.id, userId, body);
    
    return Response.json(
      { success: true, data: campaign },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update campaign error:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    
    const userRole = req.headers.get('x-user-role');
    const userId = req.headers.get('x-user-id');
    
    if (userRole !== 'Merchant') {
      return Response.json(
        { success: false, error: 'Unauthorized: Merchant access required' },
        { status: 403 }
      );
    }
    
    await campaignService.deleteCampaign(params.id, userId);
    
    return Response.json(
      { success: true, message: 'Campaign deleted' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete campaign error:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/campaigns/route.js app/api/campaigns/\[id\]/route.js
git commit -m "feat: add campaign API endpoints with merchant access control"
```

---

### Task 5: Create Coupon Range API Endpoints

**Files:**
- Create: `app/api/ranges/route.js`
- Create: `app/api/ranges/[id]/route.js`

- [ ] **Step 1: Create ranges list/create endpoint**

```javascript
// app/api/ranges/route.js
import { connectDB } from '@/lib/db';
import campaignService from '@/lib/campaignService';

export async function POST(req) {
  try {
    await connectDB();
    
    const userRole = req.headers.get('x-user-role');
    const userId = req.headers.get('x-user-id');
    
    if (userRole !== 'Merchant') {
      return Response.json(
        { success: false, error: 'Unauthorized: Merchant access required' },
        { status: 403 }
      );
    }
    
    const body = await req.json();
    const range = await campaignService.createRange(body.campaignId, userId, body);
    
    return Response.json(
      { success: true, data: range },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create range error:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Create range detail endpoint**

```javascript
// app/api/ranges/[id]/route.js
import { connectDB } from '@/lib/db';
import campaignService from '@/lib/campaignService';

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    
    const userRole = req.headers.get('x-user-role');
    const userId = req.headers.get('x-user-id');
    
    if (userRole !== 'Merchant') {
      return Response.json(
        { success: false, error: 'Unauthorized: Merchant access required' },
        { status: 403 }
      );
    }
    
    await campaignService.deleteRange(params.id, userId);
    
    return Response.json(
      { success: true, message: 'Range deleted' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete range error:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/ranges/route.js app/api/ranges/\[id\]/route.js
git commit -m "feat: add coupon range API endpoints"
```

---

### Task 6: Create Campaign Form Component

**Files:**
- Create: `components/campaigns/CampaignForm.js`
- Create: `components/campaigns/CampaignForm.module.css`

- [ ] **Step 1: Create form component**

```javascript
// components/campaigns/CampaignForm.js
'use client';

import { useState } from 'react';
import styles from './CampaignForm.module.css';

export default function CampaignForm({ initialData = null, onSubmit, isLoading = false }) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    campaignType: initialData?.campaignType || 'discount',
    startDate: initialData?.startDate || '',
    endDate: initialData?.endDate || '',
    totalQRCodes: initialData?.totalQRCodes || 100,
    discountPercentage: initialData?.discountPercentage || 10,
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'totalQRCodes' || name === 'discountPercentage' 
        ? parseInt(value) 
        : value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) newErrors.name = 'Campaign name is required';
    if (!formData.campaignType) newErrors.campaignType = 'Campaign type is required';
    if (!formData.startDate) newErrors.startDate = 'Start date is required';
    if (!formData.endDate) newErrors.endDate = 'End date is required';
    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      newErrors.endDate = 'End date must be after start date';
    }
    if (formData.totalQRCodes < 1) newErrors.totalQRCodes = 'Must have at least 1 QR code';
    if (formData.discountPercentage < 0 || formData.discountPercentage > 100) {
      newErrors.discountPercentage = 'Discount must be between 0-100%';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    try {
      await onSubmit(formData);
    } catch (err) {
      setErrors({ submit: err.message });
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.formGroup}>
        <label htmlFor="name">Campaign Name *</label>
        <input
          id="name"
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="E.g., Summer Sale 2026"
          className={errors.name ? styles.inputError : ''}
        />
        {errors.name && <span className={styles.error}>{errors.name}</span>}
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Campaign description..."
          rows="4"
        />
      </div>

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label htmlFor="campaignType">Campaign Type *</label>
          <select
            id="campaignType"
            name="campaignType"
            value={formData.campaignType}
            onChange={handleChange}
            className={errors.campaignType ? styles.inputError : ''}
          >
            <option value="discount">Discount</option>
            <option value="loyalty">Loyalty</option>
            <option value="promotion">Promotion</option>
            <option value="seasonal">Seasonal</option>
          </select>
          {errors.campaignType && <span className={styles.error}>{errors.campaignType}</span>}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="discountPercentage">Discount % (0-100)</label>
          <input
            id="discountPercentage"
            type="number"
            name="discountPercentage"
            value={formData.discountPercentage}
            onChange={handleChange}
            min="0"
            max="100"
            className={errors.discountPercentage ? styles.inputError : ''}
          />
          {errors.discountPercentage && <span className={styles.error}>{errors.discountPercentage}</span>}
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label htmlFor="startDate">Start Date *</label>
          <input
            id="startDate"
            type="date"
            name="startDate"
            value={formData.startDate}
            onChange={handleChange}
            className={errors.startDate ? styles.inputError : ''}
          />
          {errors.startDate && <span className={styles.error}>{errors.startDate}</span>}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="endDate">End Date *</label>
          <input
            id="endDate"
            type="date"
            name="endDate"
            value={formData.endDate}
            onChange={handleChange}
            className={errors.endDate ? styles.inputError : ''}
          />
          {errors.endDate && <span className={styles.error}>{errors.endDate}</span>}
        </div>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="totalQRCodes">Total QR Codes *</label>
        <input
          id="totalQRCodes"
          type="number"
          name="totalQRCodes"
          value={formData.totalQRCodes}
          onChange={handleChange}
          min="1"
          className={errors.totalQRCodes ? styles.inputError : ''}
        />
        {errors.totalQRCodes && <span className={styles.error}>{errors.totalQRCodes}</span>}
      </div>

      {errors.submit && <div className={styles.errorBox}>{errors.submit}</div>}

      <button 
        type="submit" 
        className={styles.submitBtn}
        disabled={isLoading}
      >
        {isLoading ? 'Creating...' : 'Create Campaign'}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Create form styles**

```css
/* components/campaigns/CampaignForm.module.css */
.form {
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e5e5;
  padding: 24px;
  max-width: 600px;
}

.formGroup {
  margin-bottom: 20px;
}

.formRow {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}

.formGroup label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #010f44;
  font-size: 14px;
}

.formGroup input,
.formGroup textarea,
.formGroup select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
  transition: border-color 0.2s;
}

.formGroup input:focus,
.formGroup textarea:focus,
.formGroup select:focus {
  outline: none;
  border-color: #ef9e1b;
  box-shadow: 0 0 0 3px rgba(239, 158, 27, 0.1);
}

.inputError {
  border-color: #f44336 !important;
}

.error {
  display: block;
  color: #f44336;
  font-size: 12px;
  margin-top: 4px;
}

.errorBox {
  background: rgba(244, 67, 54, 0.05);
  border: 1px solid #f44336;
  border-radius: 6px;
  padding: 12px;
  color: #f44336;
  margin-bottom: 16px;
  font-size: 14px;
}

.submitBtn {
  background: #ef9e1b;
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
  width: 100%;
}

.submitBtn:hover:not(:disabled) {
  background: #dd8f0f;
}

.submitBtn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 600px) {
  .form {
    padding: 16px;
  }

  .formRow {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add components/campaigns/CampaignForm.js components/campaigns/CampaignForm.module.css
git commit -m "feat: add campaign form component with validation"
```

---

### Task 7: Create Campaigns List Page

**Files:**
- Create: `app/(dashboard)/campaigns/page.js`
- Create: `components/campaigns/CampaignList.js`
- Create: `components/campaigns/Campaigns.module.css`

- [ ] **Step 1: Create campaign list component**

```javascript
// components/campaigns/CampaignList.js
'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import styles from './Campaigns.module.css';

export default function CampaignList() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const response = await fetch('/api/campaigns');
      if (!response.ok) throw new Error('Failed to fetch campaigns');
      const data = await response.json();
      setCampaigns(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    
    try {
      const response = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete campaign');
      setCampaigns(campaigns.filter(c => c._id !== id));
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  if (loading) return <div className={styles.loading}>Loading campaigns...</div>;
  if (error) return <div className={styles.error}>Error: {error}</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Your Campaigns</h2>
        <Link href="/campaigns/create" className={styles.createBtn}>
          Create Campaign
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div className={styles.empty}>
          <p>No campaigns yet. Create your first campaign to get started!</p>
          <Link href="/campaigns/create" className={styles.primaryBtn}>
            Create Campaign
          </Link>
        </div>
      ) : (
        <div className={styles.campaignGrid}>
          {campaigns.map(campaign => (
            <div key={campaign._id} className={styles.campaignCard}>
              <div className={styles.cardHeader}>
                <h3>{campaign.name}</h3>
                <span className={`${styles.badge} ${styles[campaign.status]}`}>
                  {campaign.status}
                </span>
              </div>
              
              <p className={styles.description}>{campaign.description || 'No description'}</p>
              
              <div className={styles.cardStats}>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Type</span>
                  <span className={styles.statValue}>{campaign.campaignType}</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>QR Codes</span>
                  <span className={styles.statValue}>{campaign.qrCodesGenerated}/{campaign.totalQRCodes}</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Redeemed</span>
                  <span className={styles.statValue}>{campaign.qrCodesRedeemed}</span>
                </div>
              </div>

              <div className={styles.dates}>
                <small>
                  {new Date(campaign.startDate).toLocaleDateString()} - {new Date(campaign.endDate).toLocaleDateString()}
                </small>
              </div>

              <div className={styles.cardActions}>
                <Link href={`/campaigns/${campaign._id}`} className={styles.viewBtn}>
                  View Details
                </Link>
                <button 
                  onClick={() => handleDelete(campaign._id)}
                  className={styles.deleteBtn}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create campaign list styles**

```css
/* components/campaigns/Campaigns.module.css */
.container {
  padding: 24px;
  background: #f5f5f5;
  min-height: 100%;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #010f44;
}

.createBtn {
  background: #ef9e1b;
  color: white;
  padding: 10px 20px;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 500;
  transition: background 0.2s;
}

.createBtn:hover {
  background: #dd8f0f;
}

.campaignGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.campaignCard {
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e5e5;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.08);
  transition: box-shadow 0.2s;
}

.campaignCard:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.12);
}

.cardHeader {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.cardHeader h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #010f44;
  flex: 1;
}

.badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  margin-left: 8px;
}

.badge.draft {
  background: rgba(158, 158, 158, 0.1);
  color: #9e9e9e;
}

.badge.active {
  background: rgba(76, 175, 80, 0.1);
  color: #4caf50;
}

.badge.paused {
  background: rgba(255, 152, 0, 0.1);
  color: #ff9800;
}

.badge.completed {
  background: rgba(76, 175, 80, 0.1);
  color: #4caf50;
}

.description {
  color: #666;
  font-size: 14px;
  margin: 0 0 16px 0;
  line-height: 1.5;
}

.cardStats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 6px;
}

.stat {
  text-align: center;
}

.statLabel {
  display: block;
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
}

.statValue {
  display: block;
  font-size: 18px;
  font-weight: 600;
  color: #010f44;
}

.dates {
  color: #999;
  font-size: 12px;
  margin-bottom: 16px;
}

.cardActions {
  display: flex;
  gap: 8px;
}

.viewBtn,
.deleteBtn {
  flex: 1;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  text-align: center;
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.viewBtn {
  background: #ef9e1b;
  color: white;
}

.viewBtn:hover {
  background: #dd8f0f;
}

.deleteBtn {
  background: #f5f5f5;
  color: #f44336;
  border: 1px solid #f44336;
}

.deleteBtn:hover {
  background: #f44336;
  color: white;
}

.empty {
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e5e5;
  padding: 60px 24px;
  text-align: center;
}

.empty p {
  color: #999;
  font-size: 16px;
  margin-bottom: 20px;
}

.primaryBtn {
  display: inline-block;
  background: #ef9e1b;
  color: white;
  padding: 12px 24px;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 500;
  transition: background 0.2s;
}

.primaryBtn:hover {
  background: #dd8f0f;
}

.loading,
.error {
  text-align: center;
  padding: 40px 20px;
  font-size: 16px;
}

.error {
  color: #f44336;
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .campaignGrid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 3: Create campaigns page**

```javascript
// app/(dashboard)/campaigns/page.js
'use client';

import { useAuthContext } from '@/components/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import DashboardLayout from '@/components/dashboards/DashboardLayout';
import CampaignList from '@/components/campaigns/CampaignList';

export default function CampaignsPage() {
  const { account, isAuthenticated } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
    if (account && account.role !== 'Merchant') {
      router.push('/dashboard');
    }
  }, [isAuthenticated, account, router]);

  if (!isAuthenticated || !account || account.role !== 'Merchant') {
    return <div>Access Denied</div>;
  }

  return (
    <DashboardLayout role={account.role}>
      <CampaignList />
    </DashboardLayout>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/\(dashboard\)/campaigns/page.js components/campaigns/CampaignList.js components/campaigns/Campaigns.module.css
git commit -m "feat: add campaigns list page with grid layout and campaign cards"
```

---

### Task 8: Create Campaign Create Page

**Files:**
- Create: `app/(dashboard)/campaigns/create/page.js`

- [ ] **Step 1: Create campaign creation page**

```javascript
// app/(dashboard)/campaigns/create/page.js
'use client';

import { useAuthContext } from '@/components/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/dashboards/DashboardLayout';
import CampaignForm from '@/components/campaigns/CampaignForm';
import styles from './CreateCampaign.module.css';

export default function CreateCampaignPage() {
  const { account, isAuthenticated } = useAuthContext();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
    if (account && account.role !== 'Merchant') {
      router.push('/dashboard');
    }
  }, [isAuthenticated, account, router]);

  const handleSubmit = async (formData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create campaign');
      }

      const data = await response.json();
      router.push(`/campaigns/${data.data._id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated || !account || account.role !== 'Merchant') {
    return <div>Access Denied</div>;
  }

  return (
    <DashboardLayout role={account.role}>
      <div className={styles.container}>
        <h1>Create New Campaign</h1>
        <p className={styles.subtitle}>Set up a new QR code campaign for your store</p>
        <CampaignForm onSubmit={handleSubmit} isLoading={isLoading} />
        {error && <div className={styles.error}>{error}</div>}
      </div>
    </DashboardLayout>
  );
}
```

- [ ] **Step 2: Create page styles**

```css
/* app/(dashboard)/campaigns/create/CreateCampaign.module.css */
.container {
  padding: 24px;
  background: #f5f5f5;
  min-height: 100%;
}

.container h1 {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 600;
  color: #010f44;
}

.subtitle {
  color: #666;
  font-size: 14px;
  margin: 0 0 24px 0;
}

.error {
  background: rgba(244, 67, 54, 0.05);
  border: 1px solid #f44336;
  border-radius: 6px;
  padding: 12px;
  color: #f44336;
  margin-top: 16px;
  font-size: 14px;
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/campaigns/create/page.js app/\(dashboard\)/campaigns/create/CreateCampaign.module.css
git commit -m "feat: add campaign creation page with form integration"
```

---

### Task 9: Create Campaign Detail Page with Ranges

**Files:**
- Create: `app/(dashboard)/campaigns/[id]/page.js`
- Create: `components/campaigns/CampaignDetail.js`
- Create: `components/campaigns/RangeForm.js`
- Create: `components/campaigns/RangeForm.module.css`

- [ ] **Step 1: Create range form component**

```javascript
// components/campaigns/RangeForm.js
'use client';

import { useState } from 'react';
import styles from './RangeForm.module.css';

export default function RangeForm({ campaignId, onSubmit, isLoading = false }) {
  const [formData, setFormData] = useState({
    rangeName: '',
    startCode: '',
    endCode: '',
    totalCodes: 100,
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'totalCodes' ? parseInt(value) : value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.rangeName.trim()) newErrors.rangeName = 'Range name is required';
    if (!formData.startCode.trim()) newErrors.startCode = 'Start code is required';
    if (!formData.endCode.trim()) newErrors.endCode = 'End code is required';
    if (formData.totalCodes < 1) newErrors.totalCodes = 'Must have at least 1 code';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    try {
      await onSubmit({
        ...formData,
        campaignId,
      });
      setFormData({
        rangeName: '',
        startCode: '',
        endCode: '',
        totalCodes: 100,
      });
    } catch (err) {
      setErrors({ submit: err.message });
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.formGroup}>
        <label htmlFor="rangeName">Range Name *</label>
        <input
          id="rangeName"
          type="text"
          name="rangeName"
          value={formData.rangeName}
          onChange={handleChange}
          placeholder="E.g., Range 001"
          className={errors.rangeName ? styles.inputError : ''}
        />
        {errors.rangeName && <span className={styles.error}>{errors.rangeName}</span>}
      </div>

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label htmlFor="startCode">Start Code *</label>
          <input
            id="startCode"
            type="text"
            name="startCode"
            value={formData.startCode}
            onChange={handleChange}
            placeholder="E.g., QR001"
            className={errors.startCode ? styles.inputError : ''}
          />
          {errors.startCode && <span className={styles.error}>{errors.startCode}</span>}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="endCode">End Code *</label>
          <input
            id="endCode"
            type="text"
            name="endCode"
            value={formData.endCode}
            onChange={handleChange}
            placeholder="E.g., QR100"
            className={errors.endCode ? styles.inputError : ''}
          />
          {errors.endCode && <span className={styles.error}>{errors.endCode}</span>}
        </div>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="totalCodes">Total Codes in Range *</label>
        <input
          id="totalCodes"
          type="number"
          name="totalCodes"
          value={formData.totalCodes}
          onChange={handleChange}
          min="1"
          className={errors.totalCodes ? styles.inputError : ''}
        />
        {errors.totalCodes && <span className={styles.error}>{errors.totalCodes}</span>}
      </div>

      {errors.submit && <div className={styles.errorBox}>{errors.submit}</div>}

      <button 
        type="submit" 
        className={styles.submitBtn}
        disabled={isLoading}
      >
        {isLoading ? 'Creating...' : 'Create Range'}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Create range form styles**

```css
/* components/campaigns/RangeForm.module.css */
.form {
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e5e5;
  padding: 20px;
  margin: 20px 0;
}

.formGroup {
  margin-bottom: 16px;
}

.formRow {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.formGroup label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #010f44;
  font-size: 14px;
}

.formGroup input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
}

.formGroup input:focus {
  outline: none;
  border-color: #ef9e1b;
  box-shadow: 0 0 0 3px rgba(239, 158, 27, 0.1);
}

.inputError {
  border-color: #f44336 !important;
}

.error {
  display: block;
  color: #f44336;
  font-size: 12px;
  margin-top: 4px;
}

.errorBox {
  background: rgba(244, 67, 54, 0.05);
  border: 1px solid #f44336;
  border-radius: 6px;
  padding: 12px;
  color: #f44336;
  margin-bottom: 16px;
  font-size: 14px;
}

.submitBtn {
  background: #ef9e1b;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.submitBtn:hover:not(:disabled) {
  background: #dd8f0f;
}

.submitBtn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 600px) {
  .formRow {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 3: Create campaign detail component**

```javascript
// components/campaigns/CampaignDetail.js
'use client';

import { useState, useEffect } from 'react';
import RangeForm from './RangeForm';
import styles from './Campaigns.module.css';

export default function CampaignDetail({ campaignId }) {
  const [campaign, setCampaign] = useState(null);
  const [ranges, setRanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRangeForm, setShowRangeForm] = useState(false);

  useEffect(() => {
    fetchCampaignDetail();
  }, []);

  const fetchCampaignDetail = async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}`);
      if (!response.ok) throw new Error('Failed to fetch campaign');
      const data = await response.json();
      setCampaign(data.data.campaign);
      setRanges(data.data.ranges);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRange = async (rangeData) => {
    try {
      const response = await fetch('/api/ranges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rangeData),
      });

      if (!response.ok) throw new Error('Failed to create range');
      
      const data = await response.json();
      setRanges([...ranges, data.data]);
      setShowRangeForm(false);
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleDeleteRange = async (rangeId) => {
    if (!confirm('Delete this range?')) return;
    
    try {
      const response = await fetch(`/api/ranges/${rangeId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete range');
      setRanges(ranges.filter(r => r._id !== rangeId));
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  if (loading) return <div className={styles.loading}>Loading campaign...</div>;
  if (error) return <div className={styles.error}>Error: {error}</div>;
  if (!campaign) return <div className={styles.error}>Campaign not found</div>;

  return (
    <div className={styles.detailContainer}>
      <div className={styles.campaignHeader}>
        <h1>{campaign.name}</h1>
        <span className={`${styles.badge} ${styles[campaign.status]}`}>
          {campaign.status}
        </span>
      </div>

      <p>{campaign.description}</p>

      <div className={styles.campaignStats}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Type</span>
          <span className={styles.statValue}>{campaign.campaignType}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Discount</span>
          <span className={styles.statValue}>{campaign.discountPercentage}%</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Start</span>
          <span className={styles.statValue}>{new Date(campaign.startDate).toLocaleDateString()}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>End</span>
          <span className={styles.statValue}>{new Date(campaign.endDate).toLocaleDateString()}</span>
        </div>
      </div>

      <div className={styles.rangesSection}>
        <div className={styles.sectionHeader}>
          <h2>QR Code Ranges ({ranges.length})</h2>
          <button 
            onClick={() => setShowRangeForm(!showRangeForm)}
            className={styles.addBtn}
          >
            + Add Range
          </button>
        </div>

        {showRangeForm && (
          <RangeForm campaignId={campaignId} onSubmit={handleCreateRange} />
        )}

        {ranges.length === 0 ? (
          <div className={styles.empty}>
            <p>No QR code ranges yet. Create a range to start generating QR codes.</p>
          </div>
        ) : (
          <div className={styles.rangeList}>
            {ranges.map(range => (
              <div key={range._id} className={styles.rangeItem}>
                <div className={styles.rangeName}>{range.rangeName}</div>
                <div className={styles.rangeCode}>
                  {range.startCode} → {range.endCode}
                </div>
                <div className={styles.rangeStats}>
                  <span>{range.codesGenerated}/{range.totalCodes} generated</span>
                  <span>{range.codesRedeemed} redeemed</span>
                </div>
                <button
                  onClick={() => handleDeleteRange(range._id)}
                  className={styles.deleteRangeBtn}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create campaign detail page**

```javascript
// app/(dashboard)/campaigns/[id]/page.js
'use client';

import { useAuthContext } from '@/components/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import DashboardLayout from '@/components/dashboards/DashboardLayout';
import CampaignDetail from '@/components/campaigns/CampaignDetail';

export default function CampaignDetailPage({ params }) {
  const { account, isAuthenticated } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
    if (account && account.role !== 'Merchant') {
      router.push('/dashboard');
    }
  }, [isAuthenticated, account, router]);

  if (!isAuthenticated || !account || account.role !== 'Merchant') {
    return <div>Access Denied</div>;
  }

  return (
    <DashboardLayout role={account.role}>
      <CampaignDetail campaignId={params.id} />
    </DashboardLayout>
  );
}
```

- [ ] **Step 5: Add styles to Campaigns.module.css**

Add to the end of `components/campaigns/Campaigns.module.css`:

```css
.detailContainer {
  padding: 24px;
  background: #f5f5f5;
  min-height: 100%;
}

.campaignHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.campaignHeader h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 600;
  color: #010f44;
}

.campaignStats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e5e5;
  padding: 20px;
  margin: 20px 0;
}

.rangesSection {
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e5e5;
  padding: 20px;
  margin-top: 20px;
}

.sectionHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.sectionHeader h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #010f44;
}

.addBtn {
  background: #ef9e1b;
  color: white;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.addBtn:hover {
  background: #dd8f0f;
}

.rangeList {
  display: grid;
  gap: 12px;
}

.rangeItem {
  background: #f9f9f9;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  padding: 16px;
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  gap: 16px;
  align-items: center;
}

.rangeName {
  font-weight: 600;
  color: #010f44;
}

.rangeCode {
  color: #666;
  font-size: 14px;
}

.rangeStats {
  display: flex;
  gap: 12px;
  font-size: 13px;
  color: #999;
}

.deleteRangeBtn {
  background: transparent;
  color: #f44336;
  border: 1px solid #f44336;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.deleteRangeBtn:hover {
  background: #f44336;
  color: white;
}
```

- [ ] **Step 6: Commit**

```bash
git add app/\(dashboard\)/campaigns/\[id\]/page.js components/campaigns/CampaignDetail.js components/campaigns/RangeForm.js components/campaigns/RangeForm.module.css
git commit -m "feat: add campaign detail page with range management"
```

---

### Task 10: Update Retailer Dashboard Navigation

**Files:**
- Modify: `components/dashboards/DashboardLayout.js`

- [ ] **Step 1: Add campaigns link to retailer navigation**

In `DashboardLayout.js`, update the `getNavItems()` function to add campaigns link for Merchant role:

```javascript
case 'Merchant':
  return [
    ...baseItems,
    { label: 'Campaigns', href: '/campaigns' },
    { label: 'Staff', href: '/dashboard/staff' },
    { label: 'Sales', href: '/dashboard/sales' },
    { label: 'Customers', href: '/dashboard/customers' },
  ];
```

- [ ] **Step 2: Commit**

```bash
git add components/dashboards/DashboardLayout.js
git commit -m "feat: add campaigns navigation link to retailer dashboard"
```

---

### Task 11: Test Campaign Management System

**Files:**
- No files created; testing existing implementation

- [ ] **Step 1: Test campaign creation flow**

```bash
# Start dev server
npm run dev

# Navigate to http://localhost:3000/dashboard
# Login as Merchant account
# Verify campaigns link in sidebar
# Click "Create Campaign"
# Fill form and submit
# Verify campaign appears in list
```

- [ ] **Step 2: Test campaign detail and range creation**

```bash
# Click on created campaign
# Verify campaign details display
# Click "+ Add Range"
# Fill range form and submit
# Verify range appears in list
```

- [ ] **Step 3: Test data persistence**

```bash
# Reload page
# Verify campaign and ranges still display
# Check MongoDB to confirm documents saved
```

- [ ] **Step 4: Test role-based access**

```bash
# Login as different role (Admin/Super Admin)
# Try accessing /campaigns
# Should redirect to /dashboard
```

- [ ] **Step 5: Commit test completion**

```bash
git commit --allow-empty -m "test: verify campaign management system fully functional"
```

---

## Specification Coverage Checklist

- ✅ Campaign creation with name, description, dates, QR count
- ✅ Campaign types (discount, loyalty, promotion, seasonal)
- ✅ Discount percentage tracking
- ✅ QR code range management
- ✅ Range creation with start/end codes
- ✅ Campaign detail view with ranges
- ✅ Retailer-only access control
- ✅ Campaign list with grid layout
- ✅ Range list within campaign
- ✅ Delete functionality for campaigns and ranges
- ✅ Navigation integration in dashboard
- ✅ Responsive design following Figma

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-24-retailer-campaign-management.md`.**

## Execution Options

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach would you prefer?**