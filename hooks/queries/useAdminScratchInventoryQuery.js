"use client";

import { useQuery } from "@tanstack/react-query";

export function adminScratchInventoryQueryKey(params = {}) {
  return ["admin-scratch-inventory", params];
}

export async function fetchAdminScratchInventory(params = {}) {
  const search = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => [k, String(v)]),
    ),
  );
  const res = await fetch(`/api/admin/scratch-inventory?${search}`, { credentials: "include" });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || "Failed to load scratch inventory");
  }
  return json; // { success, merchants, total, page, limit, totals }
}

export function useAdminScratchInventoryQuery(params = {}) {
  return useQuery({
    queryKey: adminScratchInventoryQueryKey(params),
    queryFn: () => fetchAdminScratchInventory(params),
  });
}
