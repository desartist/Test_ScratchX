import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import Store from "@/models/storeModel";
import Campaign from "@/models/campaignModel";
import CustomerParticipation from "@/models/customerParticipationModel";

const STORE_TEAM_ROLES = ["Store_Manager", "Store_Staff"];

/**
 * GET /api/store-view
 * Full read-only detail view of the authenticated Store_Manager/Store_Staff's
 * own store — mirrors the merchant's /api/stores/[id] response shape (hero
 * stats + store fields + assigned campaigns), scoped to account.storeId only.
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

    const store = await Store.findOne({ _id: account.storeId, isDeleted: false }).lean();
    if (!store) {
      return Response.json(
        { success: false, error: "Assigned store not found" },
        { status: 404 }
      );
    }

    const campaignDocs = await Campaign.find({
      "assignedStores.storeId": store._id,
      "assignedStores.status": "active",
    })
      .select("campaignName status startDate endDate assignedStores")
      .sort({ createdAt: -1 })
      .lean();

    const campaigns = campaignDocs.map((c) => {
      const myAssignment = (c.assignedStores || []).find(
        (s) => String(s.storeId) === String(store._id) && s.status === "active"
      );
      return {
        _id: c._id,
        name: c.campaignName,
        status: c.status,
        startDate: c.startDate,
        endDate: c.endDate,
        allocated: myAssignment?.allocated_scratch_cards ?? 0,
        used: myAssignment?.used_scratch_cards ?? 0,
        remaining: myAssignment?.remaining_scratch_cards ?? 0,
      };
    });

    const metricsRows = await CustomerParticipation.aggregate([
      { $match: { store_id: store._id } },
      {
        $group: {
          _id: null,
          scans: { $sum: 1 },
          conversions: { $sum: { $cond: [{ $eq: ["$status", "redeemed"] }, 1, 0] } },
          mobiles: { $addToSet: "$customer_mobile" },
        },
      },
      { $project: { scans: 1, conversions: 1, customers: { $size: "$mobiles" } } },
    ]);
    const metrics = metricsRows[0] || { scans: 0, conversions: 0, customers: 0 };

    return Response.json(
      {
        success: true,
        store: {
          _id: store._id,
          store_name: store.store_name,
          address: store.address,
          city: store.city,
          state: store.state,
          pincode: store.pincode,
          contact_person: store.contact_person,
          contact_number: store.contact_number,
          status: store.status,
          is_main_store: !!store.is_main_store,
        },
        stats: {
          activeCampaigns: campaigns.filter((c) => c.status === "active").length,
          totalScans: metrics.scans,
          conversions: metrics.conversions,
          totalCustomers: metrics.customers,
        },
        campaigns,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error fetching store view:", err);
    return Response.json(
      { success: false, error: "Failed to load store details" },
      { status: 500 }
    );
  }
}
