/**
 * GET /api/scratches/available-packs
 * Get all available scratch pack options with pricing
 * No authentication required for public pricing display
 */

import { NextResponse } from "next/server";
import ScratchPackService from "@/lib/services/scratchPackService";

export async function GET(request) {
  try {
    const packs = ScratchPackService.getAvailablePacks();

    return NextResponse.json(
      {
        success: true,
        data: packs,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Scratches Available Packs] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch available packs",
      },
      { status: 500 }
    );
  }
}
