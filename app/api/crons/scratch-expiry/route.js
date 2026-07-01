import { scratchExpiryCronJob } from "@/lib/crons/scratchExpiryCron";

/**
 * GET /api/crons/scratch-expiry
 *
 * Cron endpoint for handling scratch expiry and warnings.
 * Can be called by:
 * - Vercel Crons
 * - External cron service (with CRON_SECRET)
 * - Manual testing
 */
export async function GET(request) {
  try {
    // ========== SECURITY: Verify Cron Token ==========
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.CRON_SECRET;

    if (!expectedToken) {
      console.warn(
        "[CRON] CRON_SECRET not configured - cron endpoint is open (dev only)"
      );
    } else if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      return Response.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    // ========== EXECUTE CRON JOB ==========
    const result = await scratchExpiryCronJob();

    return Response.json(
      {
        success: true,
        message: "Scratch expiry cron executed successfully",
        data: result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[CRON] Scratch expiry endpoint error:", error);

    return Response.json(
      {
        success: false,
        error: error.message || "Cron job failed",
      },
      { status: 500 }
    );
  }
}
