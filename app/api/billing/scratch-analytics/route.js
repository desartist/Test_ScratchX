import { requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/connectDB";
import Subscription from "@/models/subscriptionModel";
import ScratchPackOrder from "@/models/scratchPackOrderModel";
import Campaign from "@/models/campaignModel";

/**
 * GET /api/billing/scratch-analytics
 *
 * Get scratch consumption analytics for the merchant/distributor
 *
 * Query parameters:
 * - period: "7days" | "30days" | "90days" | "all" (default: "30days")
 * - includeBreakdown: true (includes pack-by-pack breakdown)
 *
 * Response:
 * {
 *   success: true,
 *   analytics: {
 *     totalPurchased: 50000,
 *     totalConsumed: 12345,
 *     totalRemaining: 37655,
 *     consumptionRate: 24.69,
 *     unlimitedStatus: { ... },
 *     packBreakdown: [
 *       { packId, packName, purchased, consumed, remaining, expiresAt }
 *     ],
 *     dailyUsage: [
 *       { date, scratches_used, campaigns_created, total_scans }
 *     ],
 *     trends: {
 *       averageDailyUsage: 500,
 *       projectedExhaustionDate: "2026-07-15"
 *     }
 *   }
 * }
 */
export async function GET(request) {
  try {
    await connectDB();
    const { account, error } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "30days";
    const includeBreakdown = searchParams.get("includeBreakdown") === "true";

    // ========== DETERMINE OWNER TYPE ==========
    const ownerType = account.role === "Distributor" ? "distributor" : "merchant";

    // ========== GET SUBSCRIPTION ==========
    const subscription = await Subscription.findOne({
      ownerId: account._id,
      ownerType,
      status: { $in: ["trial", "active"] },
    });

    if (!subscription) {
      return Response.json(
        {
          success: false,
          error: "No active subscription found",
        },
        { status: 400 }
      );
    }

    // ========== CALCULATE PERIOD ==========
    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case "7days":
        startDate.setDate(now.getDate() - 7);
        break;
      case "30days":
        startDate.setDate(now.getDate() - 30);
        break;
      case "90days":
        startDate.setDate(now.getDate() - 90);
        break;
      case "all":
        startDate = new Date("2020-01-01");
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // ========== GET SCRATCH PACKS ==========
    const scratchPacks = await ScratchPackOrder.find({
      subscriptionId: subscription._id,
      status: { $in: ["active", "expired"] },
    }).populate("packId", "name quantity");

    let totalPurchased = 0;
    let totalRemaining = 0;
    const packBreakdown = [];

    for (const pack of scratchPacks) {
      const purchased = pack.scratchQuantity;
      const consumed = purchased - pack.remaining;
      const remaining = pack.remaining;

      totalPurchased += purchased;
      totalRemaining += remaining;

      if (includeBreakdown) {
        packBreakdown.push({
          packId: pack._id,
          packName: pack.packId?.name || "Unknown Pack",
          purchased,
          consumed,
          remaining,
          consumptionPercentage:
            purchased > 0 ? ((consumed / purchased) * 100).toFixed(2) : 0,
          expiresAt: pack.validUntil,
          status: pack.status,
          purchasedAt: pack.paidAt,
        });
      }
    }

    const totalConsumed = totalPurchased - totalRemaining;
    const consumptionRate =
      totalPurchased > 0
        ? ((totalConsumed / totalPurchased) * 100).toFixed(2)
        : 0;

    // ========== GET UNLIMITED SCRATCHES STATUS ==========
    let unlimitedStatus = null;
    if (subscription.unlimitedScratches?.isActive) {
      const daysRemaining = Math.ceil(
        (subscription.unlimitedScratches.validUntil - now) / (1000 * 60 * 60 * 24)
      );
      unlimitedStatus = {
        isActive: true,
        validUntil: subscription.unlimitedScratches.validUntil,
        daysRemaining,
        purchasedAt: subscription.unlimitedScratches.purchasedAt,
      };
    }

    // ========== GET CAMPAIGNS USING SCRATCHES ==========
    const campaigns = await Campaign.find({
      $or: [
        { createdBy: account._id },
        { "assignedStores.owner": account._id },
      ],
      createdAt: { $gte: startDate },
    }).select("_id scratchAllocation allocatedScratches createdAt");

    // Calculate daily usage
    const dailyUsageMap = new Map();

    for (const campaign of campaigns) {
      const dateKey = campaign.createdAt.toISOString().split("T")[0];
      if (!dailyUsageMap.has(dateKey)) {
        dailyUsageMap.set(dateKey, {
          date: dateKey,
          scratches_used: 0,
          campaigns_created: 0,
          total_allocations: 0,
        });
      }

      const dayData = dailyUsageMap.get(dateKey);
      dayData.campaigns_created += 1;
      dayData.scratches_used += campaign.scratchAllocation || 0;
      dayData.total_allocations += campaign.allocatedScratches?.length || 0;
    }

    const dailyUsage = Array.from(dailyUsageMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    // ========== CALCULATE TRENDS ==========
    let projectedExhaustionDate = null;
    let averageDailyUsage = 0;

    if (dailyUsage.length > 0) {
      const totalScratches = dailyUsage.reduce((sum, day) => sum + day.scratches_used, 0);
      averageDailyUsage = Math.round(totalScratches / dailyUsage.length);

      // Project when scratches will run out
      if (averageDailyUsage > 0 && totalRemaining > 0) {
        const daysUntilExhaustion = Math.ceil(totalRemaining / averageDailyUsage);
        projectedExhaustionDate = new Date(now.getTime() + daysUntilExhaustion * 24 * 60 * 60 * 1000);
      }
    }

    // ========== RESPONSE ==========
    return Response.json(
      {
        success: true,
        analytics: {
          period,
          startDate,
          endDate: now,
          totalPurchased,
          totalConsumed,
          totalRemaining,
          consumptionRate: parseFloat(consumptionRate),
          unlimitedStatus,
          packBreakdown: includeBreakdown ? packBreakdown : undefined,
          dailyUsage,
          trends: {
            averageDailyUsage,
            projectedExhaustionDate: projectedExhaustionDate?.toISOString(),
            totalCampaignsInPeriod: campaigns.length,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Scratch analytics error:", error);
    return Response.json(
      {
        success: false,
        error: error.message || "Failed to fetch analytics",
      },
      { status: 500 }
    );
  }
}
