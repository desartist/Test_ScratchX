/**
 * Inventory Management Service
 *
 * Handles inventory operations for distributor plans
 * - Track purchased vs assigned plans
 * - Update inventory on purchase and assignment
 * - Check availability before assignment
 */

import DistributorInventory from '@/models/distributorInventoryModel';

class InventoryService {
  /**
   * Get or create inventory for a distributor's plan type
   */
  async getOrCreateInventory(distributorId, planType) {
    try {
      let inventory = await DistributorInventory.findOne({
        distributorId,
        planType,
      });

      if (!inventory) {
        // Create new inventory
        inventory = new DistributorInventory({
          distributorId,
          planType,
          totalPurchased: 0,
          totalAssigned: 0,
          totalRemaining: 0,
          unitCostPrice: 0,
          totalCostPrice: 0,
        });
        await inventory.save();
        console.log(
          `[InventoryService] Created new inventory for distributor ${distributorId}, plan ${planType}`
        );
      }

      return inventory;
    } catch (error) {
      console.error('[InventoryService] Error getting/creating inventory:', error);
      throw error;
    }
  }

  /**
   * Get distributor's complete inventory
   */
  async getDistributorInventory(distributorId) {
    try {
      const inventory = await DistributorInventory.find({
        distributorId,
      })
        .populate('purchaseOrders')
        .populate('planAssignments');

      const summary = {
        totalInventory: inventory.length,
        plans: {},
        totalPurchased: 0,
        totalAssigned: 0,
        totalRemaining: 0,
      };

      inventory.forEach((inv) => {
        summary.plans[inv.planType] = {
          totalPurchased: inv.totalPurchased,
          totalAssigned: inv.totalAssigned,
          totalRemaining: inv.totalRemaining,
          unitCostPrice: inv.unitCostPrice,
          totalCostPrice: inv.totalCostPrice,
          percentageUtilized: inv.totalPurchased
            ? Math.round((inv.totalAssigned / inv.totalPurchased) * 100)
            : 0,
        };

        summary.totalPurchased += inv.totalPurchased;
        summary.totalAssigned += inv.totalAssigned;
        summary.totalRemaining += inv.totalRemaining;
      });

      return summary;
    } catch (error) {
      console.error('[InventoryService] Error getting distributor inventory:', error);
      throw error;
    }
  }

  /**
   * Update inventory on plan purchase
   * Called after order is confirmed and paid
   */
  async addToInventory(distributorId, planType, quantity, unitCostPrice, orderId) {
    try {
      const inventory = await this.getOrCreateInventory(distributorId, planType);

      // Update inventory
      inventory.totalPurchased += quantity;
      inventory.totalAssigned = inventory.totalAssigned || 0; // Ensure value exists
      inventory.totalRemaining = inventory.totalPurchased - inventory.totalAssigned;
      inventory.unitCostPrice = unitCostPrice;
      inventory.totalCostPrice = unitCostPrice * inventory.totalPurchased;
      inventory.lastPurchasedAt = new Date();

      // Add order reference
      if (orderId) {
        inventory.purchaseOrders.push(orderId);
      }

      await inventory.save();

      console.log(
        `[InventoryService] Added ${quantity} ${planType} plans to distributor ${distributorId}`
      );

      return inventory;
    } catch (error) {
      console.error('[InventoryService] Error adding to inventory:', error);
      throw error;
    }
  }

  /**
   * Check if distributor has available plans to assign
   */
  async hasAvailableInventory(distributorId, planType, quantityNeeded = 1) {
    try {
      const inventory = await DistributorInventory.findOne({
        distributorId,
        planType,
      });

      if (!inventory) {
        return false;
      }

      const available = inventory.totalRemaining >= quantityNeeded;
      return available;
    } catch (error) {
      console.error('[InventoryService] Error checking available inventory:', error);
      throw error;
    }
  }

