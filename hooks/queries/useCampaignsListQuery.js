"use client";

import { useQuery } from "@tanstack/react-query";
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
