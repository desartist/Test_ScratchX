import { requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/connectDB";
import scratchEntitlementService from "@/lib/scratchEntitlementService";

/**
 * GET /api/billing/scratch-status
 *
 * Check current scratch entitlement status for logged-in user.
 * Used by frontend to show dashboard status and determine if campaign operations are allowed.
 *
 * Response:
 * {
 *   success: true,
 *   status: "unlimited" | "pack" | "expired",
 *   displayLabel: "Unlimited" | "4500",
 *   displayDetail: "Valid until 30 Aug 2026" | "Available scratches",
 *   ...
 * }
 */
export async function GET() {
  try {
    await connectDB();
    const { account, error } = await requireAuth();
    if (error) return error;

    const ownerType = account.role === "Distributor" ? "distributor" : "merchant";

    const scratchStatus = await scratchEntitlementService.getDashboardStatus(
      account._id,
      ownerType
    );

    return Response.json(
      {
        success: true,
        data: scratchStatus,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Scratch status check error:", error);
    return Response.json(
      {
        success: false,
        error: error.message || "Failed to check scratch status",
      },
      { status: 500 }
    );
  }
}
