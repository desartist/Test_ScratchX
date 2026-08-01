"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function whatsappTemplatesQueryKey() {
  return ["whatsapp-templates"];
}

export async function fetchWhatsAppTemplates() {
  const res = await fetch("/api/whatsapp/templates", { credentials: "include" });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || "Failed to load templates");
  }
  return json.templates;
}

export function useWhatsAppTemplatesQuery(options = {}) {
  return useQuery({
    queryKey: whatsappTemplatesQueryKey(),
    queryFn: fetchWhatsAppTemplates,
    enabled: options.enabled ?? true,
  });
}

export function useCreateWhatsAppTemplateMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      const res = await fetch("/api/whatsapp/templates", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to create template");
      }
      return json.template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: whatsappTemplatesQueryKey() });
    },
  });
}

export function useUpdateWhatsAppTemplateMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const res = await fetch(`/api/whatsapp/templates/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to update template");
      }
      return json.template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: whatsappTemplatesQueryKey() });
    },
  });
}

export function useDeleteWhatsAppTemplateMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`/api/whatsapp/templates/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to delete template");
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: whatsappTemplatesQueryKey() });
    },
  });
}
