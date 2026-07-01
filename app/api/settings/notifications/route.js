import { connectDB } from "@/lib/connectDB";
import { getLoginToken } from "@/lib/auth";
import Account from "@/models/accountModel";
import { logAction } from "@/lib/services/auditLogService";

export async function GET(req) {
  await connectDB();

  const account = await getLoginToken();
  if (!account) {
    return Response.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  return Response.json({
    success: true,
    notificationPreferences: account.notificationPreferences || {
      campaigns: true,
      stores: true,
      customers: false,
      subscription: true,
      marketing: false,
    },
  });
}

export async function PUT(req) {
  await connectDB();

  const account = await getLoginToken();
  if (!account) {
    return Response.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await req.json();
  const { campaigns, stores, customers, subscription, marketing } = body;

  // Validate: all must be booleans
  if (
    typeof campaigns !== "boolean" ||
    typeof stores !== "boolean" ||
    typeof customers !== "boolean" ||
    typeof subscription !== "boolean" ||
    typeof marketing !== "boolean"
  ) {
    return Response.json(
      { success: false, error: "All notification preferences must be boolean" },
      { status: 400 }
    );
  }

  const updated = await Account.findByIdAndUpdate(
    account._id,
    {
      notificationPreferences: {
        campaigns,
        stores,
        customers,
        subscription,
        marketing,
      },
    },
    { new: true }
  );

  // Log action
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  await logAction(account._id, "NOTIFICATION_PREFERENCES_UPDATE", {
    ip,
    metadata: { preferences: updated.notificationPreferences },
  });

  return Response.json({
    success: true,
    message: "Notification preferences updated successfully",
    notificationPreferences: updated.notificationPreferences,
  });
}
