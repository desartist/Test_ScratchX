import { connectDB } from "@/lib/connectDB";
import CustomerParticipation from "@/models/customerParticipationModel";
import Campaign from "@/models/campaignModel";
import Store from "@/models/storeModel";
import Account from "@/models/accountModel";
import Range from "@/models/rangeModel";
import "@/models/scratchCardRecordModel";

export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const merchantId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role") || "merchant";

    if (!merchantId) {
      return new Response(
        JSON.stringify({ success: false, error: "Merchant ID required" }),
        { status: 401 },
      );
    }

    // Pagination
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 20;
    const skip = (page - 1) * limit;

    // Filters
    const searchQuery = searchParams.get("search") || "";
    const campaignId = searchParams.get("campaign");
    const storeId = searchParams.get("store");
    const status = searchParams.get("status");
    const dateRange = searchParams.get("dateRange") || "all";

    // Sorting
    const sortBy = searchParams.get("sortBy") || "newest";

    // Build query
    const query = { merchant_id: merchantId };

    // Search: by customer name, mobile, campaign name, or store name
    if (searchQuery) {
      query.$or = [
        { customer_name: { $regex: searchQuery, $options: "i" } },
        { customer_mobile: { $regex: searchQuery, $options: "i" } },
      ];
    }

    // Campaign filter
    if (campaignId && campaignId !== "all") {
      query.campaign_id = campaignId;
    }

    // Store filter
    if (storeId && storeId !== "all") {
      query.store_id = storeId;
    }

    // Status filter
    if (status && status !== "all") {
      query.status = status;
    }

    // Date range filter
    const now = new Date();
    if (dateRange === "today") {
      const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );
      query.createdAt = { $gte: startOfDay };
    } else if (dateRange === "7days") {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      query.createdAt = { $gte: sevenDaysAgo };
    } else if (dateRange === "30days") {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      query.createdAt = { $gte: thirtyDaysAgo };
    }

    // Build sort object
    let sortObj = { createdAt: -1 }; // default: newest first
    if (sortBy === "oldest") {
      sortObj = { createdAt: 1 };
    } else if (sortBy === "name-asc") {
      sortObj = { customer_name: 1 };
    } else if (sortBy === "name-desc") {
      sortObj = { customer_name: -1 };
    } else if (sortBy === "reward-high") {
      // This would require additional logic to sort by reward value
      sortObj = { createdAt: -1 };
    }

    // Execute query with pagination
    const participants = await CustomerParticipation.find(query)
      .populate("campaign_id", "campaignName name status")
      .populate("store_id", "store_name city state store_code")
      .populate("range_id", "minAmount maxAmount")
      .populate("scratch_card_id", "reward_type reward_value reward_description coupon_code")
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await CustomerParticipation.countDocuments(query);

    // Calculate statistics
    const stats = await Promise.all([
      CustomerParticipation.countDocuments({ merchant_id: merchantId }),
      CustomerParticipation.countDocuments({
        merchant_id: merchantId,
        createdAt: {
          $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        },
      }),
      CustomerParticipation.countDocuments({
        merchant_id: merchantId,
        status: { $in: ["revealed", "redeemed"] },
      }),
      CustomerParticipation.countDocuments({
        merchant_id: merchantId,
        status: "redeemed",
      }),
      CustomerParticipation.countDocuments({
        merchant_id: merchantId,
        status: { $in: ["initiated", "verified", "scratched"] },
      }),
    ]);

    // Get available campaigns and stores for filters
    const campaigns = await Campaign.find({ merchantId: merchantId })
      .select("_id campaignName name")
      .lean();

    const stores = await Store.find({ merchant_id: merchantId })
      .select("_id store_name city state")
      .lean();

    return new Response(
      JSON.stringify({
        success: true,
        data: participants,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        stats: {
          totalCustomers: stats[0],
          todaysCustomers: stats[1],
          rewardsAwarded: stats[2],
          rewardsClaimed: stats[3],
          activeParticipants: stats[4],
          totalScans: stats[0], // Can be enhanced with actual scan count
        },
        filters: {
          campaigns,
          stores,
        },
      }),
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching customers:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to fetch customers",
      }),
      { status: 500 },
    );
  }
}
