import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import CampaignStoreMapping from "@/models/campaignStoreMappingModel";

const STORE_TEAM_ROLES = ["Store_Manager", "Store_Staff"];

/**
 * GET /api/store-campaigns
 * Campaigns allocated to the authenticated Store_Manager/Store_Staff's store,
 * with this store's own allocation numbers. Read-only.
 */
export async function GET() {
  try {
    await connectDB();
    const { account, error } = await requireAuth();
    if (error) return error;

    if (!STORE_TEAM_ROLES.includes(account.role)) {
      return Response.json(
        { success: false, error: "This page is for store team accounts only" },
        { status: 403 }
      );
    }

    if (!account.storeId) {
      return Response.json(
        { success: false, error: "No store is assigned to this account. Contact your business owner." },
        { status: 404 }
      );
    }

    const mappings = await CampaignStoreMapping.find({ store_id: account.storeId })
      .populate("campaign_id", "campaignName startDate endDate status")
      .sort({ createdAt: -1 });

    const campaigns = mappings
      .filter((m) => m.campaign_id)
      .map((m) => ({
        _id: m.campaign_id._id,
        name: m.campaign_id.campaignName,
        status: m.campaign_id.status,
        startDate: m.campaign_id.startDate,
        endDate: m.campaign_id.endDate,
        allocationStatus: m.status,
        allocatedScratchCards: m.allocated_scratch_cards,
        usedScratchCards: m.used_scratch_cards,
        redeemedScratchCards: m.redeemed_scratch_cards,
        remainingScratchCards: m.remaining_scratch_cards,
      }));

    return Response.json({ success: true, campaigns }, { status: 200 });
  } catch (err) {
    console.error("Error fetching store campaigns:", err);
    return Response.json(
      { success: false, error: "Failed to fetch campaigns" },
      { status: 500 }
    );
  }
}
