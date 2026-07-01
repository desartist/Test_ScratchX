/**
 * Plan Assignment Service
 *
 * Handles plan assignment workflow
 * - Assign plans to retailers
 * - Create subscriptions
 * - Update inventory
 * - Record commissions
 */

import PlanAssignment from '@/models/planAssignmentModel';
import Subscription from '@/models/subscriptionModel';
import inventoryService from './inventoryService';
import commissionService from './commissionService';
import transactionService from './transactionService';
import DistributorAuditLog from '@/models/distributorAuditLogModel';

class AssignmentService {
  /**
   * Assign a plan to a retailer
   * This is the main workflow that ties everything together
   */
  async assignPlanToRetailer(assignmentData, assignedBy) {
    const session = null; // For transactions if needed

    try {
      const {
        distributorId,
        retailerId,
        planType,
        planId,
        planMRP,
        notes,
      } = assignmentData;

      // 1. Check if retailer already has an active subscription
      const existingSubscription = await Subscription.findOne({
        ownerId: retailerId,
        status: { $in: ['active', 'trial'] },
      });

      if (existingSubscription) {
        throw new Error('Retailer already has an active subscription');
      }

      // 2. Check inventory availability
      const hasInventory = await inventoryService.hasAvailableInventory(
        distributorId,
        planType
      );

      if (!hasInventory) {
        throw new Error(`No available ${planType} plans in inventory`);
      }

      // 3. Get commission percentage
      const commissionPercentage = await commissionService.getCommissionPercentage(
        distributorId
      );

      // 4. Create subscription
      const subscription = new Subscription({
        ownerId: retailerId,
        ownerType: 'merchant',
        merchantId: retailerId,
        planId,
        planType,
        distributorId,
        status: 'active',
        billingCycle: 'one-time',
        purchaseDate: new Date(),
      });

      await subscription.save();

      // 5. Create plan assignment record
      const assignmentNumber = `ASGN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const assignment = new PlanAssignment({
        assignmentNumber,
        distributorId,
        retailerId,
        planType,
        planId,
        planName: this.getPlanName(planType),
        subscriptionId: subscription._id,
        assignmentValue: planMRP,
        distributorCostPrice: planMRP - (planMRP * commissionPercentage) / 100,
        distributorProfit: (planMRP * commissionPercentage) / 100,
        status: 'active',
        assignedAt: new Date(),
        retailerActivated: true,
        retailerActivatedAt: new Date(),
        notes,
        createdBy: assignedBy,
      });

      await assignment.save();

      // 6. Update inventory
      const inventoryId = (
        await inventoryService.getOrCreateInventory(distributorId, planType)
      )._id;
      assignment.inventoryId = inventoryId;
      await assignment.save();

      await inventoryService.assignFromInventory(
        distributorId,
        planType,
        assignment._id
      );

      // 7. Record commission earned
      const commission = await commissionService.recordCommission(
        assignment._id,
        {
          distributorId,
          retailerId,
          planType,
          planMRP,
          commissionPercentage,
          assignedAt: new Date(),
        }
      );

      // 8. Record transaction
      await transactionService.recordTransaction({
        distributorId,
        transactionType: 'assignment',
        amount: planMRP,
        transactionDirection: 'credit', // Assignment generates potential revenue
        referenceType: 'assignment',
        referenceId: assignment._id,
        description: `Plan assignment: ${planType} to retailer`,
        createdBy: assignedBy,
      });

      // 9. Create audit log
      await this.createAuditLog({
        actorId: assignedBy,
        action: 'assign_plan',
        targetType: 'plan_assignment',
        targetId: assignment._id,
        distributorId,
        impact: 'high',
        changes: {
          before: null,
          after: {
            retailerId,
            planType,
            status: 'active',
          },
        },
        createdBy: assignedBy,
      });

      console.log(`[AssignmentService] Assigned ${planType} plan to retailer ${retailerId}`);

      return {
        assignment,
        subscription,
        commission,
      };
    } catch (error) {
      console.error('[AssignmentService] Error assigning plan:', error);
      throw error;
    }
  }

  /**
   * Get assignment details
   */
  async getAssignmentDetails(assignmentId, distributorId) {
    try {
      const assignment = await PlanAssignment.findById(assignmentId)
        .populate('subscriptionId')
        .populate('retailerId', 'email name profile');

      if (!assignment) {
        throw new Error('Assignment not found');
      }

      if (assignment.distributorId.toString() !== distributorId.toString()) {
        throw new Error('Unauthorized');
      }

      return assignment;
    } catch (error) {
      console.error('[AssignmentService] Error getting assignment details:', error);
      throw error;
    }
  }

  /**
   * Revoke a plan assignment
   */
  async revokeAssignment(assignmentId, distributorId, reason, revokedBy) {
    try {
      const assignment = await PlanAssignment.findById(assignmentId);

      if (!assignment) {
        throw new Error('Assignment not found');
      }

      if (assignment.distributorId.toString() !== distributorId.toString()) {
        throw new Error('Unauthorized');
      }

      if (assignment.status !== 'active') {
        throw new Error('Only active assignments can be revoked');
      }

      // 1. Update assignment status
      assignment.status = 'revoked';
      assignment.revokedAt = new Date();
      assignment.revokeReason = reason;
      assignment.revokedBy = revokedBy;

      await assignment.save();

      // 2. Cancel subscription
      const subscription = await Subscription.findByIdAndUpdate(
        assignment.subscriptionId,
        {
          status: 'cancelled',
          cancelledAt: new Date(),
        },
        { new: true }
      );

      // 3. Return inventory
      await inventoryService.returnToInventory(
        distributorId,
        assignment.planType,
        assignment._id
      );

      // 4. Reverse commission
      // TODO: Find and reverse associated commissions

      // 5. Create audit log
      await this.createAuditLog({
        actorId: revokedBy,
        action: 'revoke_plan',
        targetType: 'plan_assignment',
        targetId: assignment._id,
        distributorId,
        impact: 'high',
        changes: {
          before: { status: 'active' },
          after: { status: 'revoked', revokeReason: reason },
        },
        createdBy: revokedBy,
      });

      console.log(`[AssignmentService] Revoked assignment: ${assignmentId}`);

      return {
        assignment,
        subscription,
      };
    } catch (error) {
      console.error('[AssignmentService] Error revoking assignment:', error);
      throw error;
    }
  }

  /**
   * Get all assignments for a distributor
   */
  async getDistributorAssignments(distributorId, filters = {}) {
    try {
      const query = { distributorId };

      if (filters.status) query.status = filters.status;
      if (filters.planType) query.planType = filters.planType;
      if (filters.retailerId) query.retailerId = filters.retailerId;

      const assignments = await PlanAssignment.find(query)
        .populate('retailerId', 'email name profile')
        .populate('subscriptionId')
        .sort({ createdAt: -1 })
        .limit(filters.limit || 50)
        .skip(filters.skip || 0);

      const total = await PlanAssignment.countDocuments(query);

      return {
        assignments,
        total,
        page: Math.floor((filters.skip || 0) / (filters.limit || 50)) + 1,
      };
    } catch (error) {
      console.error('[AssignmentService] Error getting distributor assignments:', error);
      throw error;
    }
  }

  /**
   * Get retailer's assignment history
   */
  async getRetailerAssignmentHistory(retailerId, distributorId) {
    try {
      const assignments = await PlanAssignment.find({
        retailerId,
        distributorId,
      })
        .populate('subscriptionId')
        .sort({ createdAt: -1 });

      return assignments;
    } catch (error) {
      console.error('[AssignmentService] Error getting retailer assignment history:', error);
      throw error;
    }
  }

  /**
   * Get assignment statistics
   */
  async getAssignmentStats(distributorId) {
    try {
      const assignments = await PlanAssignment.find({ distributorId });

      const stats = {
        totalAssignments: assignments.length,
        activeAssignments: assignments.filter((a) => a.status === 'active').length,
        revokedAssignments: assignments.filter((a) => a.status === 'revoked').length,
        byPlanType: {
          CORE: assignments.filter((a) => a.planType === 'CORE').length,
          SMART: assignments.filter((a) => a.planType === 'SMART').length,
        },
        totalAssignmentValue: assignments
          .filter((a) => a.status === 'active')
          .reduce((sum, a) => sum + a.assignmentValue, 0),
        totalProfit: assignments
          .filter((a) => a.status === 'active')
          .reduce((sum, a) => sum + a.distributorProfit, 0),
      };

      return stats;
    } catch (error) {
      console.error('[AssignmentService] Error getting assignment stats:', error);
      throw error;
    }
  }

  /**
   * Get plan name from plan type
   */
  getPlanName(planType) {
    const names = {
      CORE: 'ScratchX Core',
      SMART: 'ScratchX Smart',
    };
    return names[planType] || planType;
  }

  /**
   * Create audit log
   */
  async createAuditLog(logData) {
    try {
      const auditLog = new DistributorAuditLog({
        logId: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...logData,
      });

      await auditLog.save();
      return auditLog;
    } catch (error) {
      console.error('[AssignmentService] Error creating audit log:', error);
      // Don't throw - audit logs shouldn't break the main flow
    }
  }
}

export default new AssignmentService();
