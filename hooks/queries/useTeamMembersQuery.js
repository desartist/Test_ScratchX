"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/components/auth/AuthContext";

export function teamMembersQueryKey(accountId, storeId) {
  return storeId ? ["team-members", accountId, storeId] : ["team-members", accountId];
}

export async function fetchTeamMembers(storeId) {
  const url = storeId ? `/api/team/members?storeId=${storeId}` : "/api/team/members";
  const res = await fetch(url, { credentials: "include" });
  if (res.status === 404) {
    return { members: [] };
  }
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || "Failed to load team members");
  }
  return json; // { members, limitStatus? }
}

// storeId is optional — omit it to fetch the legacy account-wide Manager
// list, pass it to fetch a store's Store_Manager/Store_Staff team + limits.
export function useTeamMembersQuery(storeId) {
  const { account } = useAuthContext();
  const accountId = account?.id || account?._id;

  return useQuery({
    queryKey: teamMembersQueryKey(accountId, storeId),
    queryFn: () => fetchTeamMembers(storeId),
    enabled: !!accountId,
  });
}

export function useCreateTeamMemberMutation() {
  const { account } = useAuthContext();
  const accountId = account?.id || account?._id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData) => {
      const res = await fetch("/api/team/members", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) {
        const err = new Error(data.error || "Failed to create team member");
        err.limitStatus = data.limitStatus;
        throw err;
      }
      return data;
    },
    onSuccess: () => {
      // Prefix match invalidates every storeId variant of this account's team queries.
      queryClient.invalidateQueries({ queryKey: ["team-members", accountId] });
    },
  });
}

export function useUpdateTeamMemberMutation() {
  const { account } = useAuthContext();
  const accountId = account?.id || account?._id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, ...editFormData }) => {
      const res = await fetch("/api/team/members", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, ...editFormData }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update team member");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members", accountId] });
    },
  });
}

export function useDeleteTeamMemberMutation() {
  const { account } = useAuthContext();
  const accountId = account?.id || account?._id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberId) => {
      const res = await fetch(`/api/team/members?memberId=${memberId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete team member");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members", accountId] });
    },
  });
}

export function seatRequestsQueryKey(accountId, storeId) {
  return storeId ? ["team-seat-requests", accountId, storeId] : ["team-seat-requests", accountId];
}

// A merchant's own extra-seat requests (optionally scoped to a store) — used
// to show "request pending with your distributor" state on the Team page.
export function useOwnSeatRequestsQuery(storeId) {
  const { account } = useAuthContext();
  const accountId = account?.id || account?._id;

  return useQuery({
    queryKey: seatRequestsQueryKey(accountId, storeId),
    queryFn: async () => {
      const url = storeId ? `/api/team/seats/request?storeId=${storeId}` : "/api/team/seats/request";
      const res = await fetch(url, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load seat requests");
      return data.requests || [];
    },
    enabled: !!accountId,
  });
}

// No payment gateway here — this notifies the merchant's distributor, who
// collects payment manually and marks the request Paid from their panel.
export function useRequestTeamSeatMutation() {
  const { account } = useAuthContext();
  const accountId = account?.id || account?._id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ storeId, role, quantity }) => {
      const res = await fetch("/api/team/seats/request", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, role, quantity }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to request extra seat");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-seat-requests", accountId] });
    },
  });
}
