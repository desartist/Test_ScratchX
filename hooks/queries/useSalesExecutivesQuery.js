"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/components/auth/AuthContext";

export function salesExecutivesQueryKey(accountId) {
  return ["sales-executives", accountId];
}

export async function fetchSalesExecutives() {
  const res = await fetch("/api/distributor/sales-executives", { credentials: "include" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to load sales executives");
  return json; // { executives, count }
}

export function useSalesExecutivesQuery() {
  const { account } = useAuthContext();
  const accountId = account?.id || account?._id;

  return useQuery({
    queryKey: salesExecutivesQueryKey(accountId),
    queryFn: fetchSalesExecutives,
    enabled: !!accountId,
  });
}

export function useCreateSalesExecutiveMutation() {
  const { account } = useAuthContext();
  const accountId = account?.id || account?._id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData) => {
      const res = await fetch("/api/distributor/sales-executives", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to add sales executive");
      return json.executive;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salesExecutivesQueryKey(accountId) });
    },
  });
}

export function useUpdateSalesExecutiveMutation() {
  const { account } = useAuthContext();
  const accountId = account?.id || account?._id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ executiveId, ...updates }) => {
      const res = await fetch(`/api/distributor/sales-executives/${executiveId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update sales executive");
      return json.executive;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salesExecutivesQueryKey(accountId) });
    },
  });
}
