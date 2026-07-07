import { connectDB } from "@/lib/connectDB";
import { getLoginToken } from "@/lib/auth";
import Account from "@/models/accountModel";
import { logAction } from "@/lib/services/auditLogService";

const ELIGIBLE_ROLES = ["Merchant", "Distributor"];

export async function POST(req) {
  try {
    await connectDB();

    const account = await getLoginToken();
    if (!account) {
      return Response.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!ELIGIBLE_ROLES.includes(account.role)) {
      return Response.json(
        { success: false, error: "This notice does not apply to your account type" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const version = String(body?.version || "").trim();
    if (!version) {
      return Response.json(
        { success: false, error: "Missing policy version" },
        { status: 400 }
      );
    }

    const updated = await Account.findByIdAndUpdate(
      account._id,
      {
        platformNotice: {
          accepted: true,
          acceptedAt: new Date(),
          version,
        },
      },
      { new: true, runValidators: true }
    );

    const ip = req.headers.get("x-forwarded-for") || "unknown";
    try {
      await logAction(account._id, "PLATFORM_NOTICE_ACCEPTED", {
        ip,
        metadata: { version },
      });
    } catch (auditErr) {
      // Audit logging must never block the actual consent from being saved.
      console.error("[accept-platform-notice] Audit log failed:", auditErr);
    }

    return Response.json({
      success: true,
      platformNotice: updated.platformNotice,
    });
  } catch (error) {
    console.error("[accept-platform-notice] Error:", error);
    return Response.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
