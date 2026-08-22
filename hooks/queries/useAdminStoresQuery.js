"use client";

import { useQuery } from "@tanstack/react-query";

export function adminStoresQueryKey(params = {}) {
  return ["admin-stores", params];
}

export async function fetchAdminStores(params = {}) {
  const search = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => [k, String(v)]),
    ),
  );
  const res = await fetch(`/api/admin/stores?${search}`, { credentials: "include" });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || "Failed to load stores");
  }
  return json; // { success, stores, total, page, limit, metrics }
}

export function useAdminStoresQuery(params = {}) {
  return useQuery({
    queryKey: adminStoresQueryKey(params),
    queryFn: () => fetchAdminStores(params),
  });
}
