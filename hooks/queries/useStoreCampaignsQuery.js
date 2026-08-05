"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/components/auth/AuthContext";

export function storeCampaignsQueryKey(accountId) {
  return ["store-campaigns", accountId];
}

export async function fetchStoreCampaigns() {
  const res = await fetch("/api/store-campaigns", { credentials: "include" });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || "Failed to load campaigns");
  }
  return json.campaigns || [];
}

export function useStoreCampaignsQuery() {
  const { account } = useAuthContext();
  const accountId = account?.id || account?._id;

  return useQuery({
    queryKey: storeCampaignsQueryKey(accountId),
    queryFn: fetchStoreCampaigns,
    enabled: !!accountId,
  });
}
