"use client";

import { useQuery } from "@tanstack/react-query";

export function distributorMerchantDetailQueryKey(id) {
  return ["distributor-merchant", id];
}

export async function fetchDistributorMerchantDetail(id) {
  const res = await fetch(`/api/distributor/merchants/${id}`, {
    credentials: "include",
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || "Failed to load retailer");
  }
  return json; // { success, merchant }
}

export function useDistributorMerchantDetailQuery(id) {
  return useQuery({
    queryKey: distributorMerchantDetailQueryKey(id),
    queryFn: () => fetchDistributorMerchantDetail(id),
    enabled: !!id,
  });
}

export function distributorMerchantCustomersQueryKey(id, params = {}) {
  return ["distributor-merchant-customers", id, params];
}

export async function fetchDistributorMerchantCustomers(id, params = {}) {
  const search = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => [k, String(v)]),
    ),
  );
  const res = await fetch(`/api/distributor/merchants/${id}/customers?${search}`, {
    credentials: "include",
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || "Failed to load customers");
  }
  return json; // { success, data, pagination, stats, filters }
}

export function useDistributorMerchantCustomersQuery(id, params = {}) {
  return useQuery({
    queryKey: distributorMerchantCustomersQueryKey(id, params),
    queryFn: () => fetchDistributorMerchantCustomers(id, params),
    enabled: !!id,
  });
}
