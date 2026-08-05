"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/components/auth/AuthContext";

export function storeAnalyticsQueryKey(accountId) {
  return ["store-analytics", accountId];
}

export async function fetchStoreAnalytics() {
  const res = await fetch("/api/store-analytics", { credentials: "include" });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || "Failed to load analytics");
  }
  return json.analytics;
}

export function useStoreAnalyticsQuery() {
  const { account } = useAuthContext();
  const accountId = account?.id || account?._id;

  return useQuery({
    queryKey: storeAnalyticsQueryKey(accountId),
    queryFn: fetchStoreAnalytics,
    enabled: !!accountId,
  });
}
