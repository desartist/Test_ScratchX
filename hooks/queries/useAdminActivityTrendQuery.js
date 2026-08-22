"use client";

import { useQuery } from "@tanstack/react-query";

export function adminActivityTrendQueryKey(days) {
  return ["admin-activity-trend", days];
}

export async function fetchAdminActivityTrend(days) {
  const res = await fetch(`/api/admin/activity-trend?days=${days}`, { credentials: "include" });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Failed to load activity trend");
  return json;
}

export function useAdminActivityTrendQuery(days = 30) {
  return useQuery({
    queryKey: adminActivityTrendQueryKey(days),
    queryFn: () => fetchAdminActivityTrend(days),
  });
}
