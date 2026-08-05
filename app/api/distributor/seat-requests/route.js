import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import TeamSeatRequest from "@/models/teamSeatRequestModel";

/**
 * GET /api/distributor/seat-requests?status=pending
 * All extra-seat requests from this distributor's retailers, newest first.
 */
export async function GET(request) {
  try {
    await connectDB();
    const { account, error } = await requireAuth();
    if (error) return error;

    if (account.role !== "Distributor") {
      return Response.json({ success: false, error: "Not authorized" }, { status: 403 });
    }

    const url = new URL(request.url);
    const status = url.searchParams.get("status");

    const query = { distributorId: account._id };
    if (status) query.status = status;

    const requests = await TeamSeatRequest.find(query)
      .populate("merchantId", "name email profile.storeName")
      .populate("storeId", "store_name")
      .sort({ createdAt: -1 });

    return Response.json(
      {
        success: true,
        requests: requests.map((r) => ({
          _id: r._id,
          merchant: {
            name: r.merchantId?.name || r.merchantId?.email,
            email: r.merchantId?.email,
            storeName: r.merchantId?.profile?.storeName,
          },
          storeName: r.storeId?.store_name,
          role: r.role,
          quantity: r.quantity,
          totalAmountINR: r.totalAmountINR,
          status: r.status,
          createdAt: r.createdAt,
          resolvedAt: r.resolvedAt,
        })),
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error fetching distributor seat requests:", err);
    return Response.json({ success: false, error: "Failed to fetch seat requests" }, { status: 500 });
  }
}