  /**
   * Deduct from inventory when plan is assigned
   * IMPORTANT: Must be atomic to prevent double assignment
   */
  async assignFromInventory(distributorId, planType, assignmentId) {
    try {
      // Use findByIdAndUpdate for atomic operation
      const inventory = await DistributorInventory.findOneAndUpdate(
        {
          distributorId,
          planType,
          totalRemaining: { $gte: 1 }, // Check available before update
        },
        {
          $inc: { totalAssigned: 1, totalRemaining: -1 },
          $push: { planAssignments: assignmentId },
          lastAssignedAt: new Date(),
        },
        { new: true }
      );

      if (!inventory) {
        throw new Error(
          `No available inventory for distributor ${distributorId}, plan ${planType}`
        );
      }

      console.log(
        `[InventoryService] Assigned 1 ${planType} plan from distributor ${distributorId}`
      );

      return inventory;
    } catch (error) {
      console.error('[InventoryService] Error assigning from inventory:', error);
      throw error;
    }
  }

  /**
   * Return plan to inventory (revoke assignment)
   */
  async returnToInventory(distributorId, planType, assignmentId) {
    try {
      const inventory = await DistributorInventory.findOneAndUpdate(
        {
          distributorId,
          planType,
        },
        {
          $inc: { totalAssigned: -1, totalRemaining: 1 },
          $pull: { planAssignments: assignmentId },
        },
        { new: true }
      );

      if (!inventory) {
        throw new Error('Inventory not found');
      }

      console.log(
        `[InventoryService] Returned 1 ${planType} plan to distributor ${distributorId}`
      );

      return inventory;
    } catch (error) {
      console.error('[InventoryService] Error returning to inventory:', error);
      throw error;
    }
  }

  /**
   * Get inventory details for a specific plan type
   */
  async getPlanInventory(distributorId, planType) {
    try {
      const inventory = await DistributorInventory.findOne({
        distributorId,
        planType,
      });

      if (!inventory) {
        return null;
      }

      return {
        planType: inventory.planType,
        totalPurchased: inventory.totalPurchased,
        totalAssigned: inventory.totalAssigned,
        totalRemaining: inventory.totalRemaining,
        unitCostPrice: inventory.unitCostPrice,
        totalCostPrice: inventory.totalCostPrice,
        utilizationPercentage: inventory.totalPurchased
          ? Math.round((inventory.totalAssigned / inventory.totalPurchased) * 100)
          : 0,
        lastPurchasedAt: inventory.lastPurchasedAt,
        lastAssignedAt: inventory.lastAssignedAt,
      };
    } catch (error) {
      console.error('[InventoryService] Error getting plan inventory:', error);
      throw error;
    }
  }

  /**
   * Get low inventory alerts
   * Alert if remaining <= 20% of purchased
   */
  async getLowInventoryAlerts(distributorId) {
    try {
      const inventories = await DistributorInventory.find({
        distributorId,
      });

      const alerts = inventories
        .filter((inv) => {
          const utilizationPercentage = (inv.totalAssigned / inv.totalPurchased) * 100;
          return utilizationPercentage >= 80; // More than 80% assigned
        })
        .map((inv) => ({
          planType: inv.planType,
          totalRemaining: inv.totalRemaining,
          percentageUtilized: Math.round(
            (inv.totalAssigned / inv.totalPurchased) * 100
          ),
          recommendedAction: `Purchase more ${inv.planType} plans`,
        }));

      return alerts;
    } catch (error) {
      console.error('[InventoryService] Error getting low inventory alerts:', error);
      throw error;
    }
  }

  /**
   * Get inventory history (all purchases)
   */
  async getInventoryHistory(distributorId, planType = null) {
    try {
      const query = { distributorId };
      if (planType) query.planType = planType;

      const inventories = await DistributorInventory.find(query)
        .populate('purchaseOrders', 'orderNumber orderStatus createdAt pricing.grandTotal')
        .sort({ createdAt: -1 });

      return inventories;
    } catch (error) {
      console.error('[InventoryService] Error getting inventory history:', error);
      throw error;
    }
  }
}

export default new InventoryService();
