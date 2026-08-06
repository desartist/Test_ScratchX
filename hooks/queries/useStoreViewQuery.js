"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/components/auth/AuthContext";

export function storeViewQueryKey(accountId) {
  return ["store-view", accountId];
}

export async function fetchStoreView() {
  const res = await fetch("/api/store-view", { credentials: "include" });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || "Failed to load store details");
  }
  return json;
}

export function useStoreViewQuery() {
  const { account } = useAuthContext();
  const accountId = account?.id || account?._id;

  return useQuery({
    queryKey: storeViewQueryKey(accountId),
    queryFn: fetchStoreView,
    enabled: !!accountId,
  });
}
