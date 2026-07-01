import { connectDB } from "@/lib/connectDB";
import Campaign from "@/models/campaignModel.js";
import Merchant from "@/models/merchantModel.js";
import Range from "@/models/rangeModel.js";
import User from "@/models/userModel";

export async function GET(request) {
  const db = await connectDB();
  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get("campaignId");
  const campaignDetails = await Campaign.findById(campaignId).select(
    "campaignName merchantId",
  );
  const ranges = await Range.find({ campaignId });
  const merchantDetails = await Merchant.findById(
    campaignDetails.merchantId,
  ).select("storeName");
  return Response.json(
    { campaignDetails, ranges, merchantDetails },
    { status: 200 },
  );
}

export async function POST(request) {
  const db = await connectDB();
  const { campaignId, name, phone, billAmount, couponWon } =
    await request.json();
  const user = await User.create({
    campaignId,
    name,
    phone,
    billAmount,
    couponWon,
  });
  return Response.json({ user }, { status: 201 });
}
