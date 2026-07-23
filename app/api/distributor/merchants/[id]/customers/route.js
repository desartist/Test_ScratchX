import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import Account from "@/models/accountModel";
import CustomerParticipation from "@/models/customerParticipationModel";
import Campaign from "@/models/campaignModel";
import Store from "@/models/storeModel";
import Range from "@/models/rangeModel";
import "@/models/scratchCardRecordModel";

function distributorOrAdmin(account) {
  if (!["Super_Admin", "Distributor"].includes(account.role)) {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
  return null;
}

// GET /api/distributor/merchants/[id]/customers — a single merchant's
// customer participations, viewed by their distributor (or Super_Admin).
// Same filter/pagination/stats shape as /api/customers, but merchant_id
// comes from the route param instead of the caller's own account.
export async function GET(request, { params }) {
  try {
    await connectDB();
    const { account, error } = await requireAuth();
    if (error) return error;
    const denied = distributorOrAdmin(account);
    if (denied) return denied;

    const { id: merchantId } = await params;

    const merchantQuery = { _id: merchantId, role: "Merchant" };
    if (account.role === "Distributor") merchantQuery.parentId = account._id;

    const merchant = await Account.findOne(merchantQuery).select("_id");
    if (!merchant) {
      return Response.json({ success: false, error: "Retailer not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 20;
    const skip = (page - 1) * limit;

    const searchQuery = searchParams.get("search") || "";
    const campaignId = searchParams.get("campaign");
    const storeId = searchParams.get("store");
    const status = searchParams.get("status");
    const dateRange = searchParams.get("dateRange") || "all";
    const sortBy = searchParams.get("sortBy") || "newest";

    const query = { merchant_id: merchantId };

    if (searchQuery) {
      query.$or = [
        { customer_name: { $regex: searchQuery, $options: "i" } },
        { customer_mobile: { $regex: searchQuery, $options: "i" } },
      ];
    }
    if (campaignId && campaignId !== "all") query.campaign_id = campaignId;
    if (storeId && storeId !== "all") query.store_id = storeId;
    if (status && status !== "all") query.status = status;

    const now = new Date();
    if (dateRange === "today") {
      query.createdAt = { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) };
    } else if (dateRange === "7days") {
      query.createdAt = { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
    } else if (dateRange === "30days") {
      query.createdAt = { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
    }

    let sortObj = { createdAt: -1 };
    if (sortBy === "oldest") sortObj = { createdAt: 1 };
    else if (sortBy === "name-asc") sortObj = { customer_name: 1 };
    else if (sortBy === "name-desc") sortObj = { customer_name: -1 };

    const [participants, total, statsCounts, campaigns, stores] = await Promise.all([
      CustomerParticipation.find(query)
        .populate("campaign_id", "campaignName name status")
        .populate("store_id", "store_name city state store_code")
        .populate("range_id", "minAmount maxAmount")
        .populate("scratch_card_id", "reward_type reward_value reward_description coupon_code")
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean(),
      CustomerParticipation.countDocuments(query),
      Promise.all([
        CustomerParticipation.countDocuments({ merchant_id: merchantId }),
        CustomerParticipation.countDocuments({
          merchant_id: merchantId,
          createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
        }),
        CustomerParticipation.countDocuments({
          merchant_id: merchantId,
          status: { $in: ["revealed", "redeemed"] },
        }),
        CustomerParticipation.countDocuments({ merchant_id: merchantId, status: "redeemed" }),
      ]),
      Campaign.find({ merchantId }).select("_id campaignName name").lean(),
      Store.find({ merchant_id: merchantId }).select("_id store_name city state").lean(),
    ]);

    return Response.json(
      {
        success: true,
        data: participants,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        stats: {
          totalCustomers: statsCounts[0],
          todaysCustomers: statsCounts[1],
          rewardsAwarded: statsCounts[2],
          rewardsClaimed: statsCounts[3],
        },
        filters: { campaigns, stores },
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[API] Error fetching merchant customers:", err);
    return Response.json(
      { success: false, error: "Failed to fetch customers" },
      { status: 500 },
    );
  }
}
