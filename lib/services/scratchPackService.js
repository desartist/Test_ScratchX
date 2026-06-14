/**
 * Scratch Pack Service
 * Handles scratch pack purchases, pricing, and temporary Razorpay bypass
 */

import ScratchPackOrder from "@/models/scratchPackOrderModel.js";
import Subscription from "@/models/subscriptionModel.js";
import ScratchEntitlementService from "./scratchEntitlementService.js";
import NotificationService from "./notificationService.js"; // Will create in PHASE 3

// Scratch pack pricing (temporary - hardcoded until Razorpay integration)
const SCRATCH_PACK_PRICING = {
  1000: { basePrice: 499, quantity: 1000 },
  5000: { basePrice: 2499, quantity: 5000 },
  10000: { basePrice: 4999, quantity: 10000 },
  50000: { basePrice: 24999, quantity: 50000 },
};

const GST_PERCENTAGE = 18;

class ScratchPackService {
  /**
   * Purchase a scratch pack (direct DB update - Razorpay bypass)
   * Called from: POST /api/scratches/purchase-pack
   */
  async purchaseScratchPack(ownerId, ownerType, packQuantity) {
    try {
      // Validate pack quantity
      if (!SCRATCH_PACK_PRICING[packQuantity]) {
        const error = new Error(`Invalid pack quantity: ${packQuantity}`);
        error.code = "INVALID_PACK_QUANTITY";
        error.statusCode = 400;
        throw error;
      }

      // Get subscription
      const subscription = await Subscription.findOne({
        ownerId,
        ownerType,
        status: "active"
      });

      if (!subscription) {
        const error = new Error("No active subscription found");
        error.code = "NO_SUBSCRIPTION";
        error.statusCode = 404;
        throw error;
      }

      // Calculate price
      const { basePrice } = SCRATCH_PACK_PRICING[packQuantity];
      const gstAmount = Math.round((basePrice * GST_PERCENTAGE) / 100);
      const totalPrice = basePrice + gstAmount;

      // Create order (TEMPORARY: Direct activation, no Razorpay)
      const packOrder = new ScratchPackOrder({
        ownerId,
        ownerType,
        packQuantity,
        basePrice,
        gstAmount,
        totalPrice,
        paymentStatus: "completed", // TEMP: Direct activation
        transactionId: `SCRATCH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        purchasedAt: new Date()
      });

      await packOrder.save();

      // Add to subscription
      await ScratchEntitlementService.addScratchPack(subscription._id, packOrder);

      // Trigger notification (TEMP: Will implement in PHASE 3)
      // await NotificationService.sendScratchPackPurchaseNotification(ownerId, ownerType, {
      //   quantity: packQuantity,
      //   price: totalPrice,
      //   transactionId: packOrder.transactionId
      // });

      console.log(`✓ [ScratchPackService] Scratch pack purchased: ${packQuantity} scratches for ${ownerId} (${ownerType})`);

      return {
        orderId: packOrder._id,
        quantity: packQuantity,
        basePrice,
        gstAmount,
        totalPrice,
        transactionId: packOrder.transactionId,
        message: `Successfully purchased ${packQuantity} scratches for ₹${totalPrice}`
      };
    } catch (error) {
      console.error("[ScratchPackService] Error purchasing pack:", error);
      throw error;
    }
  }

  /**
   * Get pricing for a specific pack quantity
   * Called from: frontend, checkout page
   */
  getPriceForQuantity(quantity) {
    if (!SCRATCH_PACK_PRICING[quantity]) {
      return null;
    }

    const { basePrice } = SCRATCH_PACK_PRICING[quantity];
    const gstAmount = Math.round((basePrice * GST_PERCENTAGE) / 100);
    const totalPrice = basePrice + gstAmount;

    return {
      quantity,
      basePrice,
      gstPercentage: GST_PERCENTAGE,
      gstAmount,
      totalPrice
    };
  }

  /**
   * Get all available scratch packs with pricing
   * Called from: scratch pack selection UI
   */
  getAvailablePacks() {
    return Object.entries(SCRATCH_PACK_PRICING).map(([quantity, { basePrice }]) => {
      const gstAmount = Math.round((basePrice * GST_PERCENTAGE) / 100);
      const totalPrice = basePrice + gstAmount;

      return {
        quantity: parseInt(quantity),
        basePrice,
        gstPercentage: GST_PERCENTAGE,
        gstAmount,
        totalPrice,
        popular: quantity === "5000", // Recommend 5000 pack
        savings: this._calculateSavings(quantity)
      };
    });
  }

  /**
   * Check user's current scratch pack balance
   * Called from: dashboard, scratch status API
   */
  async getPackBalance(ownerId, ownerType) {
    try {
      const orders = await ScratchPackOrder.find({
        ownerId,
        ownerType,
        paymentStatus: "completed",
        remaining: { $gt: 0 }
      });

      const totalRemaining = orders.reduce((sum, order) => sum + order.remaining, 0);
      const totalConsumed = orders.reduce((sum, order) => sum + order.consumed, 0);
      const totalPurchased = orders.reduce((sum, order) => sum + order.quantity, 0);

      return {
        totalPurchased,
        totalConsumed,
        totalRemaining,
        packs: orders.map(order => ({
          orderId: order._id,
          quantity: order.quantity,
          consumed: order.consumed,
          remaining: order.remaining,
          purchasedAt: order.purchasedAt,
          transactionId: order.transactionId
        }))
      };
    } catch (error) {
      console.error("[ScratchPackService] Error getting pack balance:", error);
      throw error;
    }
  }

  /**
   * Get order history for a user
   * Called from: billing/history, analytics
   */
  async getOrderHistory(ownerId, ownerType, limit = 50) {
    try {
      const orders = await ScratchPackOrder.find({
        ownerId,
        ownerType
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select("quantity basePrice gstAmount totalPrice paymentStatus transactionId purchasedAt consumed remaining");

      return orders;
    } catch (error) {
      console.error("[ScratchPackService] Error getting order history:", error);
      throw error;
    }
  }

  /**
   * PRIVATE HELPERS
   */

  _calculateSavings(quantityStr) {
    // 5000 pack: ~3% savings vs buying 1000s
    // 10000 pack: ~5% savings
    // 50000 pack: ~10% savings
    const quantity = parseInt(quantityStr);
    if (quantity <= 1000) return 0;
    if (quantity === 5000) return 3;
    if (quantity === 10000) return 5;
    if (quantity === 50000) return 10;
    return 0;
  }
}

export default new ScratchPackService();
