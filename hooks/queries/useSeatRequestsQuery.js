"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/components/auth/AuthContext";

export function distributorSeatRequestsQueryKey(accountId, status) {
  return status ? ["distributor-seat-requests", accountId, status] : ["distributor-seat-requests", accountId];
}

// Distributor's view of extra-seat requests from their retailers.
export function useDistributorSeatRequestsQuery(status) {
  const { account } = useAuthContext();
  const accountId = account?.id || account?._id;

  return useQuery({
    queryKey: distributorSeatRequestsQueryKey(accountId, status),
    queryFn: async () => {
      const url = status ? `/api/distributor/seat-requests?status=${status}` : "/api/distributor/seat-requests";
      const res = await fetch(url, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load seat requests");
      return data.requests || [];
    },
    enabled: !!accountId,
  });
}

export function useResolveSeatRequestMutation() {
  const { account } = useAuthContext();
  const accountId = account?.id || account?._id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, status, notes }) => {
      const res = await fetch(`/api/distributor/seat-requests/${requestId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update request");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["distributor-seat-requests", accountId] });
    },
  });
}
