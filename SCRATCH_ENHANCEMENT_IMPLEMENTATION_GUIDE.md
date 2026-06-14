# SCRATCHX SCRATCH ENHANCEMENT SYSTEM - COMPLETE IMPLEMENTATION GUIDE

## PHASE 1: DATABASE SCHEMA UPDATES

### 1. Update Subscription Model
Location: models/subscriptionModel.js

Change unlimitedScratches from "lifetime" to quarterly (90-day) model:

```javascript
// ========== UNLIMITED SCRATCHES (QUARTERLY - 90 DAYS) ==========
unlimitedScratches: {
  isActive: { type: Boolean, default: false },
  grantedAt: { type: Date, default: null },      // When plan was purchased
  validUntil: { type: Date, default: null },    // 90 days from purchase
  scratchValidityType: {
    type: String,
    enum: ['quarterly'],
    default: 'quarterly'
  },
  daysRemaining: { type: Number, default: 0 },  // Calculated: Math.ceil((validUntil - now) / (1000*60*60*24))
  lastWarningAt: { type: Date, default: null },
}
```

### 2. Create ScratchPack Model
Location: models/scratchPackModel.js (NEW)

```javascript
const scratchPackSchema = new mongoose.Schema({
  name: String,           // "1000 Scratches", "5000 Scratches", etc
  quantity: Number,       // 1000, 5000, 10000, 50000
  price: Number,          // Price in paise or rupees
  active: Boolean,
  createdAt: Date,
  updatedAt: Date
});
```

### 3. Create ScratchPackOrder Model  
Location: models/scratchPackOrderModel.js (NEW)

```javascript
const scratchPackOrderSchema = new mongoose.Schema({
  ownerId: ObjectId,
  ownerType: String,          // 'merchant' or 'distributor'
  packId: ObjectId,
  packName: String,
  quantity: Number,
  price: Number,
  paymentStatus: String,      // 'pending', 'completed', 'failed'
  transactionId: String,      // Razorpay order ID (future)
  consumed: Number,           // Scratches used from this pack
  remaining: Number,
  purchasedAt: Date,
  expiresAt: Date,            // Optional: packs might have expiry
  createdAt: Date
});
```

## PHASE 2: TERMINOLOGY CHANGES (GLOBAL)

Replace "Scratch Cards" with "Scratches" in:

1. Dashboard Cards:
   - app/(dashboard)/dashboard/page.js
   - components/dashboards/*.js

2. Campaign Pages:
   - app/(dashboard)/campaign/page.js
   - app/(dashboard)/campaign/new/page.js
   - app/(dashboard)/campaign/[id]/live/page.js

3. Store Pages:
   - app/(dashboard)/stores/page.js

4. Components:
   - components/**/*.js (all components mentioning scratch cards)

5. APIs:
   - app/api/**/*.js (all API responses)

6. Labels & UI Text:
   - All frontend strings containing "Scratch Card"

## PHASE 3: SERVICE LAYER CREATION

### 1. Create Scratch Entitlement Service
Location: lib/services/scratchEntitlementService.js

Purpose: Centralized logic for scratch allowance

