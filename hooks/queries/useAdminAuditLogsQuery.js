"use client";

import { useQuery } from "@tanstack/react-query";

export function adminAuditLogsQueryKey(params = {}) {
  return ["admin-audit-logs", params];
}

export async function fetchAdminAuditLogs(params = {}) {
  const search = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => [k, String(v)]),
    ),
  );
  const res = await fetch(`/api/admin/audit-logs?${search}`, { credentials: "include" });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || "Failed to load audit logs");
  }
  return json; // { success, logs, total, page, limit, metrics }
}

export function useAdminAuditLogsQuery(params = {}) {
  return useQuery({
    queryKey: adminAuditLogsQueryKey(params),
    queryFn: () => fetchAdminAuditLogs(params),
  });
}
