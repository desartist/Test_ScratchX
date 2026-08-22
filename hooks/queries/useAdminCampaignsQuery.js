"use client";

import { useQuery } from "@tanstack/react-query";

export function adminCampaignsQueryKey(params = {}) {
  return ["admin-campaigns", params];
}

export async function fetchAdminCampaigns(params = {}) {
  const search = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => [k, String(v)]),
    ),
  );
  const res = await fetch(`/api/admin/campaigns?${search}`, { credentials: "include" });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || "Failed to load campaigns");
  }
  return json; // { success, campaigns, total, page, limit, metrics }
}

export function useAdminCampaignsQuery(params = {}) {
  return useQuery({
    queryKey: adminCampaignsQueryKey(params),
    queryFn: () => fetchAdminCampaigns(params),
  });
}
