/**
 * Scratch Entitlement Service
 * Centralized logic for managing scratch allowances and usage
 * Handles: unlimited quarterly scratches, pack purchases, consumption tracking
 */

import Subscription from "@/models/subscriptionModel.js";
import "@/models/subscriptionPlanModel";
import ScratchPackOrder from "@/models/scratchPackOrderModel.js";

class ScratchEntitlementService {
  /**
   * Get current scratch allowance status for a user
   * Returns: { hasAccess, type, remaining/daysRemaining, message }
   */
  async getScratchStatus(ownerId, ownerType) {
    try {
      const subscription = await Subscription.findOne({
        ownerId,
        ownerType,
        status: "active"
      }).populate("planId");

      if (!subscription) {
        return {
          hasAccess: false,
          reason: "NO_SUBSCRIPTION",
          message: "No active subscription found"
        };
      }

      // Check unlimited scratches (quarterly)
      if (subscription.unlimitedScratches?.isActive) {
        const now = new Date();
        const validUntil = new Date(subscription.unlimitedScratches.validUntil);
        
        if (validUntil > now) {
          const daysRemaining = Math.ceil((validUntil - now) / (1000 * 60 * 60 * 24));
          return {
            hasAccess: true,
            type: "unlimited",
            daysRemaining,
            validUntil,
            message: `Unlimited Scratches Active (${daysRemaining} days remaining)`
          };
        }
      }

      // Check purchased scratch packs
      const totalRemaining = await this._calculateRemainingFromPacks(ownerId, ownerType);

      if (totalRemaining > 0) {
        return {
          hasAccess: true,
          type: "packs",
          remaining: totalRemaining,
          message: `${totalRemaining} scratches from purchased packs`
        };
      }

      return {
        hasAccess: false,
        reason: "SCRATCH_ENTITLEMENT_EXPIRED",
        message: "No scratch entitlement. Purchase a scratch pack to continue."
      };
    } catch (error) {
      console.error("[ScratchEntitlementService] Error in getScratchStatus:", error);
      throw error;
    }
  }

  /**
   * Activate unlimited scratches for 90 days when plan is purchased
   * Called from: subscription/activate API
   */
  async activateUnlimitedScratches(subscriptionId) {
    try {
      const now = new Date();
      const validUntil = new Date(now);
      validUntil.setDate(validUntil.getDate() + 90);

      const subscription = await Subscription.findByIdAndUpdate(
        subscriptionId,
        {
          "unlimitedScratches.isActive": true,
          "unlimitedScratches.grantedAt": now,
          "unlimitedScratches.validUntil": validUntil,
          "unlimitedScratches.scratchValidityType": "quarterly"
        },
        { new: true }
      );

      console.log(`[ScratchEntitlementService] Activated unlimited scratches for ${subscriptionId} until ${validUntil}`);
      return subscription;
    } catch (error) {
      console.error("[ScratchEntitlementService] Error activating scratches:", error);
      throw error;
    }
  }

  /**
   * Deactivate scratches after 90-day expiry
   * Called from: cron/checkScratchExpiry
   */
  async deactivateExpiredScratches(subscriptionId) {
    try {
      const subscription = await Subscription.findByIdAndUpdate(
        subscriptionId,
        {
          "unlimitedScratches.isActive": false,
          "unlimitedScratches.lastWarningAt": null
        },
        { new: true }
      );

      console.log(`[ScratchEntitlementService] Deactivated expired scratches for ${subscriptionId}`);
      return subscription;
    } catch (error) {
      console.error("[ScratchEntitlementService] Error deactivating scratches:", error);
      throw error;
    }
  }

  /**
   * Add a purchased scratch pack to subscription
   * Called from: scratches/purchase-pack API
   */
  async addScratchPack(subscriptionId, packOrder) {
    try {
      const subscription = await Subscription.findByIdAndUpdate(
        subscriptionId,
        {
          $push: {
            scratchPacks: {
              packId: packOrder.packId,
              quantity: packOrder.quantity,
              consumed: 0,
              remaining: packOrder.quantity,
              orderId: packOrder._id,
              purchasedAt: packOrder.purchasedAt || new Date()
            }
          }
        },
        { new: true }
      );

      console.log(`[ScratchEntitlementService] Added ${packOrder.quantity} scratches from pack to ${subscriptionId}`);
      return subscription;
    } catch (error) {
      console.error("[ScratchEntitlementService] Error adding scratch pack:", error);
      throw error;
    }
  }

