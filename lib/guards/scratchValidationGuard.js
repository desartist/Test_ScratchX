/**
 * Scratch Validation Guard
 * Middleware for validating scratch access before campaign operations
 * Prevents operations when scratch entitlement is expired or insufficient
 */

import ScratchEntitlementService from "@/lib/services/scratchEntitlementService.js";
import Subscription from "@/models/subscriptionModel.js";
import "@/models/subscriptionPlanModel";

class ScratchValidationGuard {
  /**
   * Validate that user has active scratch access
   * Throws error if no access
   * Returns scratch status object if valid
   */
  async validateScratchAccess(ownerId, ownerType) {
    try {
      const status = await ScratchEntitlementService.getScratchStatus(ownerId, ownerType);

      if (!status.hasAccess) {
        const error = new Error(status.message);
        error.code = status.reason || "NO_SCRATCH_ACCESS";
        error.statusCode = 402; // Payment Required
        throw error;
      }

      return status;
    } catch (error) {
      console.error("[ScratchValidationGuard] Access validation failed:", error);
      throw error;
    }
  }

  /**
   * Validate campaign creation is allowed
   * Checks: subscription exists, campaign limit not exceeded, scratch access valid
   */
  async validateCampaignCreation(ownerId, ownerType, campaignData = {}) {
    try {
      // Step 1: Check subscription exists
      const subscription = await Subscription.findOne({
        ownerId,
        ownerType,
        status: "active"
      }).populate("planId");

      if (!subscription) {
        const error = new Error("No active subscription found. Please purchase a plan first.");
        error.code = "NO_SUBSCRIPTION";
        error.statusCode = 402;
        throw error;
      }

      // Step 2: Check campaign limit from plan
      if (subscription.planId?.limits?.maxCampaigns) {
        const activeCampaignCount = (subscription.usage?.activeCampaigns) || 0;
        if (activeCampaignCount >= subscription.planId.limits.maxCampaigns) {
          const error = new Error(
            `Campaign limit exceeded. Your ${subscription.planType} plan allows ${subscription.planId.limits.maxCampaigns} active campaigns.`
          );
          error.code = "CAMPAIGN_LIMIT_EXCEEDED";
          error.statusCode = 400;
          throw error;
        }
      }

      // Step 3: Check scratch access
      const scratchStatus = await this.validateScratchAccess(ownerId, ownerType);

      return {
        subscriptionValid: true,
        scratchStatus,
        planType: subscription.planType,
        message: "Campaign creation allowed"
      };
    } catch (error) {
      console.error("[ScratchValidationGuard] Campaign creation validation failed:", error);
      throw error;
    }
  }

  /**
   * Validate campaign activation is allowed
   * Checks: scratch access valid
   */
  async validateCampaignActivation(ownerId, ownerType) {
    try {
      const scratchStatus = await this.validateScratchAccess(ownerId, ownerType);
      return scratchStatus;
    } catch (error) {
      console.error("[ScratchValidationGuard] Campaign activation validation failed:", error);
      throw error;
    }
  }

  /**
   * Validate scratch allocation is allowed
   * Checks: scratch access valid, sufficient scratches
   */
  async validateScratchAllocation(ownerId, ownerType, scratchesNeeded) {
    try {
      const scratchStatus = await this.validateScratchAccess(ownerId, ownerType);

      // For unlimited scratches, no consumption check needed
      if (scratchStatus.type === "unlimited") {
        return {
          allowed: true,
          scratchStatus,
          message: "Unlimited scratches - allocation allowed"
        };
      }

      // For pack-based scratches, check if sufficient
      if (scratchStatus.type === "packs") {
        if (scratchStatus.remaining < scratchesNeeded) {
          const error = new Error(
            `Insufficient scratches. You have ${scratchStatus.remaining}, but need ${scratchesNeeded}.`
          );
          error.code = "INSUFFICIENT_SCRATCHES";
          error.statusCode = 402;
          throw error;
        }

        return {
          allowed: true,
          scratchStatus,
          message: `Allocation allowed - ${scratchStatus.remaining} scratches available`
        };
      }
    } catch (error) {
      console.error("[ScratchValidationGuard] Scratch allocation validation failed:", error);
      throw error;
    }
  }

  /**
   * Validate store assignment is allowed
   * Checks: scratch access valid
   */
  async validateStoreAssignment(ownerId, ownerType) {
    try {
      const scratchStatus = await this.validateScratchAccess(ownerId, ownerType);
      return scratchStatus;
    } catch (error) {
      console.error("[ScratchValidationGuard] Store assignment validation failed:", error);
      throw error;
    }
  }

  /**
   * Middleware: Express middleware for route protection
   * Usage: router.post('/api/campaign/create', scratchValidationGuard.middleware(), handler)
   */
  middleware() {
    return async (req, res, next) => {
      try {
        const ownerId = req.user?._id;
        const ownerType = req.user?.role?.toLowerCase().includes("distributor") ? "distributor" : "merchant";

        if (!ownerId) {
          return res.status(401).json({
            success: false,
            error: "Unauthorized - user not found"
          });
        }

        const scratchStatus = await this.validateScratchAccess(ownerId, ownerType);
        req.scratchStatus = scratchStatus;
        next();
      } catch (error) {
        console.error("[ScratchValidationGuard] Middleware validation failed:", error);
        return res.status(error.statusCode || 402).json({
          success: false,
          error: error.message,
          code: error.code || "SCRATCH_VALIDATION_FAILED"
        });
      }
    };
  }
}

export default new ScratchValidationGuard();
