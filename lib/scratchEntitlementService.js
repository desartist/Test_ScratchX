import Subscription from "@/models/subscriptionModel";
import ScratchPackOrder from "@/models/scratchPackOrderModel";
import { connectDB } from "@/lib/connectDB";

/**
 * ScratchEntitlementService
 *
 * Centralized service for managing scratch availability and entitlements.
 * Used to determine if a user can create/activate campaigns and allocate scratches.
 */
class ScratchEntitlementService {
  /**
   * Check if a merchant/distributor has active scratch entitlement
   * Returns: { hasEntitlement, type, details }
   * type: "unlimited", "pack", "none"
   */
  async checkEntitlement(ownerId, ownerType = "merchant") {
    try {
      await connectDB();

      // Get subscription
      const subscription = await Subscription.findOne({
        ownerId,
        ownerType,
        status: { $in: ["trial", "active"] },
      });

      if (!subscription) {
        return {
          hasEntitlement: false,
          type: "none",
          reason: "No active subscription found",
        };
      }

      const now = new Date();

      // Check 1: Unlimited scratches (monthly allowance)
      if (
        subscription.unlimitedScratches?.isActive &&
        subscription.unlimitedScratches?.validUntil &&
        subscription.unlimitedScratches.validUntil > now
      ) {
        const daysRemaining = Math.ceil(
          (subscription.unlimitedScratches.validUntil - now) / (1000 * 60 * 60 * 24)
        );

        return {
          hasEntitlement: true,
          type: "unlimited",
          daysRemaining,
          validUntil: subscription.unlimitedScratches.validUntil,
          warningLevel: this._getWarningLevel(daysRemaining),
          details: {
            grantedAt: subscription.unlimitedScratches.grantedAt,
            scratchValidityType: subscription.unlimitedScratches.scratchValidityType,
          },
        };
      }

      // Check 2: Active scratch packs
      if (subscription.scratchPacks && subscription.scratchPacks.length > 0) {
        const activePacks = subscription.scratchPacks.filter(
          (pack) => pack.remaining > 0
        );

        if (activePacks.length > 0) {
          const totalRemaining = activePacks.reduce(
            (sum, pack) => sum + pack.remaining,
            0
          );

          return {
            hasEntitlement: true,
            type: "pack",
            totalRemaining,
            packs: activePacks.map((pack) => ({
              orderId: pack.orderId,
              quantity: pack.quantity,
              remaining: pack.remaining,
              consumed: pack.consumed,
              purchasedAt: pack.purchasedAt,
            })),
          };
        }
      }

      // No entitlement
      return {
        hasEntitlement: false,
        type: "none",
        reason: "No active unlimited scratches or scratch packs",
        unlimitedExpired: subscription.unlimitedScratches?.validUntil < now,
      };
    } catch (error) {
      console.error("ScratchEntitlementService error:", error);
      throw new Error(`Failed to check scratch entitlement: ${error.message}`);
    }
  }

  /**
   * Check if user needs expiry warnings
   * Returns warning level: "critical" | "high" | "medium" | "low" | null
   */
  _getWarningLevel(daysRemaining) {
    if (daysRemaining <= 1) return "critical";  // 1 day
    if (daysRemaining <= 3) return "high";      // 3 days
    if (daysRemaining <= 7) return "medium";    // 7 days
    if (daysRemaining <= 15) return "low";      // 15 days
    return null;
  }

  /**
   * Generate expiry warning notification if needed
   * Returns: { shouldNotify, message, daysRemaining }
   */
  async checkAndGenerateWarning(ownerId, ownerType = "merchant") {
    try {
      await connectDB();

      const subscription = await Subscription.findOne({
        ownerId,
        ownerType,
        status: { $in: ["trial", "active"] },
      });

      if (!subscription?.unlimitedScratches?.isActive) {
        return { shouldNotify: false };
      }

      const now = new Date();
      const validUntil = subscription.unlimitedScratches.validUntil;

      if (validUntil <= now) {
        return {
          shouldNotify: false,
          reason: "Scratches already expired",
        };
      }

      const daysRemaining = Math.ceil((validUntil - now) / (1000 * 60 * 60 * 24));
      const lastWarningAt = subscription.unlimitedScratches.lastWarningAt;

      // Determine if this day qualifies for a warning
      let shouldNotify = false;
      let notificationType = null;
      let message = null;

      if (daysRemaining === 15 && this._isNewDay(lastWarningAt)) {
        shouldNotify = true;
        notificationType = "15_days";
        message = `Your unlimited scratches expire in 15 days. Renew now to avoid campaign interruption.`;
      } else if (daysRemaining === 7 && this._isNewDay(lastWarningAt)) {
        shouldNotify = true;
        notificationType = "7_days";
        message = `Your unlimited scratches expire in 7 days.`;
      } else if (daysRemaining === 3 && this._isNewDay(lastWarningAt)) {
        shouldNotify = true;
        notificationType = "3_days";
        message = `Your unlimited scratches expire in 3 days.`;
      } else if (daysRemaining === 1 && this._isNewDay(lastWarningAt)) {
        shouldNotify = true;
        notificationType = "1_day";
        message = `Your unlimited scratches expire tomorrow.`;
      }

      return {
        shouldNotify,
        daysRemaining,
        notificationType,
        message,
      };
    } catch (error) {
      console.error("Error checking expiry warning:", error);
      throw new Error(`Failed to check expiry warning: ${error.message}`);
    }
  }

