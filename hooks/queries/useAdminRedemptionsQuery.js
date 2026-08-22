"use client";

import { useQuery } from "@tanstack/react-query";

export function adminRedemptionsQueryKey(params = {}) {
  return ["admin-redemptions", params];
}

export async function fetchAdminRedemptions(params = {}) {
  const search = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => [k, String(v)]),
    ),
  );
  const res = await fetch(`/api/admin/redemptions?${search}`, { credentials: "include" });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || "Failed to load redemptions");
  }
  return json; // { success, redemptions, total, page, limit, metrics }
}

export function useAdminRedemptionsQuery(params = {}) {
  return useQuery({
    queryKey: adminRedemptionsQueryKey(params),
    queryFn: () => fetchAdminRedemptions(params),
  });
}
