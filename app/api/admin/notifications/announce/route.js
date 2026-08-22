import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import Account from "@/models/accountModel";
import Notification from "@/models/notificationModel";
import { logAdminAction } from "@/lib/services/platformAuditService";

function superAdminOnly(account) {
  if (account.role !== "Super_Admin") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
  return null;
}

const AUDIENCES = {
  merchants: { role: "Merchant", ownerType: "merchant" },
  distributors: { role: "Distributor", ownerType: "distributor" },
};

// POST /api/admin/notifications/announce — broadcast an in-app notification
// to every account in the chosen audience. Creates real Notification docs
// (channels.inApp only — this only guarantees the in-app bell/notifications
// page, not email/SMS delivery, which this app's notification pipeline
// doesn't wire up generically outside the specific transactional senders).
export async function POST(request) {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  const denied = superAdminOnly(account);
  if (denied) return denied;

  const { audience, title, message, severity, actionUrl } = await request.json();

  if (!title || !message) {
    return Response.json({ success: false, error: "title and message are required" }, { status: 400 });
  }
  const audienceConfig = AUDIENCES[audience];
  if (!audienceConfig) {
    return Response.json(
      { success: false, error: "audience must be 'merchants' or 'distributors'" },
      { status: 400 },
    );
  }
  const validSeverities = ["info", "low", "medium", "high", "critical"];
  const sev = validSeverities.includes(severity) ? severity : "info";

  const recipients = await Account.find({ role: audienceConfig.role, status: "active" }).select("_id");

  if (recipients.length === 0) {
    return Response.json({ success: true, sentCount: 0 }, { status: 200 });
  }

  const groupKey = `announcement_${Date.now()}`;
  const docs = recipients.map((r) => ({
    ownerId: r._id,
    ownerType: audienceConfig.ownerType,
    type: "system_alert",
    title,
    message,
    severity: sev,
    actionUrl: actionUrl || null,
    groupKey,
    channels: { inApp: true, email: false, sms: false, push: false },
    read: false,
  }));

  await Notification.insertMany(docs);

  await logAdminAction({
    account,
    module: "Notifications",
    action: `Sent announcement to ${docs.length} ${audience}`,
    request,
    targetType: "Announcement",
    targetLabel: title,
    after: { audience, severity: sev, recipientCount: docs.length },
    reason: message,
  });

  return Response.json({ success: true, sentCount: docs.length }, { status: 201 });
}
