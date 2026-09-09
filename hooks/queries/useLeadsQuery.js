"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/components/auth/AuthContext";

// Params object shape: { page, limit, search, status, assignedTo, interestLevel }
export function leadsQueryKey(accountId, params = {}) {
  return ["leads", accountId, params];
}

export async function fetchLeads(params = {}) {
  const search = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => [k, String(v)])),
  );
  const res = await fetch(`/api/distributor/leads?${search}`, { credentials: "include" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to load leads");
  return json; // { leads, total, page, limit, metrics }
}

export function useLeadsQuery(params = {}) {
  const { account } = useAuthContext();
  const accountId = account?.id || account?._id;

  return useQuery({
    queryKey: leadsQueryKey(accountId, params),
    queryFn: () => fetchLeads(params),
    enabled: !!accountId,
  });
}

export function leadDetailQueryKey(accountId, leadId) {
  return ["lead-detail", accountId, leadId];
}

export async function fetchLeadDetail(leadId) {
  const res = await fetch(`/api/distributor/leads/${leadId}`, { credentials: "include" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to load lead");
  return json.lead;
}

export function useLeadDetailQuery(leadId) {
  const { account } = useAuthContext();
  const accountId = account?.id || account?._id;

  return useQuery({
    queryKey: leadDetailQueryKey(accountId, leadId),
    queryFn: () => fetchLeadDetail(leadId),
    enabled: !!accountId && !!leadId,
  });
}

export function useCreateLeadMutation() {
  const { account } = useAuthContext();
  const accountId = account?.id || account?._id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData) => {
      const res = await fetch("/api/distributor/leads", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create lead");
      return json.lead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads", accountId] });
    },
  });
}

export function useUpdateLeadMutation() {
  const { account } = useAuthContext();
  const accountId = account?.id || account?._id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, ...updates }) => {
      const res = await fetch(`/api/distributor/leads/${leadId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update lead");
      return json.lead;
    },
    onSuccess: (lead) => {
      queryClient.invalidateQueries({ queryKey: ["leads", accountId] });
      queryClient.invalidateQueries({ queryKey: leadDetailQueryKey(accountId, String(lead._id)) });
    },
  });
}

export function useAddLeadNoteMutation() {
  const { account } = useAuthContext();
  const accountId = account?.id || account?._id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, message }) => {
      const res = await fetch(`/api/distributor/leads/${leadId}/notes`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to add note");
      return json.lead;
    },
    onSuccess: (lead) => {
      queryClient.invalidateQueries({ queryKey: ["leads", accountId] });
      queryClient.invalidateQueries({ queryKey: leadDetailQueryKey(accountId, String(lead._id)) });
    },
  });
}

export function useConvertLeadMutation() {
  const { account } = useAuthContext();
  const accountId = account?.id || account?._id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, retailerId }) => {
      const res = await fetch(`/api/distributor/leads/${leadId}/convert`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ retailerId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to convert lead");
      return json.lead;
    },
    onSuccess: (lead) => {
      queryClient.invalidateQueries({ queryKey: ["leads", accountId] });
      queryClient.invalidateQueries({ queryKey: leadDetailQueryKey(accountId, String(lead._id)) });
    },
  });
}
