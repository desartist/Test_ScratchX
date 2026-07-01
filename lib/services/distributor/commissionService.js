/**
 * Commission Engine Service
 *
 * Handles all commission-related calculations and operations
 * - Calculate distributor cost price (after commission)
 * - Track earned commissions
 * - Calculate payouts
 * - Apply taxes
 */

import DistributorCommission from '@/models/distributorCommissionModel';
import Distributor from '@/models/distributorModel';
import DistributorPayout from '@/models/distributorPayoutModel';

class CommissionService {
  /**
   * Get distributor's commission percentage
   * Set by Super Admin, read-only for distributor
   */
  async getCommissionPercentage(distributorId) {
    try {
      const distributor = await Distributor.findById(distributorId).select(
        'commission.percentagePerSale'
      );
      if (!distributor) {
        throw new Error('Distributor not found');
      }
      return distributor.commission?.percentagePerSale || 0;
    } catch (error) {
      console.error('[CommissionService] Error getting commission %:', error);
      throw error;
    }
  }

  /**
   * Calculate distributor's cost price for a plan
   * Formula: MRP × (1 - commission% / 100)
   */
  calculateDistributorCostPrice(planMRP, commissionPercentage) {
    if (!planMRP || !commissionPercentage) {
      throw new Error('Invalid planMRP or commissionPercentage');
    }

    const discountAmount = (planMRP * commissionPercentage) / 100;
    const costPrice = planMRP - discountAmount;

    return {
      planMRP,
      commissionPercentage,
      discountAmount: Math.round(discountAmount * 100) / 100,
      costPrice: Math.round(costPrice * 100) / 100,
    };
  }

  /**
   * Calculate batch pricing for multiple plan purchases
   * Used in Plan Marketplace checkout
   */
  calculateBatchPricing(items, commissionPercentage) {
    try {
      if (!Array.isArray(items) || items.length === 0) {
        throw new Error('Items array required');
      }

      let subtotalMRP = 0;
      let totalDiscount = 0;
      let subtotal = 0;

      const calculatedItems = items.map((item) => {
        const itemMRP = item.unitMRP * item.quantity;
        const itemDiscount = (itemMRP * commissionPercentage) / 100;
        const itemCostPrice = itemMRP - itemDiscount;

        subtotalMRP += itemMRP;
        totalDiscount += itemDiscount;
        subtotal += itemCostPrice;

        return {
          ...item,
          itemMRP,
          itemDiscount: Math.round(itemDiscount * 100) / 100,
          itemCostPrice: Math.round(itemCostPrice * 100) / 100,
        };
      });

      const gst = Math.round((subtotal * 0.18) * 100) / 100; // 18% GST
      const grandTotal = subtotal + gst;

      return {
        items: calculatedItems,
        subtotalMRP: Math.round(subtotalMRP * 100) / 100,
        totalDiscount: Math.round(totalDiscount * 100) / 100,
        subtotal: Math.round(subtotal * 100) / 100,
        gst: Math.round(gst * 100) / 100,
        grandTotal: Math.round(grandTotal * 100) / 100,
      };
    } catch (error) {
      console.error('[CommissionService] Error calculating batch pricing:', error);
      throw error;
    }
  }

  /**
   * Record earned commission from plan assignment
   */
  async recordCommission(planAssignmentId, assignmentData) {
    try {
      const {
        distributorId,
        retailerId,
        planType,
        planMRP,
        commissionPercentage,
        assignedAt,
      } = assignmentData;

      const commissionAmount = (planMRP * commissionPercentage) / 100;

      const commission = new DistributorCommission({
        commissionId: `COMM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        distributorId,
        sourceType: 'plan_assignment',
        planAssignmentId,
        retailerId,
        planType,
        planMRP,
        commissionPercentage,
        commissionAmount: Math.round(commissionAmount * 100) / 100,
        status: 'earned',
        earnedAt: assignedAt || new Date(),
      });

      await commission.save();

      console.log(`[CommissionService] Commission recorded: ${commission.commissionId}`);
      return commission;
    } catch (error) {
      console.error('[CommissionService] Error recording commission:', error);
      throw error;
    }
  }

  /**
   * Get commission summary for a distributor
   */
  async getCommissionSummary(distributorId, startDate, endDate) {
    try {
      const query = {
        distributorId,
        status: { $in: ['earned', 'approved', 'paid'] },
      };

      if (startDate && endDate) {
        query.earnedAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      const commissions = await DistributorCommission.find(query);

      const summary = {
        totalEarned: commissions
          .filter((c) => c.status === 'earned')
          .reduce((sum, c) => sum + c.commissionAmount, 0),
        totalApproved: commissions
          .filter((c) => c.status === 'approved')
          .reduce((sum, c) => sum + c.commissionAmount, 0),
        totalPaid: commissions
          .filter((c) => c.status === 'paid')
          .reduce((sum, c) => sum + c.commissionAmount, 0),
        pending: commissions.filter((c) => c.status === 'earned').length,
        approved: commissions.filter((c) => c.status === 'approved').length,
        paid: commissions.filter((c) => c.status === 'paid').length,
        commissions,
      };

      return summary;
    } catch (error) {
      console.error('[CommissionService] Error getting commission summary:', error);
      throw error;
    }
  }

  /**
   * Approve commissions for payout
   */
  async approveCommissionsForPayout(commissionIds, approvedBy) {
    try {
      const result = await DistributorCommission.updateMany(
        { _id: { $in: commissionIds }, status: 'earned' },
        {
          status: 'approved',
          approvedAt: new Date(),
          approvedBy,
        }
      );

      console.log(`[CommissionService] Approved ${result.modifiedCount} commissions`);
      return result;
    } catch (error) {
      console.error('[CommissionService] Error approving commissions:', error);
      throw error;
    }
  }

  /**
   * Calculate payout amount with deductions
   */
  calculatePayoutAmount(totalCommissions, adjustments = 0, reversals = 0, taxes = 0, fees = 0) {
    const payoutAmount =
      totalCommissions + adjustments - reversals - taxes - fees;

    return {
      totalCommissions: Math.round(totalCommissions * 100) / 100,
      adjustments: Math.round(adjustments * 100) / 100,
      reversals: Math.round(reversals * 100) / 100,
      taxes: Math.round(taxes * 100) / 100,
      fees: Math.round(fees * 100) / 100,
      payoutAmount: Math.round(payoutAmount * 100) / 100,
    };
  }

  /**
   * Reverse a commission (refund case)
   */
  async reverseCommission(commissionId, reason, reversedBy) {
    try {
      const commission = await DistributorCommission.findByIdAndUpdate(
        commissionId,
        {
          status: 'reversed',
          reversedAt: new Date(),
          reversalReason: reason,
        },
        { new: true }
      );

      if (!commission) {
        throw new Error('Commission not found');
      }

      console.log(`[CommissionService] Commission reversed: ${commissionId}`);
      return commission;
    } catch (error) {
      console.error('[CommissionService] Error reversing commission:', error);
      throw error;
    }
  }

  /**
   * Get unpaid commissions for a distributor
   */
  async getUnpaidCommissions(distributorId) {
    try {
      const unpaid = await DistributorCommission.find({
        distributorId,
        status: { $in: ['earned', 'approved'] },
      });

      const total = unpaid.reduce((sum, c) => sum + c.commissionAmount, 0);

      return {
        count: unpaid.length,
        total: Math.round(total * 100) / 100,
        commissions: unpaid,
      };
    } catch (error) {
      console.error('[CommissionService] Error getting unpaid commissions:', error);
      throw error;
    }
  }
}

export default new CommissionService();
