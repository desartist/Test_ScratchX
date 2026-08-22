"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function adminSupportTicketsQueryKey(params = {}) {
  return ["admin-support-tickets", params];
}

export async function fetchAdminSupportTickets(params = {}) {
  const search = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => [k, String(v)]),
    ),
  );
  const res = await fetch(`/api/admin/support-tickets?${search}`, { credentials: "include" });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || "Failed to load support tickets");
  }
  return json; // { success, tickets, total, page, limit, metrics }
}

export function useAdminSupportTicketsQuery(params = {}) {
  return useQuery({
    queryKey: adminSupportTicketsQueryKey(params),
    queryFn: () => fetchAdminSupportTickets(params),
  });
}

export function adminSupportTicketDetailQueryKey(id) {
  return ["admin-support-ticket", id];
}

export async function fetchAdminSupportTicketDetail(id) {
  const res = await fetch(`/api/admin/support-tickets/${id}`, { credentials: "include" });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || "Failed to load ticket");
  }
  return json.ticket;
}

export function useAdminSupportTicketDetailQuery(id) {
  return useQuery({
    queryKey: adminSupportTicketDetailQueryKey(id),
    queryFn: () => fetchAdminSupportTicketDetail(id),
    enabled: !!id,
  });
}

export function useCreateSupportTicketMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const res = await fetch("/api/admin/support-tickets", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to create ticket");
      return json.ticket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
    },
  });
}

// action: 'assign' | 'status' | 'escalate' | 'reply'
export function useUpdateSupportTicketMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }) => {
      const res = await fetch(`/api/admin/support-tickets/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to update ticket");
      return json.ticket;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
      queryClient.invalidateQueries({ queryKey: adminSupportTicketDetailQueryKey(variables.id) });
    },
  });
}
