"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function distributorMerchantsQueryKey(params = {}) {
  return ["distributor-merchants", params];
}

export async function fetchDistributorMerchants(params = {}) {
  const search = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => [k, String(v)]),
    ),
  );
  const res = await fetch(`/api/distributor/merchants?${search}`, {
    credentials: "include",
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || "Failed to load merchants");
  }
  return json; // { success, merchants, total, page, limit, metrics }
}

export function useDistributorMerchantsQuery(params = {}) {
  return useQuery({
    queryKey: distributorMerchantsQueryKey(params),
    queryFn: () => fetchDistributorMerchants(params),
  });
}

export function useCreateMerchantMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData) => {
      const res = await fetch("/api/distributor/merchants", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to create merchant");
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["distributor-merchants"] });
    },
  });
}

export function useUpdateMerchantStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }) => {
      const res = await fetch("/api/distributor/merchants", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to update merchant status");
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["distributor-merchants"] });
    },
  });
}
