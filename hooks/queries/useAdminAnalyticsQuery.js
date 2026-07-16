"use client";

import { useQuery } from "@tanstack/react-query";

export function adminAnalyticsQueryKey(days) {
  return ["admin-analytics", days];
}

export async function fetchAdminAnalytics(days) {
  const res = await fetch(`/api/admin/analytics?days=${days}`, {
    credentials: "include",
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || "Failed to load revenue analytics");
  }
  return json.data;
}

export function useAdminAnalyticsQuery(days = 30) {
  return useQuery({
    queryKey: adminAnalyticsQueryKey(days),
    queryFn: () => fetchAdminAnalytics(days),
  });
}
