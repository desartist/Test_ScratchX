"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/components/auth/AuthContext";

export function campaignsListQueryKey(accountId) {
  return ["campaigns", accountId];
}

export async function fetchCampaignsList({ accountId, role }) {
  const res = await fetch("/api/campaigns", {
    method: "GET",
    credentials: "include",
    headers: {
      "x-user-id": accountId || "",
      "x-user-role": role || "Merchant",
    },
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || "Failed to load campaigns");
  }
  return json; // { success, data }
}

// Shared across campaign/page.js and AssignCampaignsModal.js — both
// previously fetched /api/campaigns independently (via smartCacheService
// and a plain fetch, respectively).
export function useCampaignsListQuery(options = {}) {
  const { account } = useAuthContext();
  const accountId = account?.id || account?._id;

  return useQuery({
    queryKey: campaignsListQueryKey(accountId),
    queryFn: () => fetchCampaignsList({ accountId, role: account?.role }),
    enabled: !!accountId && options.enabled !== false,
  });
}

// Pause/resume a campaign from the list view (PUT /api/campaigns/{id}).
export function useUpdateCampaignStatusMutation() {
  const { account } = useAuthContext();
  const accountId = account?.id || account?._id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ campaignId, status }) => {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": accountId || "",
          "x-user-role": account?.role || "Merchant",
        },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to update campaign status");
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campaignsListQueryKey(accountId) });
    },
  });
}

export function useDeleteCampaignMutation() {
  const { account } = useAuthContext();
  const accountId = account?.id || account?._id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaignId) => {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "x-user-id": accountId || "",
          "x-user-role": account?.role || "Merchant",
        },
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to delete campaign.");
      }
      return json;
    },
    onSuccess: (_data, campaignId) => {
      queryClient.setQueryData(campaignsListQueryKey(accountId), (old) => {
        if (!old?.data) return old;
        return { ...old, data: old.data.filter((c) => c._id !== campaignId) };
      });
    },
  });
}
