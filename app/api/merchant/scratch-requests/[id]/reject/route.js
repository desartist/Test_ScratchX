import { NextResponse } from "next/server";
import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import ScratchAllocationRequest from "@/models/scratchAllocationRequestModel";

/**
 * POST /api/merchant/scratch-requests/[id]/reject
 * Only the owning Merchant may reject. No inventory change.
 * Optional body: { note }
 */
export async function POST(request, { params }) {
  try {
    await connectDB();

    const { account, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    const allocationRequest = await ScratchAllocationRequest.findById(id);
    if (!allocationRequest) {
      return NextResponse.json(
        { success: false, error: "Request not found" },
        { status: 404 }
      );
    }

    // Owner-only: must be a Merchant and own this request.
    if (
      account.role !== "Merchant" ||
      String(allocationRequest.merchantId) !== String(account._id)
    ) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    if (allocationRequest.status !== "pending") {
      return NextResponse.json(
        { success: false, error: "Already processed" },
        { status: 409 }
      );
    }

    let note = "";
    try {
      const body = await request.json();
      note = body?.note || "";
    } catch {
      // No body provided — note stays empty.
    }

    allocationRequest.status = "rejected";
    allocationRequest.respondedBy = account._id;
    allocationRequest.respondedAt = new Date();
    allocationRequest.responseNote = note;
    await allocationRequest.save();

    return NextResponse.json({ success: true, data: allocationRequest });
  } catch (err) {
    console.error("[scratch-requests][reject] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to reject scratch allocation request" },
      { status: 500 }
    );
  }
}
