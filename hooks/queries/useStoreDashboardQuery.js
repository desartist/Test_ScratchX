"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/components/auth/AuthContext";

export function storeDashboardQueryKey(accountId) {
  return ["store-dashboard", accountId];
}

export async function fetchStoreDashboard() {
  const res = await fetch("/api/store-dashboard", { credentials: "include" });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || "Failed to load store dashboard");
  }
  return json; // { role, permissions, store, teammates }
}

export function useStoreDashboardQuery() {
  const { account } = useAuthContext();
  const accountId = account?.id || account?._id;

  return useQuery({
    queryKey: storeDashboardQueryKey(accountId),
    queryFn: fetchStoreDashboard,
    enabled: !!accountId,
  });
}
