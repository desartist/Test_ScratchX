import { connectDB } from "@/lib/connectDB.js";
import { requireAuth } from "@/lib/auth.js";
import { enforceFeatureLimit } from "@/lib/subscriptionGuard.js";
import Range from "@/models/rangeModel.js";
import Campaign from "@/models/campaignModel.js";

export async function GET(request) {
  try {
    await connectDB();
    const { account, error } = await requireAuth("range:read");
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("id");
    const rangeId = searchParams.get("rangeId");

    if (rangeId) {
      const range = await Range.findById(rangeId);
      return Response.json({ success: true, ranges: range }, { status: 200 });
    }

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return Response.json({ success: false, error: "Campaign not found" }, { status: 404 });
    }

    const ranges = await Range.find({ campaignId: campaign._id });
    return Response.json({ success: true, ranges }, { status: 200 });
  } catch (error) {
    console.error("Error fetching ranges:", error);
    return Response.json(
      { success: false, error: "Failed to fetch ranges" },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const { account, error } = await requireAuth("range:create");
    if (error) return error;

    const merchantId = account.role === "Manager" ? account.parentId : account._id;

    const { minAmount, maxAmount, rewards, campaignId, rangeId } =
      await request.json();

    // Enforce plan limit on ranges per campaign
    const existingRangeCount = await Range.countDocuments({ campaignId });
    const limitError = await enforceFeatureLimit(
      merchantId,
      "maxRangesPerCampaign",
      existingRangeCount,
    );
    if (limitError && !rangeId) return limitError; // skip limit check on update

    if (rangeId) {
      const range = await Range.findByIdAndUpdate(
        rangeId,
        {
          minAmount,
          maxAmount,
          label: `₹${minAmount} - ₹${maxAmount}`,
          campaignId,
          rewards,
        },
        { new: true },
      );
      return Response.json({ success: true, range }, { status: 200 });
    }

    const range = await Range.create({
      minAmount,
      maxAmount,
      label: `₹${minAmount} - ₹${maxAmount}`,
      campaignId,
      rewards,
    });
    return Response.json({ success: true, range }, { status: 201 });
  } catch (error) {
    console.error("Error creating range:", error);
    return Response.json(
      { success: false, error: "Failed to create range" },
      { status: 500 },
    );
  }
}

export async function DELETE(request) {
  try {
    await connectDB();
    const { error } = await requireAuth("range:delete");
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const rangeId = searchParams.get("rangeId");

    if (!rangeId) {
      return Response.json(
        { success: false, error: "rangeId is required" },
        { status: 400 },
      );
    }

    const deleted = await Range.findByIdAndDelete(rangeId);
    if (!deleted) {
      return Response.json(
        { success: false, error: "Range not found" },
        { status: 404 },
      );
    }

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting range:", error);
    return Response.json(
      { success: false, error: "Failed to delete range" },
      { status: 500 },
    );
  }
}
