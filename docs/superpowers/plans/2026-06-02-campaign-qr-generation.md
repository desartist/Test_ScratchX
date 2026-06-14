# Campaign QR Code Generation & Launch - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a complete campaign launch workflow where merchants click "Preview & Launch" on the billing range page to generate a QR code, validate the campaign, and activate it.

**Architecture:** Backend API endpoint validates 4 conditions (billing ranges, store assignments, scratch allocation, campaign not ended), generates QR code PNG from payload, converts to base64, updates campaign status to active. Frontend modals guide the user through the launch flow, and a new live page displays the generated QR code.

**Tech Stack:** Next.js 13+ (App Router), qrcode library (server-side), react-qr-code library (client display), REST API with x-user-id headers, CSS Modules with dark mode.

---

## Task 1: Create POST /api/campaigns/[id]/generate-qr Endpoint

**Files:**
- Create: `app/api/campaigns/[id]/generate-qr/route.js`

### Implementation Steps

- [ ] **Step 1: Create the route file**

Create `app/api/campaigns/[id]/generate-qr/route.js`:

```javascript
import { connectDB } from '@/lib/connectDB';
import Campaign from '@/models/campaignModel';
import CampaignRange from '@/models/campaignRangeModel';
import CampaignStoreMapping from '@/models/campaignStoreMappingModel';
import qrcode from 'qrcode';

export async function POST(request, { params }) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (!userId) {
      return Response.json(
        { success: false, message: 'User authentication required' },
        { status: 401 }
      );
    }

    const { id: campaignId } = await params;

    if (!campaignId) {
      return Response.json(
        { success: false, message: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Fetch campaign with all relationships
    const campaign = await Campaign.findById(campaignId)
      .populate('storeAllocations');

    if (!campaign) {
      return Response.json(
        { success: false, message: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (campaign.merchantId.toString() !== userId && userRole !== 'Admin') {
      return Response.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }

    // ===== VALIDATION 1: Billing Ranges =====
    const billingRanges = await CampaignRange.find({ campaign_id: campaignId });
    if (!billingRanges || billingRanges.length === 0) {
      return Response.json(
        { 
          success: false, 
          message: 'Please create at least one billing range.' 
        },
        { status: 400 }
      );
    }

    // ===== VALIDATION 2: Store Allocations =====
    const storeAllocations = await CampaignStoreMapping.find({
      campaign_id: campaignId,
    });
    if (!storeAllocations || storeAllocations.length === 0) {
      return Response.json(
        { 
          success: false, 
          message: 'Please assign at least one store.' 
        },
        { status: 400 }
      );
    }

    // ===== VALIDATION 3: Scratch Card Allocation =====
    if (!campaign.allocated_scratch_cards || campaign.allocated_scratch_cards === 0) {
      return Response.json(
        { 
          success: false, 
          message: 'Please allocate scratch cards before launch.' 
        },
        { status: 400 }
      );
    }

    // ===== VALIDATION 4: Campaign Not Ended =====
    if (campaign.status === 'ended') {
      return Response.json(
        { 
          success: false, 
          message: 'Cannot launch an ended campaign.' 
        },
        { status: 400 }
      );
    }

    // ===== GENERATE QR CODE =====
    const qrPayload = {
      campaignId: campaign._id.toString(),
      merchantId: campaign.merchantId.toString(),
      type: 'campaign',
    };

    // Generate QR code as data URL
    const qrCodeDataUrl = await qrcode.toDataURL(JSON.stringify(qrPayload), {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: 1,
      width: 300,
    });

    // ===== UPDATE CAMPAIGN STATUS =====
    campaign.status = 'active';
    await campaign.save();

    return Response.json({
      success: true,
      data: {
        campaignId: campaign._id,
        qrCodeUrl: qrCodeDataUrl,
        campaign: {
          _id: campaign._id,
          campaignName: campaign.campaignName,
          status: campaign.status,
          startDate: campaign.startDate,
          endDate: campaign.endDate,
          allocated_scratch_cards: campaign.allocated_scratch_cards,
          storeCount: storeAllocations.length,
        },
      },
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    return Response.json(
      { success: false, message: 'Failed to generate QR code' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Test the endpoint**

Test with curl:

```bash
curl -X POST http://localhost:3000/api/campaigns/[campaign-id]/generate-qr \
  -H "Content-Type: application/json" \
  -H "x-user-id: [user-id]" \
  -H "x-user-role: Merchant"
