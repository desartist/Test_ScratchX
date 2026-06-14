import AuditLog from "@/models/auditLogModel";

export async function logAction(accountId, action, context = {}) {
  const auditLog = new AuditLog({
    accountId,
    action,
    ip: context.ip || null,
    deviceId: context.deviceId || null,
    browser: context.browser || null,
    os: context.os || null,
    userAgent: context.userAgent || null,
    metadata: context.metadata || null,
    timestamp: new Date(),
  });

  await auditLog.save();
  return auditLog;
}

export async function getAuditLogs(accountId, limit = 100) {
  return await AuditLog.find({ accountId })
    .sort({ timestamp: -1 })
    .limit(limit);
}

export async function getActionLogs(accountId, action, limit = 50) {
  return await AuditLog.find({ accountId, action })
    .sort({ timestamp: -1 })
    .limit(limit);
}
