/**
 * GET /api/scratches/status
 * Get current scratch allowance status for authenticated user
 * Returns detailed status: unlimited (with days remaining) or pack-based (with quantity)
 */

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import scratchEntitlementService from "@/lib/scratchEntitlementService";

export async function GET(request) {
  await connectDB();
  const { account, error: authError } = await requireAuth();
  if (authError) return authError;

  try {
    const ownerId = account._id;
    const ownerType = account.role?.toLowerCase().includes("distributor") ? "distributor" : "merchant";

    // Get detailed dashboard status
    const status = await scratchEntitlementService.getDashboardStatus(ownerId, ownerType);

    // Also get raw entitlement for detailed breakdown
    const entitlement = await scratchEntitlementService.checkEntitlement(ownerId, ownerType);

    return NextResponse.json(
      {
        success: true,
        data: {
          ...status,
          entitlement, // Include detailed breakdown
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Scratches Status] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to get scratch status",
      },
      { status: 500 }
    );
  }
}
