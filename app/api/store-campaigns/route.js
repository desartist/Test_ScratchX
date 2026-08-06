import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import Campaign from "@/models/campaignModel";
import Range from "@/models/rangeModel";

const STORE_TEAM_ROLES = ["Store_Manager", "Store_Staff"];

/**
 * GET /api/store-campaigns
 * Campaigns allocated to the authenticated Store_Manager/Store_Staff's store,
 * with this store's own allocation numbers. Read-only.
 *
 * Reads Campaign.assignedStores[] directly — the real "Create Campaign" wizard
 * (app/(dashboard)/campaign/new) writes store allocations there, not to the
 * separate CampaignStoreMapping collection (that collection is only written
 * by the older manual /api/inventory/allocate reallocation path, which the
 * standard campaign-launch flow never calls).
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

    const campaignDocs = await Campaign.find({
      "assignedStores.storeId": account.storeId,
      "assignedStores.status": "active",
    })
      .select("campaignName description startDate endDate status assignedStores")
      .sort({ createdAt: -1 })
      .lean();

    const campaignIds = campaignDocs.map((c) => c._id);
    const ranges = await Range.find({ campaignId: { $in: campaignIds } }).lean();
    const lastRangeByCampaign = {};
    for (const r of ranges) {
      lastRangeByCampaign[String(r.campaignId)] = r; // last write wins, matches merchant page's "last added range"
    }

    const campaigns = campaignDocs.map((c) => {
      const activeStores = (c.assignedStores || []).filter((s) => s.status === "active");
      const myAssignment = activeStores.find((s) => String(s.storeId) === String(account.storeId));
      const range = lastRangeByCampaign[String(c._id)];

      return {
        _id: c._id,
        name: c.campaignName,
        description: c.description,
        status: c.status,
        startDate: c.startDate,
        endDate: c.endDate,
        storeCount: activeStores.length,
        priceRange: range ? range.label || `₹${range.minAmount}-₹${range.maxAmount}` : null,
        hasRanges: Boolean(range),
        allocationStatus: myAssignment?.status,
        allocatedScratchCards: myAssignment?.allocated_scratch_cards ?? 0,
        usedScratchCards: myAssignment?.used_scratch_cards ?? 0,
        redeemedScratchCards: myAssignment?.redeemed_scratch_cards ?? 0,
        remainingScratchCards: myAssignment?.remaining_scratch_cards ?? 0,
      };
    });

    return Response.json({ success: true, campaigns }, { status: 200 });
  } catch (err) {
    console.error("Error fetching store campaigns:", err);
    return Response.json(
      { success: false, error: "Failed to fetch campaigns" },
      { status: 500 }
    );
  }
}
