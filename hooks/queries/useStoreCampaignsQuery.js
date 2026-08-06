"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/components/auth/AuthContext";

export function storeCampaignsQueryKey(accountId) {
  return ["store-campaigns", accountId];
}

export function storeCampaignDetailQueryKey(accountId, campaignId) {
  return ["store-campaign-detail", accountId, campaignId];
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

export async function fetchStoreCampaignDetail(campaignId) {
  const res = await fetch(`/api/store-campaigns/${campaignId}`, { credentials: "include" });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || "Failed to load campaign details");
  }
  return json; // { campaign, ranges, store }
}

export function useStoreCampaignDetailQuery(campaignId) {
  const { account } = useAuthContext();
  const accountId = account?.id || account?._id;

  return useQuery({
    queryKey: storeCampaignDetailQueryKey(accountId, campaignId),
    queryFn: () => fetchStoreCampaignDetail(campaignId),
    enabled: !!accountId && !!campaignId,
  });
}