```javascript
class ScratchEntitlementService {
  
  // Get current scratch allowance status
  async getScratchStatus(ownerId, ownerType) {
    const subscription = await Subscription.findOne({
      ownerId,
      ownerType,
      status: 'active'
    });
    
    if (!subscription) {
      return { hasAccess: false, reason: 'NO_SUBSCRIPTION' };
    }
    
    // Check unlimited scratches
    if (subscription.unlimitedScratches.isActive) {
      const daysRemaining = this.calculateDaysRemaining(
        subscription.unlimitedScratches.validUntil
      );
      
      return {
        hasAccess: true,
        type: 'unlimited',
        daysRemaining,
        validUntil: subscription.unlimitedScratches.validUntil,
        message: `Unlimited Scratches (${daysRemaining} days remaining)`
      };
    }
    
    // Check purchased packs
    const totalRemaining = this.calculateRemainingFromPacks(
      subscription.scratchPacks
    );
    
    if (totalRemaining > 0) {
      return {
        hasAccess: true,
        type: 'packs',
        remaining: totalRemaining,
        message: `${totalRemaining} scratches remaining`
      };
    }
    
    return {
      hasAccess: false,
      reason: 'NO_SCRATCHES',
      message: 'No scratch entitlement. Purchase a scratch pack.'
    };
  }
  
  // Activate unlimited scratches on plan purchase
  async activateUnlimitedScratches(subscriptionId) {
    const now = new Date();
    const validUntil = new Date(now);
    validUntil.setDate(validUntil.getDate() + 90);
    
    return await Subscription.findByIdAndUpdate(
      subscriptionId,
      {
        'unlimitedScratches.isActive': true,
        'unlimitedScratches.grantedAt': now,
        'unlimitedScratches.validUntil': validUntil,
      },
      { new: true }
    );
  }
  
  // Deactivate scratches after 90 days
  async deactivateExpiredScratches(subscriptionId) {
    return await Subscription.findByIdAndUpdate(
      subscriptionId,
      { 'unlimitedScratches.isActive': false },
      { new: true }
    );
  }
  
  // Add purchased scratch pack
  async addScratchPack(subscriptionId, packOrder) {
    return await Subscription.findByIdAndUpdate(
      subscriptionId,
      {
        $push: {
          scratchPacks: {
            packId: packOrder.packId,
            quantity: packOrder.quantity,
            remaining: packOrder.quantity,
            orderId: packOrder.orderId,
            purchasedAt: new Date()
          }
        }
      },
      { new: true }
    );
  }
  
  // Consume scratches from packs
  async consumeScratchesFromPacks(subscriptionId, quantity) {
    const subscription = await Subscription.findById(subscriptionId);
    let remaining = quantity;
    
    for (let pack of subscription.scratchPacks) {
      if (remaining === 0) break;
      if (pack.remaining > 0) {
        const consumed = Math.min(remaining, pack.remaining);
        pack.remaining -= consumed;
        pack.consumed += consumed;
        remaining -= consumed;
      }
    }
    
    if (remaining > 0) {
      throw new Error(`Insufficient scratches. Need ${remaining} more.`);
    }
    
    subscription.totalScratchesConsumed += quantity;
    await subscription.save();
    return true;
  }
  
  // Private helpers
  calculateDaysRemaining(expiryDate) {
    return Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
  }
  
  calculateRemainingFromPacks(packs) {
    return packs.reduce((sum, pack) => sum + pack.remaining, 0);
  }
}

export default new ScratchEntitlementService();
```

### 2. Create Scratch Pack Service
Location: lib/services/scratchPackService.js

```javascript
class ScratchPackService {
  
  async purchaseScratchPack(ownerId, ownerType, packQuantity) {
    // Create order record
    const order = new ScratchPackOrder({
      ownerId,
      ownerType,
      packName: `${packQuantity} Scratches`,
      quantity: packQuantity,
      price: this.getPriceForQuantity(packQuantity),
      paymentStatus: 'pending',
      purchasedAt: new Date()
    });
    
    await order.save();
    
    // TEMPORARY BYPASS: Mark as completed (future: integrate Razorpay)
    order.paymentStatus = 'completed';
    order.transactionId = `TEMP-${Date.now()}`;
    await order.save();
    
    // Add to subscription
    const subscription = await Subscription.findOne({
      ownerId,
      ownerType,
      status: 'active'
    });
    
    if (!subscription) {
      throw new Error('No active subscription found');
    }
    
    await scratchEntitlementService.addScratchPack(subscription._id, order);
    
    // Create notification
    await notificationService.notify(ownerId, ownerType, {
      type: 'SCRATCH_PACK_PURCHASED',
      message: `${packQuantity} scratches added to your account`,
      data: { quantity: packQuantity }
    });
    
    return order;
  }
  
  getPriceForQuantity(quantity) {
    const priceMap = {
      1000: 499,
      5000: 2499,
      10000: 4999,
      50000: 24999
    };
    return priceMap[quantity] || 0;
  }
  
  async getAvailablePacks() {
    return [
      { quantity: 1000, price: 499 },
      { quantity: 5000, price: 2499 },
      { quantity: 10000, price: 4999 },
      { quantity: 50000, price: 24999 }
    ];
  }
}

export default new ScratchPackService();
```

### 3. Create Scratch Validation Middleware
Location: lib/guards/scratchValidationGuard.js

