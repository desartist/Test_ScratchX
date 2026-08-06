import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import Campaign from "@/models/campaignModel";
import Range from "@/models/rangeModel";
import Store from "@/models/storeModel";

const STORE_TEAM_ROLES = ["Store_Manager", "Store_Staff"];

/**
 * GET /api/store-campaigns/[id]
 * Read-only detail view for one campaign, scoped to the caller's own store —
 * campaign info, this store's own allocation numbers, the reward ranges
 * (view-only), and this store's own details. Never exposes other stores'
 * allocation data.
 */
export async function GET(request, { params }) {
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

    const { id } = await params;

    const campaign = await Campaign.findOne({
      _id: id,
      "assignedStores.storeId": account.storeId,
      "assignedStores.status": "active",
    }).lean();

    if (!campaign) {
      return Response.json(
        { success: false, error: "Campaign not found for your store" },
        { status: 404 }
      );
    }

    const myAssignment = (campaign.assignedStores || []).find(
      (s) => String(s.storeId) === String(account.storeId) && s.status === "active"
    );

    const [ranges, store] = await Promise.all([
      Range.find({ campaignId: campaign._id }).sort({ minAmount: 1 }).lean(),
      Store.findById(account.storeId).lean(),
    ]);

    return Response.json(
      {
        success: true,
        campaign: {
          _id: campaign._id,
          name: campaign.campaignName,
          description: campaign.description,
          status: campaign.status,
          startDate: campaign.startDate,
          endDate: campaign.endDate,
          allocatedScratchCards: myAssignment?.allocated_scratch_cards ?? 0,
          usedScratchCards: myAssignment?.used_scratch_cards ?? 0,
          redeemedScratchCards: myAssignment?.redeemed_scratch_cards ?? 0,
          remainingScratchCards: myAssignment?.remaining_scratch_cards ?? 0,
        },
        ranges: ranges.map((r) => ({
          _id: r._id,
          label: r.label || `₹${r.minAmount} - ₹${r.maxAmount}`,
          minAmount: r.minAmount,
          maxAmount: r.maxAmount,
          rewards: r.rewards || [],
        })),
        store: store
          ? {
              _id: store._id,
              name: store.store_name,
              address: store.address,
              city: store.city,
              state: store.state,
              pincode: store.pincode,
              contactPerson: store.contact_person,
              contactNumber: store.contact_number,
              status: store.status,
            }
          : null,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error fetching store campaign detail:", err);
    return Response.json(
      { success: false, error: "Failed to fetch campaign details" },
      { status: 500 }
    );
  }
}