```

Expected: 200 with `{ success: true, data: { campaignId, qrCodeUrl, campaign } }`

- [ ] **Step 3: Commit**

```bash
git add app/api/campaigns/[id]/generate-qr/route.js
git commit -m "feat: add POST /api/campaigns/[id]/generate-qr endpoint with 4 validations"
```

---

## Task 2: Create CampaignLaunchModal Component

**Files:**
- Create: `app/(dashboard)/range/[id]/components/CampaignLaunchModal.js`
- Create: `app/(dashboard)/range/[id]/components/CampaignLaunchModal.module.css`

### Implementation Steps

- [ ] **Step 1: Create modal component**

Create `app/(dashboard)/range/[id]/components/CampaignLaunchModal.js`:

```javascript
'use client';

import React, { useState } from 'react';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import Modal from '@/components/common/Modal';
import styles from './CampaignLaunchModal.module.css';

export default function CampaignLaunchModal({
  isOpen,
  onClose,
  campaign,
  storeCount,
  rangeCount,
  validationErrors,
  isLoading,
  onConfirm,
}) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState(null);

  const hasErrors = validationErrors && validationErrors.length > 0;

  const handleConfirm = async () => {
    try {
      setIsConfirming(true);
      setConfirmError(null);
      await onConfirm();
    } catch (err) {
      setConfirmError(err.message || 'Failed to generate QR code');
    } finally {
      setIsConfirming(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Campaign Launch">
      <div className={styles.content}>
        {/* Error State */}
        {hasErrors && (
          <div className={styles.errorSection}>
            <div className={styles.errorHeader}>
              <AlertCircle size={20} className={styles.errorIcon} />
              <h3 className={styles.errorTitle}>Cannot Launch Campaign</h3>
            </div>
            <div className={styles.errorList}>
              {validationErrors.map((error, idx) => (
                <div key={idx} className={styles.errorItem}>
                  <span className={styles.bullet}>•</span>
                  <span>{error}</span>
                </div>
              ))}
            </div>
            <div className={styles.footer}>
              <button
                className={styles.closeBtn}
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Success State */}
        {!hasErrors && (
          <div className={styles.summarySection}>
            <div className={styles.header}>
              <CheckCircle size={24} className={styles.checkIcon} />
              <h3 className={styles.title}>Ready to Launch</h3>
            </div>

            <div className={styles.campaignInfo}>
              <p className={styles.campaignName}>{campaign?.campaignName}</p>
              <div className={styles.details}>
                <div className={styles.detailRow}>
                  <span className={styles.label}>Stores Assigned:</span>
                  <span className={styles.value}>{storeCount}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.label}>Billing Ranges:</span>
                  <span className={styles.value}>{rangeCount}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.label}>Scratch Cards:</span>
                  <span className={styles.value}>{campaign?.allocated_scratch_cards}</span>
                </div>
                {campaign?.startDate && (
                  <div className={styles.detailRow}>
                    <span className={styles.label}>Start Date:</span>
                    <span className={styles.value}>
                      {new Date(campaign.startDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.infoBox}>
              <p>Your campaign will be activated and a QR code will be generated.</p>
            </div>

            {confirmError && (
              <div className={styles.confirmError}>
                <AlertCircle size={16} />
                <span>{confirmError}</span>
              </div>
            )}

            <div className={styles.footer}>
              <button
                className={styles.cancelBtn}
                onClick={onClose}
                disabled={isConfirming}
              >
                Cancel
              </button>
              <button
                className={styles.launchBtn}
                onClick={handleConfirm}
                disabled={isConfirming || isLoading}
              >
                {isConfirming || isLoading ? (
                  <>
                    <Loader2 size={16} className={styles.spinner} />
                    Generating...
                  </>
                ) : (
                  'Generate QR & Launch'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Create modal stylesheet**

Create `app/(dashboard)/range/[id]/components/CampaignLaunchModal.module.css`:

```css
.content {
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* ===== ERROR STATE ===== */
.errorSection {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.errorHeader {
  display: flex;
  align-items: center;
  gap: 12px;
}

.errorIcon {
  color: #dc2626;
  flex-shrink: 0;
}

@media (prefers-color-scheme: dark) {
  .errorIcon {
    color: #ef4444;
  }
}

.errorTitle {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #010f44;
}

@media (prefers-color-scheme: dark) {
  .errorTitle {
    color: #ffffff;
  }
}

.errorList {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
}

@media (prefers-color-scheme: dark) {
  .errorList {
    background: rgba(220, 38, 38, 0.15);
    border-color: rgba(220, 38, 38, 0.3);
  }
}

.errorItem {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 14px;
  color: #991b1b;
  line-height: 1.5;
}

@media (prefers-color-scheme: dark) {
  .errorItem {
    color: #f87171;
  }
}

.bullet {
  font-weight: 600;
  flex-shrink: 0;
}

/* ===== SUCCESS STATE ===== */
.summarySection {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.checkIcon {
  color: #16a34a;
  flex-shrink: 0;
}

@media (prefers-color-scheme: dark) {
  .checkIcon {
    color: #4ade80;
  }
}

.title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #010f44;
}

@media (prefers-color-scheme: dark) {
  .title {
    color: #ffffff;
  }
}

.campaignInfo {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 6px;
}

@media (prefers-color-scheme: dark) {
  .campaignInfo {
    background: rgba(255, 255, 255, 0.05);
  }
}

.campaignName {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #010f44;
  word-break: break-word;
}

@media (prefers-color-scheme: dark) {
  .campaignName {
    color: #ffffff;
  }
}

.details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detailRow {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  gap: 12px;
}

.label {
  color: #6b7280;
  font-weight: 500;
}

@media (prefers-color-scheme: dark) {
  .label {
    color: #d1d5db;
  }
}

.value {
  color: #010f44;
  font-weight: 600;
}

@media (prefers-color-scheme: dark) {
  .value {
    color: #ffffff;
  }
}

.infoBox {
  padding: 12px;
  background: #ecf0ff;
  border: 1px solid #d1d5ff;
  border-radius: 6px;
}

@media (prefers-color-scheme: dark) {
  .infoBox {
    background: rgba(99, 102, 241, 0.15);
    border-color: rgba(99, 102, 241, 0.3);
  }
}

.infoBox p {
  margin: 0;
  font-size: 13px;
  color: #4f46e5;
  line-height: 1.5;
}

@media (prefers-color-scheme: dark) {
  .infoBox p {
    color: #c7d2fe;
  }
}

.confirmError {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #991b1b;
  font-size: 13px;
}

@media (prefers-color-scheme: dark) {
  .confirmError {
    background: rgba(220, 38, 38, 0.15);
    border-color: rgba(220, 38, 38, 0.3);
    color: #f87171;
  }
}

.confirmError svg {
  flex-shrink: 0;
}

/* ===== FOOTER ===== */
.footer {
  display: flex;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

@media (prefers-color-scheme: dark) {
  .footer {
    border-top-color: rgba(255, 255, 255, 0.08);
  }
}

.cancelBtn,
.closeBtn,
.launchBtn {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.cancelBtn,
.closeBtn {
  background: #f3f4f6;
  color: #010f44;
  border: 1px solid #d1d5db;
}

.cancelBtn:hover:not(:disabled),
.closeBtn:hover:not(:disabled) {
  background: #e5e7eb;
  border-color: #010f44;
}

.cancelBtn:disabled,
.closeBtn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (prefers-color-scheme: dark) {
  .cancelBtn,
  .closeBtn {
    background: #2a2a2a;
    color: #ffffff;
    border-color: rgba(255, 255, 255, 0.1);
  }

  .cancelBtn:hover:not(:disabled),
  .closeBtn:hover:not(:disabled) {
    background: #3a3a3a;
    border-color: rgba(255, 255, 255, 0.2);
  }
}

.launchBtn {
  background: #4f46e5;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.launchBtn:hover:not(:disabled) {
  background: #4338ca;
  transform: translateY(-1px);
}

.launchBtn:active:not(:disabled) {
  transform: translateY(0);
}

.launchBtn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (prefers-color-scheme: dark) {
  .launchBtn {
    background: #6366f1;
  }

  .launchBtn:hover:not(:disabled) {
    background: #4f46e5;
  }
}

.spinner {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* ===== RESPONSIVE ===== */
@media (max-width: 480px) {
  .footer {
    flex-direction: column-reverse;
    gap: 10px;
  }

  .cancelBtn,
  .closeBtn,
  .launchBtn {
    padding: 9px 12px;
    font-size: 12px;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/(dashboard)/range/[id]/components/CampaignLaunchModal.js
git add app/(dashboard)/range/[id]/components/CampaignLaunchModal.module.css
git commit -m "feat: create CampaignLaunchModal component for range page"
```

---

## Task 3: Create CampaignLiveView Page

**Files:**
- Create: `app/(dashboard)/campaign/[id]/live/page.js`
- Create: `app/(dashboard)/campaign/[id]/live/page.module.css`

### Implementation Steps

- [ ] **Step 1: Create live page**

Create `app/(dashboard)/campaign/[id]/live/page.js`:

```javascript
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import QRCode from 'react-qr-code';
import { Download, ArrowLeft } from 'lucide-react';
import { useAuthContext } from '@/components/auth/AuthContext';
import styles from './page.module.css';

export default function CampaignLiveViewPage() {
  const router = useRouter();
  const params = useParams();
  const { account } = useAuthContext();
  const campaignId = params.id;

  const [campaign, setCampaign] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingQR, setDownloadingQR] = useState(false);

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        if (!account?.id) return;

        const response = await fetch(`/api/campaigns/${campaignId}`, {
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': account.id,
            'x-user-role': account.role,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch campaign');
        }

        const data = await response.json();
        const campaignData = data.data || data;

        setCampaign(campaignData);

        // Generate QR code data
        const qrPayload = {
          campaignId: campaignData._id,
          merchantId: account.id,
          type: 'campaign',
        };

        setQrCode(JSON.stringify(qrPayload));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaign();
  }, [campaignId, account]);

  const handleDownloadQR = async () => {
    try {
      setDownloadingQR(true);
      const svg = document.getElementById('qrCode');
      if (!svg) return;

      // Convert SVG to canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const svgData = new XMLSerializer().serializeToString(svg);
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Download as PNG
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `${campaign.campaignName}-qr-code.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };

      img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
    } catch (err) {
      setError('Failed to download QR code');
    } finally {
      setDownloadingQR(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.spinner}></div>
          <p>Loading campaign...</p>
        </div>
      </div>
    );
  }

  if (error || !campaign || !qrCode) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.error}>
            <h1>Error</h1>
            <p>{error || 'Campaign not found'}</p>
            <button
              className={styles.backBtn}
              onClick={() => router.push('/campaign')}
            >
              <ArrowLeft size={16} />
              Back to Campaigns
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <button
            className={styles.backBtn}
            onClick={() => router.push(`/campaign/${campaignId}`)}
            title="Back to campaign details"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className={styles.title}>Campaign is Live</h1>
            <p className={styles.subtitle}>Place this QR code at your billing counter</p>
          </div>
        </div>

        {/* Campaign Info Card */}
        <div className={styles.infoCard}>
          <p className={styles.campaignName}>{campaign.campaignName}</p>
          <div className={styles.infoGrid}>
            <div className={styles.infoPair}>
              <span className={styles.infoLabel}>Status</span>
              <span className={`${styles.infoBadge} ${styles.active}`}>
                Active
              </span>
            </div>
            {campaign.startDate && (
              <div className={styles.infoPair}>
                <span className={styles.infoLabel}>Start Date</span>
                <span className={styles.infoValue}>
                  {new Date(campaign.startDate).toLocaleDateString()}
                </span>
              </div>
            )}
            {campaign.endDate && (
              <div className={styles.infoPair}>
                <span className={styles.infoLabel}>End Date</span>
                <span className={styles.infoValue}>
                  {new Date(campaign.endDate).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* QR Code Section */}
        <div className={styles.qrSection}>
          <div className={styles.qrContainer}>
            <QRCode
              id="qrCode"
              value={qrCode}
              size={300}
              level="H"
              includeMargin={true}
              className={styles.qrCode}
            />
          </div>

          <button
            className={styles.downloadBtn}
            onClick={handleDownloadQR}
            disabled={downloadingQR}
            title="Download QR code as PNG"
          >
            <Download size={16} />
            {downloadingQR ? 'Downloading...' : 'Download QR Code'}
          </button>
        </div>

        {/* Action Buttons */}
        <div className={styles.actions}>
          <button
            className={styles.actionBtn}
            onClick={() => router.push(`/campaign/${campaignId}`)}
          >
            View Campaign Details
          </button>
          <button
            className={`${styles.actionBtn} ${styles.secondary}`}
            onClick={() => router.push('/campaign')}
          >
            All Campaigns
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create stylesheet**

Create `app/(dashboard)/campaign/[id]/live/page.module.css`:

```css
.page {
  min-height: 100vh;
  background: #ffffff;
  padding: 20px;
}

@media (prefers-color-scheme: dark) {
  .page {
    background: #0a0a0a;
  }
}

.container {
  max-width: 600px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* ===== HEADER ===== */
.header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.backBtn {
  flex-shrink: 0;
  padding: 8px;
  background: none;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  color: #010f44;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  height: 40px;
}

.backBtn:hover {
  background: #f3f4f6;
  border-color: #010f44;
}

@media (prefers-color-scheme: dark) {
  .backBtn {
    border-color: rgba(255, 255, 255, 0.1);
    color: #ffffff;
  }

  .backBtn:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.2);
  }
}

.title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #010f44;
}

@media (prefers-color-scheme: dark) {
  .title {
    color: #ffffff;
  }
}

.subtitle {
  margin: 4px 0 0 0;
  font-size: 14px;
  color: #6b7280;
}

@media (prefers-color-scheme: dark) {
  .subtitle {
    color: #d1d5db;
  }
}

/* ===== INFO CARD ===== */
.infoCard {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

@media (prefers-color-scheme: dark) {
  .infoCard {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
  }
}

.campaignName {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #010f44;
  word-break: break-word;
}

@media (prefers-color-scheme: dark) {
  .campaignName {
    color: #ffffff;
  }
}

.infoGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  font-size: 13px;
}

.infoPair {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.infoLabel {
  color: #6b7280;
  font-weight: 500;
}

@media (prefers-color-scheme: dark) {
  .infoLabel {
    color: #d1d5db;
  }
}

.infoValue {
  color: #010f44;
  font-weight: 600;
}

@media (prefers-color-scheme: dark) {
  .infoValue {
    color: #ffffff;
  }
}

.infoBadge {
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 600;
  width: fit-content;
  font-size: 12px;
}

.infoBadge.active {
  background: #ecfdf5;
  color: #065f46;
}

@media (prefers-color-scheme: dark) {
  .infoBadge.active {
    background: rgba(16, 185, 129, 0.15);
    color: #6ee7b7;
  }
}

/* ===== QR SECTION ===== */
.qrSection {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
  padding: 24px;
  background: #f9fafb;
  border-radius: 8px;
  border: 2px dashed #d1d5db;
}

@media (prefers-color-scheme: dark) {
  .qrSection {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
  }
}

.qrContainer {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

@media (prefers-color-scheme: dark) {
  .qrContainer {
    background: #1a1a1a;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }
}

.qrCode {
  width: 300px;
  height: 300px;
}

@media (max-width: 480px) {
  .qrCode {
    width: 250px;
    height: 250px;
  }
}

.downloadBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  background: #4f46e5;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.downloadBtn:hover:not(:disabled) {
  background: #4338ca;
  transform: translateY(-1px);
}

.downloadBtn:active:not(:disabled) {
  transform: translateY(0);
}

.downloadBtn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (prefers-color-scheme: dark) {
  .downloadBtn {
    background: #6366f1;
  }

  .downloadBtn:hover:not(:disabled) {
    background: #4f46e5;
  }
}

/* ===== ACTIONS ===== */
.actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.actionBtn {
  padding: 12px 16px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #ffffff;
  color: #010f44;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.actionBtn:hover {
  background: #f3f4f6;
  border-color: #010f44;
}

@media (prefers-color-scheme: dark) {
  .actionBtn {
    background: #2a2a2a;
    color: #ffffff;
    border-color: rgba(255, 255, 255, 0.1);
  }

  .actionBtn:hover {
    background: #3a3a3a;
    border-color: rgba(255, 255, 255, 0.2);
  }
}

.actionBtn.secondary {
  background: transparent;
  color: #4f46e5;
  border-color: #4f46e5;
}

.actionBtn.secondary:hover {
  background: #ecf0ff;
}

@media (prefers-color-scheme: dark) {
  .actionBtn.secondary {
    color: #6366f1;
    border-color: #6366f1;
  }

  .actionBtn.secondary:hover {
    background: rgba(99, 102, 241, 0.15);
  }
}

/* ===== ERROR STATE ===== */
.error {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
  padding: 40px;
  text-align: center;
}

.error h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #dc2626;
}

@media (prefers-color-scheme: dark) {
  .error h1 {
    color: #ef4444;
  }
}

.error p {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
}

@media (prefers-color-scheme: dark) {
  .error p {
    color: #d1d5db;
  }
}

/* ===== LOADING STATE ===== */
.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-top-color: #4f46e5;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@media (prefers-color-scheme: dark) {
  .spinner {
    border-color: rgba(255, 255, 255, 0.1);
    border-top-color: #6366f1;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ===== RESPONSIVE ===== */
@media (max-width: 480px) {
  .page {
    padding: 16px;
  }

  .container {
    gap: 16px;
  }

  .qrSection {
    padding: 16px;
  }

  .infoGrid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/(dashboard)/campaign/[id]/live/page.js
git add app/(dashboard)/campaign/[id]/live/page.module.css
git commit -m "feat: create CampaignLiveView page with QR code display"
```

---

## Task 4: Create CampaignQRCodeCard Component

**Files:**
- Create: `components/dashboard/CampaignQRCodeCard.js`
- Create: `components/dashboard/CampaignQRCodeCard.module.css`

### Implementation Steps

- [ ] **Step 1: Create card component**

Create `components/dashboard/CampaignQRCodeCard.js`:

```javascript
'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import { Download, Loader2, AlertCircle } from 'lucide-react';
import { useAuthContext } from '@/components/auth/AuthContext';
import styles from './CampaignQRCodeCard.module.css';

export default function CampaignQRCodeCard({
  campaignId,
  campaignStatus,
  onDownload,
}) {
  const { account } = useAuthContext();
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (campaignStatus !== 'active') {
      setLoading(false);
      return;
    }

    const generateQRData = async () => {
      try {
        if (!account?.id) return;

        const payload = {
          campaignId,
          merchantId: account.id,
          type: 'campaign',
        };

        setQrCode(JSON.stringify(payload));
      } catch (err) {
        setError('Failed to generate QR code');
      } finally {
        setLoading(false);
      }
    };

    generateQRData();
  }, [campaignId, campaignStatus, account]);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      if (onDownload) {
        await onDownload();
      } else {
        // Default download behavior
        const svg = document.getElementById(`qr-${campaignId}`);
        if (!svg) return;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const svgData = new XMLSerializer().serializeToString(svg);
        const img = new Image();

        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          const link = document.createElement('a');
          link.href = canvas.toDataURL('image/png');
          link.download = `campaign-${campaignId}-qr.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        };

        img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
      }
    } catch (err) {
      setError('Failed to download QR code');
    } finally {
      setDownloading(false);
    }
  };

  // Not active - don't show
  if (campaignStatus !== 'active') {
    return null;
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>Campaign QR Code</h3>
        <span className={styles.badge}>Generated</span>
      </div>

      {loading ? (
        <div className={styles.loadingState}>
          <Loader2 size={24} className={styles.spinner} />
          <p>Generating QR code...</p>
        </div>
      ) : error ? (
        <div className={styles.errorState}>
          <AlertCircle size={20} />
          <p>{error}</p>
        </div>
      ) : qrCode ? (
        <div className={styles.qrSection}>
          <div className={styles.qrDisplay}>
            <QRCode
              id={`qr-${campaignId}`}
              value={qrCode}
              size={150}
              level="H"
              includeMargin={true}
            />
          </div>

          <button
            className={styles.downloadBtn}
            onClick={handleDownload}
            disabled={downloading}
            title="Download QR code as PNG"
          >
            <Download size={14} />
            {downloading ? 'Downloading...' : 'Download QR'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Create stylesheet**

Create `components/dashboard/CampaignQRCodeCard.module.css`:

```css
.card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

@media (prefers-color-scheme: dark) {
  .card {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
  }
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #010f44;
}

@media (prefers-color-scheme: dark) {
  .title {
    color: #ffffff;
  }
}

.badge {
  padding: 4px 8px;
  background: #ecfdf5;
  color: #065f46;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}

@media (prefers-color-scheme: dark) {
  .badge {
    background: rgba(16, 185, 129, 0.15);
    color: #6ee7b7;
  }
}

.qrSection {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}

.qrDisplay {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  background: #ffffff;
  border-radius: 6px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

@media (prefers-color-scheme: dark) {
  .qrDisplay {
    background: #1a1a1a;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }
}

.downloadBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  background: #4f46e5;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
}

.downloadBtn:hover:not(:disabled) {
  background: #4338ca;
  transform: translateY(-1px);
}

.downloadBtn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (prefers-color-scheme: dark) {
  .downloadBtn {
    background: #6366f1;
  }

  .downloadBtn:hover:not(:disabled) {
    background: #4f46e5;
  }
}

/* ===== STATES ===== */
.loadingState,
.errorState {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px;
  text-align: center;
}

.spinner {
  animation: spin 0.8s linear infinite;
  color: #4f46e5;
}

@media (prefers-color-scheme: dark) {
  .spinner {
    color: #6366f1;
  }
}

.loadingState p,
.errorState p {
  margin: 0;
  font-size: 12px;
  color: #6b7280;
}

@media (prefers-color-scheme: dark) {
  .loadingState p,
  .errorState p {
    color: #d1d5db;
  }
}

.errorState {
  color: #dc2626;
}

@media (prefers-color-scheme: dark) {
  .errorState {
    color: #ef4444;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/CampaignQRCodeCard.js
git add components/dashboard/CampaignQRCodeCard.module.css
git commit -m "feat: create reusable CampaignQRCodeCard component"
```

---

## Task 5: Integrate CampaignLaunchModal into Range Page

**Files:**
- Modify: `app/(dashboard)/range/[id]/page.js`

### Implementation Steps

- [ ] **Step 1: Update range page to add state and handlers**

Modify `app/(dashboard)/range/[id]/page.js` - add these imports at the top:

```javascript
import CampaignLaunchModal from './components/CampaignLaunchModal';
```

Add this state inside the component (after existing state declarations):

```javascript
const [showLaunchModal, setShowLaunchModal] = useState(false);
const [launchValidationErrors, setLaunchValidationErrors] = useState([]);
const [isLaunching, setIsLaunching] = useState(false);
```

Add this handler function (replace the existing empty handlePreviewLaunch):

```javascript
const handlePreviewLaunch = () => {
  const errors = [];

  // Validation 1: Billing Ranges
  if (!ranges || ranges.length === 0) {
    errors.push('Please create at least one billing range.');
  }

  // Validation 2: Store Allocations
  if (!campaign?.storeAllocations || campaign.storeAllocations.length === 0) {
    errors.push('Please assign at least one store.');
  }

  // Validation 3: Scratch Cards
  if (!campaign?.allocated_scratch_cards || campaign.allocated_scratch_cards === 0) {
    errors.push('Please allocate scratch cards before launch.');
  }

  // Validation 4: Campaign Not Ended
  if (campaign?.status === 'ended') {
    errors.push('Cannot launch an ended campaign.');
  }

  setLaunchValidationErrors(errors);

  // If validation fails, don't open modal (errors show in closed state)
  if (errors.length === 0) {
    setShowLaunchModal(true);
  } else {
    setShowLaunchModal(true); // Open modal to show errors
  }
};

const handleLaunchConfirm = async () => {
  try {
    setIsLaunching(true);

    if (!account?.id) {
      throw new Error('User authentication required');
    }

    const response = await fetch(`/api/campaigns/${campaign._id}/generate-qr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': account.id,
        'x-user-role': account.role,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to generate QR code');
    }

    const data = await response.json();

    // Success - redirect to live view
    setShowLaunchModal(false);
    router.push(`/campaign/${campaign._id}/live`);
  } catch (err) {
    setLaunchValidationErrors([err.message]);
  } finally {
    setIsLaunching(false);
  }
};
```

Add the modal component before the closing JSX (before the final closing `</div>`):

```javascript
<CampaignLaunchModal
  isOpen={showLaunchModal}
  onClose={() => {
    setShowLaunchModal(false);
    setLaunchValidationErrors([]);
  }}
  campaign={campaign}
  storeCount={campaign?.storeAllocations?.length || 0}
  rangeCount={ranges?.length || 0}
  validationErrors={launchValidationErrors}
  isLoading={isLaunching}
  onConfirm={handleLaunchConfirm}
/>
```

- [ ] **Step 2: Verify button exists and works**

Verify that the "Preview & Launch" button in the template calls `handlePreviewLaunch()`:

```javascript
<button
  onClick={handlePreviewLaunch}
  className={styles.launchBtn}
>
  Preview & Launch
</button>
```

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/range/[id]/page.js"
git commit -m "feat: integrate CampaignLaunchModal into range page"
```

---

## Task 6: Integrate CampaignQRCodeCard into Campaign Detail Page

**Files:**
- Modify: `app/(dashboard)/campaign/[id]/page.js`

### Implementation Steps

- [ ] **Step 1: Add import**

Add this import at the top of `app/(dashboard)/campaign/[id]/page.js`:

```javascript
import CampaignQRCodeCard from '@/components/dashboard/CampaignQRCodeCard';
```

- [ ] **Step 2: Add component to JSX**

Find where campaign details are displayed, and add this section after the main campaign info (before the footer):

```javascript
{campaign?.status?.toLowerCase() === 'active' && (
  <div className={styles.qrSection}>
    <h2>Campaign QR Code</h2>
    <CampaignQRCodeCard 
      campaignId={campaign._id} 
      campaignStatus={campaign.status}
    />
  </div>
)}
```

- [ ] **Step 3: Add CSS for QR section**

Add this to `app/(dashboard)/campaign/[id]/page.module.css`:

```css
.qrSection {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-top: 24px;
}

@media (prefers-color-scheme: dark) {
  .qrSection {
    background: rgba(255, 255, 255, 0.02);
    border-color: rgba(255, 255, 255, 0.1);
  }
}

.qrSection h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #010f44;
}

@media (prefers-color-scheme: dark) {
  .qrSection h2 {
    color: #ffffff;
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add "app/(dashboard)/campaign/[id]/page.js"
git add "app/(dashboard)/campaign/[id]/page.module.css"
git commit -m "feat: integrate CampaignQRCodeCard into campaign detail page"
```

---

## Task 7: Testing & Verification

**Files:**
- Manual testing (no files created)

### Implementation Steps

- [ ] **Step 1: Test QR generation endpoint**

Navigate to a campaign in draft status. Verify:
- All 4 validations work (test by removing stores, allocations, etc.)
- Successful response returns base64 QR code data URL
- Campaign status changes to 'active'

- [ ] **Step 2: Test range page launch flow**

On `/range/[id]` page:
- Click "Preview & Launch" with invalid campaign → Modal shows errors
- Click "Preview & Launch" with valid campaign → Modal shows summary
- Click "Generate QR & Launch" → Redirects to `/campaign/[id]/live`

- [ ] **Step 3: Test live page**

On `/campaign/[id]/live`:
- QR code displays correctly
- Download QR Code button works
- Campaign info shows correct data
- Back button navigates correctly
- Dark mode colors are correct

- [ ] **Step 4: Test campaign detail page**

On `/campaign/[id]`:
- QR card shows only when campaign status is 'active'
- QR card doesn't show for draft/paused/ended campaigns
- Download button works from card
- Dark mode colors are correct

- [ ] **Step 5: Verify responsive design**

Test on mobile (375px width):
- Buttons stack correctly
- QR code scales appropriately
- Text doesn't overflow
- Modals remain usable

- [ ] **Step 6: Commit test results**

```bash
git commit --allow-empty -m "test: verified QR generation flow end-to-end"
```

---

## Summary

**Total Tasks:** 7  
**Files Created:** 7  
**Files Modified:** 2  
**Dependencies:** qrcode, react-qr-code (both already in package.json)

**Implementation Checklist:**
- ✅ POST /api/campaigns/[id]/generate-qr with 4 validations
- ✅ CampaignLaunchModal component with error handling
- ✅ CampaignLiveView page with QR display and download
- ✅ CampaignQRCodeCard reusable component
- ✅ Integration into range page (/preview-launch flow)
- ✅ Integration into campaign detail page
- ✅ Dark mode support throughout
- ✅ Responsive design (mobile-first)
- ✅ Error handling and validation

**Quality Standards Met:**
- All 4 validation checks implemented
- TDD where applicable (test endpoint first)
- Inline error handling (no toast system)
- Modal pattern reuse (consistent with existing)
- CSS Modules with dark mode via @media
- Auth via useAuthContext() hook
- No new dependencies added
