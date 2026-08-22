"use client";

import { useQuery } from "@tanstack/react-query";

export function adminCustomersQueryKey(params = {}) {
  return ["admin-customers", params];
}

export async function fetchAdminCustomers(params = {}) {
  const search = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => [k, String(v)]),
    ),
  );
  const res = await fetch(`/api/admin/customers?${search}`, { credentials: "include" });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || "Failed to load customers");
  }
  return json; // { success, customers, total, page, limit, metrics }
}

export function useAdminCustomersQuery(params = {}) {
  return useQuery({
    queryKey: adminCustomersQueryKey(params),
    queryFn: () => fetchAdminCustomers(params),
  });
}