```javascript
class ScratchValidationGuard {
  
  async validateScratchAccess(ownerId, ownerType) {
    const scratchStatus = await scratchEntitlementService.getScratchStatus(
      ownerId,
      ownerType
    );
    
    if (!scratchStatus.hasAccess) {
      const error = new Error('Scratch entitlement has expired');
      error.code = 'SCRATCH_ENTITLEMENT_EXPIRED';
      error.statusCode = 402; // Payment Required
      throw error;
    }
    
    return scratchStatus;
  }
  
  // Middleware for campaign creation
  async validateCampaignCreation(ownerId, ownerType, campaignData) {
    // Check subscription
    const subscription = await Subscription.findOne({
      ownerId,
      ownerType,
      status: 'active'
    });
    
    if (!subscription) {
      throw new Error('No active subscription');
    }
    
    // Check campaign limit
    const campaignCount = await Campaign.countDocuments({
      createdBy: ownerId,
      'ownerType': ownerType
    });
    
    const limits = subscription.planId.limits;
    if (campaignCount >= limits.maxCampaigns) {
      throw new Error(`Campaign limit (${limits.maxCampaigns}) reached`);
    }
    
    // Check scratch access - CRITICAL
    await this.validateScratchAccess(ownerId, ownerType);
    
    return true;
  }
}

export default new ScratchValidationGuard();
```

## PHASE 4: API CHANGES

### 1. Update Subscription Activation API
Location: app/api/subscription/activate/route.js

```javascript
// When plan is purchased, activate unlimited scratches for 90 days
const subscription = new Subscription({
  // ... other fields ...
  unlimitedScratches: {
    isActive: true,
    grantedAt: now,
    validUntil: new Date(now.getTime() + 90*24*60*60*1000),
    scratchValidityType: 'quarterly'
  }
});

await subscription.save();

// Create notification
await notificationService.notify(ownerId, ownerType, {
  type: 'PLAN_PURCHASED',
  message: `${planType} plan purchased. Unlimited scratches active for 90 days.`,
  data: { planType, validUntil }
});
```

### 2. Create Scratch Pack Purchase API
Location: app/api/scratches/purchase-pack/route.js (NEW)

```javascript
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import scratchPackService from '@/lib/services/scratchPackService';

export async function POST(request) {
  const { account, error } = await requireAuth();
  if (error) return error;
  
  try {
    const { quantity } = await request.json();
    
    const order = await scratchPackService.purchaseScratchPack(
      account._id,
      account.role.toLowerCase(),
      quantity
    );
    
    return NextResponse.json({
      success: true,
      message: 'Scratches purchased successfully',
      order
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: err.statusCode || 500 }
    );
  }
}
```

### 3. Create Campaign Validation API
Location: app/api/campaign/validate/route.js (NEW)

```javascript
// Validate before campaign creation, activation, allocation
export async function POST(request) {
  const { account, error } = await requireAuth();
  if (error) return error;
  
  try {
    const scratchStatus = await scratchEntitlementService.getScratchStatus(
      account._id,
      account.role.toLowerCase()
    );
    
    if (!scratchStatus.hasAccess) {
      return NextResponse.json(
        {
          success: false,
          error: 'Scratch entitlement expired',
          action: 'PURCHASE_SCRATCH_PACK'
        },
        { status: 402 }
      );
    }
    
    return NextResponse.json({
      success: true,
      scratchStatus
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
```

## PHASE 5: NOTIFICATION SYSTEM

### Create Notification Service
Location: lib/services/notificationService.js

```javascript
class NotificationService {
  
  async notify(ownerId, ownerType, notification) {
    // Create notification record
    const notif = new Notification({
      ownerId,
      ownerType,
      type: notification.type,
      title: this.getTitleForType(notification.type),
      message: notification.message,
      data: notification.data,
      read: false,
      createdAt: new Date()
    });
    
    await notif.save();
    
    // Send email if needed
    if (this.shouldSendEmail(notification.type)) {
      await this.sendEmail(ownerId, notification);
    }
    
    // Trigger real-time notification (WebSocket/Pusher)
    if (this.shouldBroadcast(notification.type)) {
      await this.broadcastNotification(ownerId, notif);
    }
    
    return notif;
  }
  
  getTitleForType(type) {
    const titles = {
      PLAN_PURCHASED: 'Plan Activated',
      SCRATCH_PACK_PURCHASED: 'Scratches Added',
      SCRATCH_EXPIRY_15DAYS: 'Scratches Expiring Soon',
      SCRATCH_EXPIRY_7DAYS: 'Scratches Expiring Soon',
      SCRATCH_EXPIRY_3DAYS: 'Scratches Expiring Soon',
      SCRATCH_EXPIRY_1DAY: 'Scratches Expiring Tomorrow',
      SCRATCH_EXPIRED: 'Scratches Expired'
    };
    return titles[type] || 'Notification';
  }
  
  shouldSendEmail(type) {
    return ['SCRATCH_EXPIRY_15DAYS', 'SCRATCH_EXPIRY_7DAYS', 'SCRATCH_EXPIRED'].includes(type);
  }
  
  shouldBroadcast(type) {
    return true; // All notifications broadcast
  }
}

export default new NotificationService();
```

