"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function adminNotificationsQueryKey(params = {}) {
  return ["admin-notifications", params];
}

export async function fetchAdminNotifications(params = {}) {
  const search = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => [k, String(v)]),
    ),
  );
  const res = await fetch(`/api/admin/notifications?${search}`, { credentials: "include" });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || "Failed to load notifications");
  }
  return json; // { success, notifications, total, page, limit, metrics }
}

export function useAdminNotificationsQuery(params = {}) {
  return useQuery({
    queryKey: adminNotificationsQueryKey(params),
    queryFn: () => fetchAdminNotifications(params),
  });
}

export function useSendAnnouncementMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const res = await fetch("/api/admin/notifications/announce", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to send announcement");
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
    },
  });
}
