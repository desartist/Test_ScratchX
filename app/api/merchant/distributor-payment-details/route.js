import { connectDB } from "@/lib/connectDB";
import { getLoginToken } from "@/lib/auth";
import Account from "@/models/accountModel";

// Read-only lookup: a Retailer/Wholesaler's `parentId` points at the
// Distributor account that created them (see AddBusinessModal). Used to show
// the distributor's payment details on the merchant's own settings page.
export async function GET(req) {
  await connectDB();

  const account = await getLoginToken();
  if (!account) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!account.parentId) {
    return Response.json({ success: true, paymentDetails: null });
  }

  const distributor = await Account.findById(account.parentId).select("role paymentDetails name");
  if (!distributor || distributor.role !== "Distributor") {
    return Response.json({ success: true, paymentDetails: null });
  }

  return Response.json({
    success: true,
    distributorName: distributor.name || null,
    paymentDetails: distributor.paymentDetails || null,
  });
}
