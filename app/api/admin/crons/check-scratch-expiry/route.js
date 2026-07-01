/**
 * POST /api/admin/crons/check-scratch-expiry
 * Manually trigger scratch expiry check (admin endpoint)
 * In production, this would be called by a scheduled task service
 */

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import checkScratchExpiry from "@/lib/crons/checkScratchExpiry";

export async function POST(request) {
  await connectDB();
  const { account, error: authError } = await requireAuth();
  if (authError) return authError;

  // Only Super_Admin can trigger cron jobs
  if (account.role !== "Super_Admin") {
    return NextResponse.json(
      { success: false, error: "Only admins can trigger cron jobs" },
      { status: 403 }
    );
  }

  try {
    const result = await checkScratchExpiry();

    return NextResponse.json(
      {
        success: true,
        message: "Scratch expiry check completed",
        data: result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Cron API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to run cron job",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
