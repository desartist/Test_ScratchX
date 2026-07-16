"use client";

import { useQuery } from "@tanstack/react-query";

export function distributorCommissionsQueryKey(params = {}) {
  return ["distributor-commissions", params];
}

export async function fetchDistributorCommissions(params = {}) {
  const search = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => [k, String(v)]),
    ),
  );
  const res = await fetch(`/api/distributor/commissions?${search}`, {
    credentials: "include",
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || "Failed to load commissions");
  }
  return json.data; // { commissions, pagination, summary }
}

export function useDistributorCommissionsQuery(params = {}) {
  return useQuery({
    queryKey: distributorCommissionsQueryKey(params),
    queryFn: () => fetchDistributorCommissions(params),
  });
}
