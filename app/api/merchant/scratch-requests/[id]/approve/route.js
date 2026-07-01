import { NextResponse } from "next/server";
import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import ScratchAllocationRequest from "@/models/scratchAllocationRequestModel";
import InventoryService from "@/lib/inventoryService";
import { ValidationError, NotFoundError } from "@/lib/errors";

/**
 * POST /api/merchant/scratch-requests/[id]/approve
 * Only the owning Merchant may approve. Approval REUSES the existing
 * InventoryService.allocateToStore(merchantId, campaignId, storeId, quantity,
 * allocatedBy) logic to perform the actual inventory math. If that fails
 * (e.g. insufficient allocation), the request is left pending.
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

    // Reuse existing allocation logic (merchant -> campaign -> store).
    try {
      await InventoryService.allocateToStore(
        String(allocationRequest.merchantId),
        String(allocationRequest.campaignId),
        String(allocationRequest.storeId),
        allocationRequest.quantity,
        String(account._id)
      );
    } catch (allocErr) {
      if (
        allocErr instanceof ValidationError ||
        allocErr instanceof NotFoundError
      ) {
        // Leave the request pending; report the allocation failure.
        return NextResponse.json(
          { success: false, error: allocErr.message },
          { status: 400 }
        );
      }
      throw allocErr;
    }

    // Allocation succeeded — mark request approved.
    allocationRequest.status = "approved";
    allocationRequest.respondedBy = account._id;
    allocationRequest.respondedAt = new Date();
    await allocationRequest.save();

    return NextResponse.json({ success: true, data: allocationRequest });
  } catch (err) {
    console.error("[scratch-requests][approve] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to approve scratch allocation request" },
      { status: 500 }
    );
  }
}
