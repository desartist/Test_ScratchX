"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/components/auth/AuthContext";

export function teamMembersQueryKey(accountId) {
  return ["team-members", accountId];
}

export async function fetchTeamMembers() {
  const res = await fetch("/api/team/members", { credentials: "include" });
  if (res.status === 404) {
    return { members: [] };
  }
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || "Failed to load team members");
  }
  return json; // { members }
}

export function useTeamMembersQuery() {
  const { account } = useAuthContext();
  const accountId = account?.id || account?._id;

  return useQuery({
    queryKey: teamMembersQueryKey(accountId),
    queryFn: fetchTeamMembers,
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
        throw new Error(data.error || "Failed to create team member");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamMembersQueryKey(accountId) });
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
      queryClient.invalidateQueries({ queryKey: teamMembersQueryKey(accountId) });
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
      queryClient.invalidateQueries({ queryKey: teamMembersQueryKey(accountId) });
    },
  });
}
