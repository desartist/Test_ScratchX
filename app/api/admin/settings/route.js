import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import { getPlatformSettings } from "@/lib/services/platformSettingsService";
import { logAdminAction } from "@/lib/services/platformAuditService";

function superAdminOnly(account) {
  if (account.role !== "Super_Admin") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
  return null;
}

// GET /api/admin/settings — full platform settings (Super_Admin only)
export async function GET(request) {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  const denied = superAdminOnly(account);
  if (denied) return denied;

  const settings = await getPlatformSettings();
  return Response.json({ success: true, settings }, { status: 200 });
}

// PATCH /api/admin/settings — update platform settings (Super_Admin only)
export async function PATCH(request) {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  const denied = superAdminOnly(account);
  if (denied) return denied;

  const body = await request.json();
  const previous = await getPlatformSettings();
  const before = previous.toObject();

  const updates = {};
  if (body.defaultCommissionRate !== undefined) {
    const rate = body.defaultCommissionRate === null || body.defaultCommissionRate === ""
      ? null
      : Number(body.defaultCommissionRate);
    if (rate !== null && (Number.isNaN(rate) || rate < 0 || rate > 100)) {
      return Response.json(
        { success: false, error: "defaultCommissionRate must be a number between 0 and 100" },
        { status: 400 },
      );
    }
    updates.defaultCommissionRate = rate;
  }
  if (body.maintenanceMode !== undefined) {
    updates.maintenanceMode = {
      enabled: !!body.maintenanceMode.enabled,
      message: body.maintenanceMode.message || "",
    };
  }
  if (body.supportContacts !== undefined) {
    updates.supportContacts = {
      salesEmail: body.supportContacts.salesEmail || previous.supportContacts.salesEmail,
      supportEmail: body.supportContacts.supportEmail || previous.supportContacts.supportEmail,
    };
  }
  updates.updatedBy = account._id;

  Object.assign(previous, updates);
  await previous.save();

  await logAdminAction({
    account,
    module: "Settings",
    action: "Updated platform settings",
    request,
    targetType: "PlatformSettings",
    targetId: previous._id,
    targetLabel: "Platform Settings",
    before,
    after: previous.toObject(),
  });

  return Response.json({ success: true, settings: previous }, { status: 200 });
}
