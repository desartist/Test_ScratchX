"use client";

import { useQuery } from "@tanstack/react-query";

export function adminDashboardChartsQueryKey(days) {
  return ["admin-dashboard-charts", days];
}

export async function fetchAdminDashboardCharts(days) {
  const res = await fetch(`/api/admin/dashboard-charts?days=${days}`, { credentials: "include" });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Failed to load dashboard charts");
  return json;
}

export function useAdminDashboardChartsQuery(days = 30) {
  return useQuery({
    queryKey: adminDashboardChartsQueryKey(days),
    queryFn: () => fetchAdminDashboardCharts(days),
  });
}
