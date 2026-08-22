"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function adminTeamQueryKey() {
  return ["admin-team"];
}

export async function fetchAdminTeam() {
  const res = await fetch("/api/admin/team", { credentials: "include" });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || "Failed to load team");
  }
  return json.members;
}

export function useAdminTeamQuery() {
  return useQuery({
    queryKey: adminTeamQueryKey(),
    queryFn: fetchAdminTeam,
  });
}

export function useInviteTeamMemberMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const res = await fetch("/api/admin/team", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to invite team member");
      return json.member;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminTeamQueryKey() });
    },
  });
}

export function useUpdateTeamMemberMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const res = await fetch("/api/admin/team", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to update team member");
      return json.member;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminTeamQueryKey() });
    },
  });
}