  /**
   * Mark warning as sent
   */
  async markWarningSent(ownerId, ownerType = "merchant") {
    try {
      await connectDB();

      await Subscription.updateOne(
        { ownerId, ownerType },
        { $set: { "unlimitedScratches.lastWarningAt": new Date() } }
      );
    } catch (error) {
      console.error("Error marking warning as sent:", error);
    }
  }

  /**
   * Helper: Check if warning hasn't been sent today
   */
  _isNewDay(lastWarningAt) {
    if (!lastWarningAt) return true;

    const today = new Date().setHours(0, 0, 0, 0);
    const lastWarningDay = new Date(lastWarningAt).setHours(0, 0, 0, 0);

    return today !== lastWarningDay;
  }

  /**
   * Activate unlimited scratches for a new subscription
   * Called when plan is first purchased
   */
  async activateUnlimitedScratches(subscriptionId) {
    try {
      await connectDB();

      const now = new Date();
      const validUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 days

      const result = await Subscription.findByIdAndUpdate(
        subscriptionId,
        {
          $set: {
            "unlimitedScratches.isActive": true,
            "unlimitedScratches.validUntil": validUntil,
            "unlimitedScratches.grantedAt": now,
            "unlimitedScratches.scratchValidityType": "monthly",
            "unlimitedScratches.daysRemaining": 30,
          },
        },
        { new: true }
      );

      return {
        success: true,
        validUntil,
        daysRemaining: 30,
        message: "Unlimited scratches activated for 30 days",
      };
    } catch (error) {
      console.error("Error activating unlimited scratches:", error);
      throw new Error(`Failed to activate scratches: ${error.message}`);
    }
  }

  /**
   * Deactivate unlimited scratches when they expire
   */
  async deactivateExpiredScratches(subscriptionId) {
    try {
      await connectDB();

      const result = await Subscription.findByIdAndUpdate(
        subscriptionId,
        {
          $set: {
            "unlimitedScratches.isActive": false,
          },
        },
        { new: true }
      );

      return {
        success: true,
        message: "Unlimited scratches deactivated",
      };
    } catch (error) {
      console.error("Error deactivating scratches:", error);
      throw new Error(`Failed to deactivate scratches: ${error.message}`);
    }
  }

  /**
   * Add scratch pack to subscription
   * Called when user purchases a scratch pack
   */
  async addScratchPack(
    subscriptionId,
    packId,
    quantity,
    orderId,
    validityDays = 365
  ) {
    try {
      await connectDB();

      const now = new Date();
      const validUntil = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000);

      const result = await Subscription.findByIdAndUpdate(
        subscriptionId,
        {
          $push: {
            scratchPacks: {
              packId,
              quantity,
              consumed: 0,
              remaining: quantity,
              orderId,
              purchasedAt: now,
            },
          },
        },
        { new: true }
      );

      return {
        success: true,
        message: `${quantity} scratches added to your account`,
      };
    } catch (error) {
      console.error("Error adding scratch pack:", error);
      throw new Error(`Failed to add scratch pack: ${error.message}`);
    }
  }

  /**
   * Consume scratches from subscription
   * Updates both subscription and order records
   */
  async consumeScratch(ownerId, ownerType, scratchCount) {
    try {
      await connectDB();

      const subscription = await Subscription.findOne({
        ownerId,
        ownerType,
      });

      if (!subscription) {
        throw new Error("Subscription not found");
      }

      // Update consumption tracking
      await Subscription.updateOne(
        { _id: subscription._id },
        {
          $inc: { totalScratchesConsumed: scratchCount },
        }
      );

      // Also update pack orders if using packs
      if (subscription.scratchPacks?.length > 0) {
        for (const pack of subscription.scratchPacks) {
          if (pack.remaining >= scratchCount) {
            await ScratchPackOrder.updateOne(
              { _id: pack.orderId },
              {
                $inc: {
                  consumed: scratchCount,
                  remaining: -scratchCount,
                },
                $set: {
                  isExhausted: false,
                },
              }
            );
            break;
          }
        }
      }

      return { success: true };
    } catch (error) {
      console.error("Error consuming scratch:", error);
      throw new Error(`Failed to consume scratch: ${error.message}`);
    }
  }

  /**
   * Get comprehensive scratch status for dashboard
   */
  async getDashboardStatus(ownerId, ownerType = "merchant") {
    try {
      await connectDB();

      const entitlement = await this.checkEntitlement(ownerId, ownerType);

      if (entitlement.type === "unlimited") {
        return {
          status: "unlimited",
          daysRemaining: entitlement.daysRemaining,
          validUntil: entitlement.validUntil,
          displayLabel: "Unlimited",
          displayDetail: `Valid until ${new Date(entitlement.validUntil).toLocaleDateString()}`,
          warningLevel: entitlement.warningLevel,
        };
      } else if (entitlement.type === "pack") {
        return {
          status: "pack",
          totalRemaining: entitlement.totalRemaining,
          packs: entitlement.packs,
          displayLabel: `${entitlement.totalRemaining.toLocaleString()}`,
          displayDetail: "Available scratches",
        };
      } else {
        return {
          status: "expired",
          displayLabel: "No scratches",
          displayDetail: "Purchase a scratch pack to continue",
          expired: true,
        };
      }
    } catch (error) {
      console.error("Error getting dashboard status:", error);
      throw new Error(`Failed to get scratch status: ${error.message}`);
    }
  }
}

export default new ScratchEntitlementService();
