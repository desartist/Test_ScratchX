"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/components/auth/AuthContext";

export function notificationsQueryKey(accountId) {
  return ["notifications", accountId];
}

export async function fetchNotifications() {
  const res = await fetch(`/api/notifications?limit=100`, {
    credentials: "include",
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Failed to load notifications");
  return json.data; // { notifications, unread }
}

export function useNotificationsQuery() {
  const { account } = useAuthContext();
  const accountId = account?.id || account?._id;

  return useQuery({
    queryKey: notificationsQueryKey(accountId),
    queryFn: fetchNotifications,
    enabled: !!accountId,
  });
}

export function useMarkNotificationReadMutation() {
  const { account } = useAuthContext();
  const accountId = account?.id || account?._id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId) => {
      const res = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to mark as read");
      return json;
    },
    onSuccess: (_data, notificationId) => {
      queryClient.setQueryData(notificationsQueryKey(accountId), (prev) => {
        if (!prev) return prev;
        return {
          notifications: prev.notifications.map((n) =>
            n._id === notificationId ? { ...n, read: true } : n,
          ),
          unread: Math.max(0, (prev.unread || 0) - 1),
        };
      });
    },
  });
}

export function useDeleteNotificationMutation() {
  const { account } = useAuthContext();
  const accountId = account?.id || account?._id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId) => {
      const res = await fetch(`/api/notifications/${notificationId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to delete notification");
      return json;
    },
    onSuccess: (_data, notificationId) => {
      queryClient.setQueryData(notificationsQueryKey(accountId), (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          notifications: prev.notifications.filter((n) => n._id !== notificationId),
        };
      });
    },
  });
}
