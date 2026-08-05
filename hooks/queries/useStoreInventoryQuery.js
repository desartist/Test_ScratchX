"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/components/auth/AuthContext";

export function storeInventoryQueryKey(accountId) {
  return ["store-inventory", accountId];
}

export async function fetchStoreInventory() {
  const res = await fetch("/api/store-inventory", { credentials: "include" });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || "Failed to load inventory");
  }
  return json; // { store, inventory, campaignAllocations }
}

export function useStoreInventoryQuery() {
  const { account } = useAuthContext();
  const accountId = account?.id || account?._id;

  return useQuery({
    queryKey: storeInventoryQueryKey(accountId),
    queryFn: fetchStoreInventory,
    enabled: !!accountId,
  });
}
