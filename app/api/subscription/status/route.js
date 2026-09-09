import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import Subscription from "@/models/subscriptionModel";
import "@/models/subscriptionPlanModel";
import CustomerParticipation from "@/models/customerParticipationModel";

/**
 * GET /api/subscription/status
 *
 * Returns complete subscription and entitlement status for authenticated user
 *
 * Response when HAS plan:
 * {
 *   success: true,
 *   hasActivePlan: true,
 *   plan: "CORE" | "SMART",
 *   platformAccess: "LIFETIME",
 *   unlimitedScratches: boolean,
 *   remainingDays: number | null,
 *   unlimitedScratchesExpiryDate: "2024-12-31T00:00:00.000Z" | null,
 *   scratchRemaining: number | "UNLIMITED",
 *   scratchPurchased: number,
 *   scratchConsumed: number,
 *   scratchPacksPurchased: number,  // real purchased-pack total, always a number
 *   scratchPacksRemaining: number   // real purchased-pack balance, always a number
 * }
 *
 * Response when NO plan:
 * {
 *   success: true,
 *   hasActivePlan: false,
 *   plan: null,
 *   platformAccess: null,
 *   unlimitedScratches: false,
 *   remainingDays: null,
 *   unlimitedScratchesExpiryDate: null,
 *   scratchRemaining: 0,
 *   scratchPurchased: 0,
 *   scratchConsumed: 0,
 *   scratchPacksPurchased: 0,
 *   scratchPacksRemaining: 0
 * }
 */
export async function GET() {
  try {
    await connectDB();
    const { account, error } = await requireAuth();
    if (error) return error;

    // Determine ownerType from account role
    // Managers inherit their parent merchant's subscription
    const isManager = account.role === "Manager";
    const ownerId = isManager ? account.parentId : account._id;
    const ownerType = account.role === "Distributor" ? "distributor" : "merchant";

    // Query Subscription with planId population
    const subscription = await Subscription.findOne({
      ownerId,
      ownerType,
      status: { $in: ["trial", "active", "past_due"] },
    })
      .populate("planId", "name planType")
      .lean();

    // If no subscription: return hasActivePlan: false with NONE values
    if (!subscription) {
      return Response.json(
        {
          success: true,
          hasActivePlan: false,
          plan: null,
          platformAccess: null,
          unlimitedScratches: false,
          remainingDays: null,
          unlimitedScratchesExpiryDate: null,
          scratchRemaining: 0,
          scratchPurchased: 0,
          scratchConsumed: 0,
          scratchPacksPurchased: 0,
          scratchPacksRemaining: 0,
        },
        { status: 200 }
      );
    }

    // Subscription exists - build complete status
    const now = new Date();
    let unlimitedScratchesActive = false;
    let remainingDays = null;
    let unlimitedScratchesExpiryDate = null;
    let scratchRemaining = 0;
    let scratchPurchased = 0;

    // Real purchased-pack numbers — computed unconditionally (regardless of
    // whether the unlimited-scratches grant is currently active) so callers
    // that want the actual figures a merchant has bought always have them,
    // rather than only when the unlimited grant has lapsed. See
    // scratchPacksPurchased/scratchPacksRemaining below — added alongside
    // the existing scratchPurchased/scratchRemaining fields (kept exactly
    // as before, "UNLIMITED" placeholder included) so nothing already
    // reading those two fields changes behavior.
    const scratchPacksPurchased = calculateTotalScratchPurchased(subscription);
    const scratchPacksRemaining = calculateScratchRemaining(subscription);

    // Check if unlimitedScratches are active and not expired
    if (
      subscription.unlimitedScratches?.isActive &&
      subscription.unlimitedScratches?.validUntil
    ) {
      const validUntil = new Date(subscription.unlimitedScratches.validUntil);
      if (validUntil > now) {
        unlimitedScratchesActive = true;
        remainingDays = Math.ceil((validUntil - now) / (24 * 60 * 60 * 1000));
        unlimitedScratchesExpiryDate = subscription.unlimitedScratches.validUntil.toISOString();
        scratchRemaining = "UNLIMITED";
      } else {
        // Unlimited scratches expired - calculate from purchased packs
        scratchRemaining = scratchPacksRemaining;
        scratchPurchased = scratchPacksPurchased;
      }
    } else {
      // No unlimited scratches - calculate from purchased packs
      scratchRemaining = scratchPacksRemaining;
      scratchPurchased = scratchPacksPurchased;
    }

    // Get plan name — fall back to planType when planId is null (hardcoded plans)
    const rawPlan = subscription.planId?.name || subscription.planType || null;
    const planName = rawPlan
      ? rawPlan.charAt(0).toUpperCase() + rawPlan.slice(1).toLowerCase()
      : null;

    // Calculate scratches consumed — count live from actual participation records
    const scratchConsumed = await CustomerParticipation.countDocuments({
      merchant_id: ownerId,
      status: { $in: ["scratched", "revealed", "redeemed"] },
    });

    return Response.json(
      {
        success: true,
        hasActivePlan: true,
        plan: planName,
        platformAccess: "LIFETIME",
        unlimitedScratches: unlimitedScratchesActive,
        remainingDays,
        unlimitedScratchesExpiryDate,
        scratchRemaining,
        scratchPurchased,
        scratchConsumed,
        // Real scratch-pack numbers, always a number (never "UNLIMITED") —
        // for surfaces that show the merchant's actual purchased/remaining
        // balance instead of the unlimited-grant framing above.
        scratchPacksPurchased,
        scratchPacksRemaining,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching subscription status:", error);
    return Response.json(
      {
        success: false,
        error: "Error fetching subscription status",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Calculate total remaining scratches from all scratch packs
 */
function calculateScratchRemaining(subscription) {
  if (!subscription.scratchPacks || subscription.scratchPacks.length === 0) {
    return 0;
  }

  return subscription.scratchPacks.reduce((total, pack) => {
    return total + (pack.remaining || 0);
  }, 0);
}

/**
 * Calculate total scratches purchased across all packs
 */
function calculateTotalScratchPurchased(subscription) {
  if (!subscription.scratchPacks || subscription.scratchPacks.length === 0) {
    return 0;
  }

  return subscription.scratchPacks.reduce((total, pack) => {
    return total + (pack.quantity || 0);
  }, 0);
}
