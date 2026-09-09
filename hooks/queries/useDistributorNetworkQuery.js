"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/components/auth/AuthContext";

// ── Campaign Support ─────────────────────────────────────────────────────
export async function fetchDistributorCampaigns(params = {}) {
  const search = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")),
  );
  const res = await fetch(`/api/distributor/campaigns?${search}`, { credentials: "include" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to load campaigns");
  return json; // { campaigns, metrics }
}

export function useDistributorCampaignsQuery(params = {}) {
  const { account } = useAuthContext();
  const accountId = account?.id || account?._id;
  return useQuery({
    queryKey: ["distributor-campaigns", accountId, params],
    queryFn: () => fetchDistributorCampaigns(params),
    enabled: !!accountId,
  });
}

// ── Retailer Activity ─────────────────────────────────────────────────────
export function useRetailerActivityQuery() {
  const { account } = useAuthContext();
  const accountId = account?.id || account?._id;
  return useQuery({
    queryKey: ["distributor-activity", accountId],
    queryFn: async () => {
      const res = await fetch("/api/distributor/activity", { credentials: "include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load activity");
      return json.events || [];
    },
    enabled: !!accountId,
  });
}

// ── License Inventory ─────────────────────────────────────────────────────
export function useDistributorInventoryQuery() {
  const { account } = useAuthContext();
  const accountId = account?.id || account?._id;
  return useQuery({
    queryKey: ["distributor-inventory", accountId],
    queryFn: async () => {
      const res = await fetch("/api/distributor/inventory", { credentials: "include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load inventory");
      return json.data;
    },
    enabled: !!accountId,
  });
}

// ── Assign a plan to an existing retailer (Retailer Activation, Sell/Allocate) ──
export function useAssignPlanMutation() {
  const { account } = useAuthContext();
  const accountId = account?.id || account?._id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ retailerId, planType }) => {
      const res = await fetch(`/api/distributor/retailers/${retailerId}/assign-plan`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planType }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to assign plan");
      return json.subscription;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["distributor-merchants"] });
      queryClient.invalidateQueries({ queryKey: ["distributor-inventory", accountId] });
      queryClient.invalidateQueries({ queryKey: ["distributor-dashboard"] });
    },
  });
}

// ── Payments ──────────────────────────────────────────────────────────────
export function useDistributorPaymentsQuery(params = {}) {
  const { account } = useAuthContext();
  const accountId = account?.id || account?._id;
  return useQuery({
    queryKey: ["distributor-payments", accountId, params],
    queryFn: async () => {
      const search = new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")),
      );
      const res = await fetch(`/api/distributor/payments?${search}`, { credentials: "include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load payments");
      return json; // { payments, total, page, limit, metrics }
    },
    enabled: !!accountId,
  });
}

// ── Self-service support tickets (Campaign Support "Escalate") ──────────────
export function useCreateSupportTicketMutation() {
  return useMutation({
    mutationFn: async ({ subject, description, category, priority }) => {
      const res = await fetch("/api/support-tickets", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, description, category, priority }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to submit ticket");
      return json.ticket;
    },
  });
}