## PHASE 6: CRON JOBS

### Expiry Warning Cron
Location: lib/cron/checkScratchExpiry.js (NEW)

```javascript
export async function checkAndNotifyScratchExpiry() {
  const now = new Date();
  const subscriptions = await Subscription.find({
    'unlimitedScratches.isActive': true
  });
  
  for (const sub of subscriptions) {
    const daysRemaining = Math.ceil(
      (sub.unlimitedScratches.validUntil - now) / (1000*60*60*24)
    );
    
    if (daysRemaining === 15 && !this.wasNotifiedToday(sub, 'SCRATCH_EXPIRY_15DAYS')) {
      await notificationService.notify(sub.ownerId, sub.ownerType, {
        type: 'SCRATCH_EXPIRY_15DAYS',
        message: 'Your unlimited scratches expire in 15 days. Renew now to avoid campaign interruption.'
      });
    }
    
    if (daysRemaining === 7 && !this.wasNotifiedToday(sub, 'SCRATCH_EXPIRY_7DAYS')) {
      await notificationService.notify(sub.ownerId, sub.ownerType, {
        type: 'SCRATCH_EXPIRY_7DAYS',
        message: 'Your unlimited scratches expire in 7 days.'
      });
    }
    
    if (daysRemaining === 3 && !this.wasNotifiedToday(sub, 'SCRATCH_EXPIRY_3DAYS')) {
      await notificationService.notify(sub.ownerId, sub.ownerType, {
        type: 'SCRATCH_EXPIRY_3DAYS',
        message: 'Your unlimited scratches expire in 3 days.'
      });
    }
    
    if (daysRemaining === 1 && !this.wasNotifiedToday(sub, 'SCRATCH_EXPIRY_1DAY')) {
      await notificationService.notify(sub.ownerId, sub.ownerType, {
        type: 'SCRATCH_EXPIRY_1DAY',
        message: 'Your unlimited scratches expire tomorrow.'
      });
    }
    
    if (daysRemaining <= 0) {
      await scratchEntitlementService.deactivateExpiredScratches(sub._id);
      await notificationService.notify(sub.ownerId, sub.ownerType, {
        type: 'SCRATCH_EXPIRED',
        message: 'Your scratch entitlement has expired. Campaign operations are now restricted.'
      });
    }
  }
}

wasNotifiedToday(subscription, notificationType) {
  const lastWarning = subscription.unlimitedScratches.lastWarningAt;
  if (!lastWarning) return false;
  
  const today = new Date();
  return lastWarning.toDateString() === today.toDateString();
}
```

Register in app/api/cron/scratches/route.js

## PHASE 7: CAMPAIGN VALIDATION UPDATES

Update campaign creation/activation/allocation endpoints:
- app/api/campaign/create/route.js
- app/api/campaign/[id]/activate/route.js
- app/api/campaign/[id]/assign-stores/route.js
- app/api/scratch-allocation/route.js

Add this check at the start of each:

```javascript
const scratchStatus = await scratchEntitlementService.getScratchStatus(
  userId,
  userRole
);

if (!scratchStatus.hasAccess) {
  return NextResponse.json(
    {
      success: false,
      error: 'Scratch entitlement has expired',
      action: 'PURCHASE_SCRATCH_PACK',
      scratchStatus
    },
    { status: 402 }
  );
}
```

## PHASE 8: DASHBOARD UPDATES

### Update Dashboard Card
Replace "Scratch Cards" with "Scratches":

