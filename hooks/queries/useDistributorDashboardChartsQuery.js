"use client";

import { useQuery } from "@tanstack/react-query";

export function distributorDashboardChartsQueryKey(days) {
  return ["distributor-dashboard-charts", days];
}

export async function fetchDistributorDashboardCharts(days) {
  const res = await fetch(`/api/distributor/dashboard-charts?days=${days}`, { credentials: "include" });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Failed to load dashboard charts");
  return json;
}

export function useDistributorDashboardChartsQuery(days = 30) {
  return useQuery({
    queryKey: distributorDashboardChartsQueryKey(days),
    queryFn: () => fetchDistributorDashboardCharts(days),
  });
}
