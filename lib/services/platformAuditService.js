import PlatformAuditLog from "@/models/platformAuditLogModel";

/**
 * Record a Super Admin / internal-team action against the generic,
 * cross-module PlatformAuditLog. Never throws — a logging failure must
 * never block the actual admin action from completing (same convention as
 * lib/services/notificationService.js).
 *
 * @param {object} params
 * @param {object} params.account - the acting Account (from requireAuth())
 * @param {string} params.module - one of PlatformAuditLog's module enum
 * @param {string} params.action - short action label, e.g. "Suspended retailer"
 * @param {object} [params.request] - the Next.js Request, for IP/user-agent
 * @param {string} [params.targetType]
 * @param {string} [params.targetId]
 * @param {string} [params.targetLabel]
 * @param {*} [params.before]
 * @param {*} [params.after]
 * @param {string} [params.reason]
 */
export async function logAdminAction({
  account,
  module,
  action,
  request,
  targetType,
  targetId,
  targetLabel,
  before,
  after,
  reason,
}) {
  try {
    await PlatformAuditLog.create({
      adminId: account._id,
      adminName: account.name || account.email,
      adminRole: account.role,
      module,
      action,
      targetType: targetType || null,
      targetId: targetId || null,
      targetLabel: targetLabel || null,
      before: before ?? null,
      after: after ?? null,
      reason: reason || null,
      ip: request?.headers?.get?.("x-forwarded-for") || null,
      userAgent: request?.headers?.get?.("user-agent") || null,
    });
  } catch (error) {
    console.error("[PlatformAuditService] Failed to write audit log:", error);
  }
}