  /**
   * Consume scratches when campaign is created/activated
   * Called from: campaign/create, campaign/activate APIs
   */
  async consumeScraches(ownerId, ownerType, quantity) {
    try {
      // First check if unlimited scratches are active
      const subscription = await Subscription.findOne({
        ownerId,
        ownerType,
        status: "active"
      });

      if (!subscription) {
        throw new Error("No active subscription found");
      }

      // If unlimited scratches are active, no consumption needed
      if (subscription.unlimitedScratches?.isActive) {
        return {
          consumed: true,
          from: "unlimited",
          remaining: "Unlimited",
          message: "Consumed from unlimited quarterly allocation"
        };
      }

      // Otherwise, consume from packs
      let remaining = quantity;
      let consumed = 0;

      // Iterate through packs and consume
      for (let pack of subscription.scratchPacks) {
        if (remaining === 0) break;
        if (pack.remaining > 0) {
          const toConsume = Math.min(remaining, pack.remaining);
          pack.remaining -= toConsume;
          pack.consumed = (pack.consumed || 0) + toConsume;
          consumed += toConsume;
          remaining -= toConsume;
        }
      }

      if (remaining > 0) {
        const error = new Error(`Insufficient scratches. Need ${remaining} more.`);
        error.code = "INSUFFICIENT_SCRATCHES";
        error.statusCode = 402;
        throw error;
      }

      subscription.totalScratchesConsumed = (subscription.totalScratchesConsumed || 0) + quantity;
      await subscription.save();

      const totalRemaining = await this._calculateRemainingFromPacks(ownerId, ownerType);

      return {
        consumed: true,
        from: "packs",
        used: consumed,
        remaining: totalRemaining,
        message: `Consumed ${quantity} scratches from purchased packs`
      };
    } catch (error) {
      console.error("[ScratchEntitlementService] Error consuming scratches:", error);
      throw error;
    }
  }

  /**
   * Get detailed scratch usage analytics
   * Called from: dashboard, analytics endpoints
   */
  async getScratchAnalytics(ownerId, ownerType) {
    try {
      const subscription = await Subscription.findOne({
        ownerId,
        ownerType,
        status: "active"
      });

      if (!subscription) {
        return {
          totalAllocated: 0,
          consumed: 0,
          remaining: 0,
          fromUnlimited: false,
          fromPacks: false
        };
      }

      const unlimitedStatus = this._getUnlimitedScratchStatus(subscription);
      const packStats = this._getPackStats(subscription.scratchPacks);

      return {
        unlimited: unlimitedStatus,
        packs: packStats,
        totalConsumed: subscription.totalScratchesConsumed || 0,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error("[ScratchEntitlementService] Error getting analytics:", error);
      throw error;
    }
  }

  /**
   * Check if scratch entitlement will expire soon (for warnings)
   * Called from: cron/checkScratchExpiry
   */
  calculateDaysUntilExpiry(subscription) {
    if (!subscription.unlimitedScratches?.isActive) {
      return null;
    }

    const now = new Date();
    const expiryDate = new Date(subscription.unlimitedScratches.validUntil);
    const daysRemaining = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

    return daysRemaining;
  }

  /**
   * PRIVATE HELPERS
   */

  async _calculateRemainingFromPacks(ownerId, ownerType) {
    const orders = await ScratchPackOrder.find({
      ownerId,
      ownerType,
      paymentStatus: "completed",
      remaining: { $gt: 0 }
    });

    return orders.reduce((sum, order) => sum + order.remaining, 0);
  }

  _getUnlimitedScratchStatus(subscription) {
    if (!subscription.unlimitedScratches?.isActive) {
      return {
        isActive: false,
        daysRemaining: 0
      };
    }

    const now = new Date();
    const daysRemaining = Math.ceil(
      (subscription.unlimitedScratches.validUntil - now) / (1000 * 60 * 60 * 24)
    );

    return {
      isActive: true,
      grantedAt: subscription.unlimitedScratches.grantedAt,
      validUntil: subscription.unlimitedScratches.validUntil,
      daysRemaining: Math.max(0, daysRemaining)
    };
  }

  _getPackStats(scratchPacks) {
    return {
      totalPacks: scratchPacks.length,
      totalQuantity: scratchPacks.reduce((sum, p) => sum + p.quantity, 0),
      totalConsumed: scratchPacks.reduce((sum, p) => sum + p.consumed, 0),
      totalRemaining: scratchPacks.reduce((sum, p) => sum + p.remaining, 0),
      packs: scratchPacks.map(p => ({
        quantity: p.quantity,
        consumed: p.consumed,
        remaining: p.remaining,
        purchasedAt: p.purchasedAt
      }))
    };
  }
}

export default new ScratchEntitlementService();
