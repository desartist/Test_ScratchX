"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/components/auth/AuthContext";

// Params object shape: { page, limit, search, campaign, store, status, dateRange, sortBy }
export function customersQueryKey(accountId, params = {}) {
  return ["customers", accountId, params];
}

export async function fetchCustomers({ accountId, role, params = {} }) {
  const search = new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  );
  const res = await fetch(`/api/customers?${search}`, {
    headers: {
      "x-user-id": accountId || "",
      "x-user-role": role || "merchant",
    },
  });
  if (!res.ok) {
    throw new Error("Failed to fetch customers");
  }
  return res.json(); // { data, stats, filters: { campaigns, stores } }
}

// Shared across customers/page.js (filtered + paginated) and
// analytics/page.js (unfiltered, full list) — both previously fetched
// /api/customers independently, with customers/page.js additionally
// special-casing "only cache page 1" via criticalFetchService.
export function useCustomersQuery(params = {}, options = {}) {
  const { account } = useAuthContext();
  const accountId = account?.id || account?._id;

  return useQuery({
    queryKey: customersQueryKey(accountId, params),
    queryFn: () => fetchCustomers({ accountId, role: account?.role, params }),
    enabled: !!accountId && options.enabled !== false,
  });
}
