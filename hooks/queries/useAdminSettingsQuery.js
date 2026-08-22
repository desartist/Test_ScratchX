"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function adminSettingsQueryKey() {
  return ["admin-settings"];
}

export async function fetchAdminSettings() {
  const res = await fetch("/api/admin/settings", { credentials: "include" });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Failed to load settings");
  return json.settings;
}

export function useAdminSettingsQuery() {
  return useQuery({
    queryKey: adminSettingsQueryKey(),
    queryFn: fetchAdminSettings,
  });
}

export function useUpdateAdminSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to update settings");
      return json.settings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminSettingsQueryKey() });
      queryClient.invalidateQueries({ queryKey: ["platform-settings-public"] });
    },
  });
}
