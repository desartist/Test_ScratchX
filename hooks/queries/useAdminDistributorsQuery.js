"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function adminDistributorsQueryKey(params = {}) {
  return ["admin-distributors", params];
}

export async function fetchAdminDistributors(params = {}) {
  const search = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => [k, String(v)]),
    ),
  );
  const res = await fetch(`/api/admin/distributors?${search}`, {
    credentials: "include",
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || "Failed to load distributors");
  }
  return json; // { success, distributors, total, page, limit, metrics }
}

export function useAdminDistributorsQuery(params = {}) {
  return useQuery({
    queryKey: adminDistributorsQueryKey(params),
    queryFn: () => fetchAdminDistributors(params),
  });
}

export function useCreateDistributorMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData) => {
      const res = await fetch("/api/admin/distributors", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to create distributor");
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-distributors"] });
    },
  });
}

export function useUpdateDistributorStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }) => {
      const res = await fetch("/api/admin/distributors", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to update distributor status");
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-distributors"] });
    },
  });
}
