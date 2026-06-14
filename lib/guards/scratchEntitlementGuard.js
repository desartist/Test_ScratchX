import scratchEntitlementService from "@/lib/scratchEntitlementService";
import { connectDB } from "@/lib/connectDB";

/**
 * Scratch Entitlement Guard
 *
 * Middleware to check if user has active scratch entitlement before allowing:
 * - Create Campaign
 * - Activate Campaign
 * - Assign Campaign to Store
 * - Allocate Scratches
 * - Generate New Customer Participation
 *
 * Returns: { allowed, message, requiresAction, actionUrl }
 */
export async function checkScratchEntitlement(ownerId, ownerType = "merchant") {
  try {
    await connectDB();

    const entitlement = await scratchEntitlementService.checkEntitlement(
      ownerId,
      ownerType
    );

    if (!entitlement.hasEntitlement) {
      return {
        allowed: false,
        blockCampaignOperations: true,
        message: "Your scratch entitlement has expired. Please purchase a scratch package to continue creating campaigns.",
        actionRequired: "purchase_scratch_pack",
        actionUrl: "/billing/scratch-packs",
        requiresModal: true,
        modalTitle: "Scratch Entitlement Expired",
        modalMessage:
          "Your unlimited scratches have expired. Please purchase a scratch package to continue using ScratchX.",
      };
    }

    return {
      allowed: true,
      entitlementType: entitlement.type,
      ...entitlement,
    };
  } catch (error) {
    console.error("Scratch entitlement guard error:", error);
    // Fail open - log the error but don't block
    return {
      allowed: true,
      warning: "Could not verify scratch entitlement",
      error: error.message,
    };
  }
}

/**
 * Async wrapper for Express middleware
 */
export function scratchEntitlementMiddleware() {
  return async (req, res, next) => {
    try {
      const { account } = req;

      if (!account) {
        return res.status(401).json({
          success: false,
          error: "Unauthorized - No account found",
        });
      }

      const entitlement = await checkScratchEntitlement(
        account._id,
        account.role === "Distributor" ? "distributor" : "merchant"
      );

      // Attach to request for later use
      req.scratchEntitlement = entitlement;

      if (!entitlement.allowed) {
        return res.status(403).json({
          success: false,
          error: entitlement.message,
          requiresAction: entitlement.actionRequired,
          actionUrl: entitlement.actionUrl,
        });
      }

      next();
    } catch (error) {
      console.error("Scratch entitlement middleware error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  };
}

/**
 * Check specific operations
 */
export const ScratchOperationBlocks = {
  CREATE_CAMPAIGN: "create_campaign",
  ACTIVATE_CAMPAIGN: "activate_campaign",
  ASSIGN_CAMPAIGN: "assign_campaign",
  ALLOCATE_SCRATCHES: "allocate_scratches",
  GENERATE_PARTICIPATION: "generate_participation",
  START_CAMPAIGN: "start_campaign",
};

/**
 * Get blocked operations message
 */
export function getBlockedOperationMessage(operation) {
  const messages = {
    [ScratchOperationBlocks.CREATE_CAMPAIGN]:
      "You cannot create a campaign because your scratch entitlement has expired.",
    [ScratchOperationBlocks.ACTIVATE_CAMPAIGN]:
      "You cannot activate a campaign because your scratch entitlement has expired.",
    [ScratchOperationBlocks.ASSIGN_CAMPAIGN]:
      "You cannot assign a campaign because your scratch entitlement has expired.",
    [ScratchOperationBlocks.ALLOCATE_SCRATCHES]:
      "You cannot allocate scratches because your scratch entitlement has expired.",
    [ScratchOperationBlocks.GENERATE_PARTICIPATION]:
      "You cannot generate new participation because your scratch entitlement has expired.",
    [ScratchOperationBlocks.START_CAMPAIGN]:
      "You cannot start a campaign because your scratch entitlement has expired.",
  };

  return (
    messages[operation] ||
    "This operation requires an active scratch entitlement."
  );
}