```javascript
// In components/dashboards/StatCard.js or dashboard cards
{
  metrics.scratches && (
    <div className={styles.metricCard}>
      <h3>Scratches</h3>
      {scratchStatus.type === 'unlimited' ? (
        <div>
          <p className={styles.value}>Unlimited</p>
          <p className={styles.subtitle}>
            Valid until {formatDate(scratchStatus.validUntil)}
          </p>
          <ProgressBar 
            percentage={scratchStatus.daysRemaining / 90 * 100}
            label={`${scratchStatus.daysRemaining} days remaining`}
          />
        </div>
      ) : (
        <div>
          <p className={styles.value}>
            {scratchStatus.remaining} / {scratchStatus.purchased}
          </p>
          <p className={styles.subtitle}>Scratches remaining</p>
        </div>
      )}
    </div>
  )
}
```

## PHASE 9: ERROR MODALS

When scratch entitlement expires, show modal:

```javascript
// components/modals/ScratchExpiredModal.js
export default function ScratchExpiredModal({ onClose, onPurchase }) {
  return (
    <Modal>
      <div>
        <h2>Scratch Entitlement Expired</h2>
        <p>Your unlimited scratches have expired.</p>
        <p>Please purchase a scratch package to continue creating campaigns.</p>
        <button onClick={onPurchase}>Purchase Scratches</button>
        <button onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}
```

Display in campaign creation:

```javascript
const [showScratchModal, setShowScratchModal] = useState(false);

useEffect(() => {
  if (scratchStatus && !scratchStatus.hasAccess) {
    setShowScratchModal(true);
  }
}, [scratchStatus]);

// In JSX
{showScratchModal && (
  <ScratchExpiredModal
    onClose={() => setShowScratchModal(false)}
    onPurchase={() => router.push('/scratches/purchase')}
  />
)}
```

## PHASE 10: FILES TO CREATE/MODIFY

### NEW FILES TO CREATE:
1. models/scratchPackModel.js
2. models/scratchPackOrderModel.js
3. lib/services/scratchEntitlementService.js
4. lib/services/scratchPackService.js
5. lib/guards/scratchValidationGuard.js
6. lib/services/notificationService.js
7. lib/cron/checkScratchExpiry.js
8. app/api/scratches/purchase-pack/route.js
9. app/api/campaign/validate/route.js
10. app/api/scratches/status/route.js
11. components/modals/ScratchExpiredModal.js
12. app/(dashboard)/scratches/page.js (new scratch management page)

### FILES TO MODIFY:
1. models/subscriptionModel.js - Update unlimitedScratches field
2. lib/models/notificationModel.js - If not exists, create
3. app/api/subscription/activate/route.js - Activate scratches on plan purchase
4. app/api/campaign/create/route.js - Add scratch validation
5. app/api/campaign/[id]/activate/route.js - Add scratch validation
6. app/(dashboard)/dashboard/page.js - Update scratch display
7. components/**/*.js - Replace "Scratch Cards" with "Scratches"
8. app/(dashboard)/billing/page.js - Add scratch pack purchase link
9. app/api/cron/scratches/route.js - Register expiry checker

## TESTING CHECKLIST

- [ ] Purchase plan → scratches activated for 90 days
- [ ] Dashboard shows "Unlimited Scratches"
- [ ] Progress bar shows 90 days countdown
- [ ] Notification on plan purchase
- [ ] Campaign creation works with active scratches
- [ ] Campaign creation blocked without scratches
- [ ] Expiry notifications at 15/7/3/1 days
- [ ] Scratches deactivate after 90 days
- [ ] Can purchase scratch pack
- [ ] Dashboard updates with pack scratches
- [ ] Campaign creation works with pack scratches
- [ ] Usage tracking updates correctly
- [ ] Works for both Merchant and Distributor roles

## RAZORPAY INTEGRATION POINTS (FOR FUTURE)

Replace in scratchPackService.purchaseScratchPack():

```javascript
// FUTURE: Replace temporary bypass with this
const razorpayOrder = await razorpayClient.orders.create({
  amount: order.price * 100,
  currency: 'INR',
  receipt: order._id.toString(),
  notes: {
    ownerId: ownerId,
    ownerType: ownerType,
    packQuantity: packQuantity
  }
});

order.transactionId = razorpayOrder.id;
order.paymentStatus = 'pending';
await order.save();

return { orderId: razorpayOrder.id, order };
```

Then create webhook endpoint: app/api/webhooks/razorpay/payment-callback/route.js

---

This is the complete implementation guide. Ready to start implementation?
