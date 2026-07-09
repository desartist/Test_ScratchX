"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/components/auth/AuthContext";

export function campaignQueryKey(campaignId) {
  return ["campaign", campaignId];
}

export function campaignRangesQueryKey(campaignId) {
  return ["campaign-ranges", campaignId];
}

function authHeaders(userId, role) {
  return {
    "x-user-id": userId || "",
    "x-user-role": role || "Merchant",
  };
}

export async function fetchCampaign(campaignId, { userId, role }) {
  const res = await fetch(`/api/campaigns/${campaignId}`, {
    method: "GET",
    credentials: "include",
    headers: authHeaders(userId, role),
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || "Campaign not found");
  }
  return json; // { success, data }
}

export async function fetchCampaignRanges(campaignId, { userId, role }) {
  const res = await fetch(`/api/campaign_range?id=${campaignId}`, {
    method: "GET",
    credentials: "include",
    headers: authHeaders(userId, role),
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || "Failed to load reward ranges");
  }
  return json; // { success, ranges }
}

// Shared across campaign/[id]/page.js, RewardRanges.js, and
// campaign/[id]/ranges/page.js — all three previously fetched
// /api/campaigns/{id} and/or /api/campaign_range?id= independently.
export function useCampaignQuery(campaignId, options = {}) {
  const { account } = useAuthContext();
  const userId = account?.id || account?._id;

  return useQuery({
    queryKey: campaignQueryKey(campaignId),
    queryFn: () => fetchCampaign(campaignId, { userId, role: account?.role }),
    enabled: !!campaignId && !!userId && options.enabled !== false,
  });
}

export function useCampaignRangesQuery(campaignId, options = {}) {
  const { account } = useAuthContext();
  const userId = account?.id || account?._id;

  return useQuery({
    queryKey: campaignRangesQueryKey(campaignId),
    queryFn: () => fetchCampaignRanges(campaignId, { userId, role: account?.role }),
    enabled: !!campaignId && !!userId && options.enabled !== false,
  });
}

// Invalidate both halves of the cluster after a mutation (assign/remove
// store, save/delete range, allocate scratches, status change, generate QR).
export function useInvalidateCampaignCluster() {
  const queryClient = useQueryClient();
  return (campaignId) => {
    queryClient.invalidateQueries({ queryKey: campaignQueryKey(campaignId) });
    queryClient.invalidateQueries({ queryKey: campaignRangesQueryKey(campaignId) });
  };
}
