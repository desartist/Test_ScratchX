"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function adminSubscriptionsQueryKey(params = {}) {
  return ["admin-subscriptions", params];
}

export async function fetchAdminSubscriptions(params = {}) {
  const search = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => [k, String(v)]),
    ),
  );
  const res = await fetch(`/api/admin/subscriptions?${search}`, { credentials: "include" });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || "Failed to load subscriptions");
  }
  return json; // { success, subscriptions, total, page, limit, metrics }
}

export function useAdminSubscriptionsQuery(params = {}) {
  return useQuery({
    queryKey: adminSubscriptionsQueryKey(params),
    queryFn: () => fetchAdminSubscriptions(params),
  });
}

// Cancel or extend a single subscription (PATCH /api/admin/subscriptions/[id]).
export function useUpdateSubscriptionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, action, extendDays }) => {
      const res = await fetch(`/api/admin/subscriptions/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, extendDays }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to update subscription");
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
    },
  });
}

// Assign/change a plan for a merchant or distributor
// (POST /api/admin/subscription/assign — existing, reused as-is).
export function useAssignPlanMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ownerType, ownerId, planId, planCode }) => {
      const res = await fetch("/api/admin/subscription/assign", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerType, ownerId, planId, planCode }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to assign plan");
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
    },
  });
}
