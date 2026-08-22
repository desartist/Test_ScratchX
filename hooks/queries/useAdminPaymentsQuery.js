"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function adminPaymentsQueryKey(params = {}) {
  return ["admin-payments", params];
}

export async function fetchAdminPayments(params = {}) {
  const search = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => [k, String(v)]),
    ),
  );
  const res = await fetch(`/api/admin/payments?${search}`, { credentials: "include" });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || "Failed to load payments");
  }
  return json; // { success, payments, total, page, limit }
}

export function useAdminPaymentsQuery(params = {}) {
  return useQuery({
    queryKey: adminPaymentsQueryKey(params),
    queryFn: () => fetchAdminPayments(params),
  });
}

// action: 'verify' | 'markPaid' | 'reject' | 'refund'
export function useUpdatePaymentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, action }) => {
      const res = await fetch("/api/admin/payments", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to update payment");
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
    },
  });
}

export function useCreateManualPaymentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to record payment");
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
    },
  });
}
