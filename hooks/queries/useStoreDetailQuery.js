"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/components/auth/AuthContext";

export function storeDetailQueryKey(storeId) {
  return ["store", storeId];
}

function authHeaders(userId, role) {
  return {
    "x-user-id": userId || "",
    "x-user-role": role || "Merchant",
  };
}

export async function fetchStoreDetail(storeId, { userId, role }) {
  const res = await fetch(`/api/stores/${storeId}`, {
    headers: authHeaders(userId, role),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || "Failed to load store");
  }
  return json; // { success, data }
}

// Shared across stores/[id]/page.js and stores/[id]/edit/page.js — both
// previously fetched /api/stores/{id} independently.
export function useStoreDetailQuery(storeId, options = {}) {
  const { account } = useAuthContext();
  const userId = account?.id || account?._id;

  return useQuery({
    queryKey: storeDetailQueryKey(storeId),
    queryFn: () => fetchStoreDetail(storeId, { userId, role: account?.role }),
    enabled: !!storeId && !!userId && options.enabled !== false,
  });
}

// Invalidates the store's own detail cache plus the merchant's stores list
// (any ["stores", accountId] query) after an edit, delete, or campaign
// assignment change.
export function useInvalidateStoreDetail() {
  const queryClient = useQueryClient();
  return (storeId) => {
    queryClient.invalidateQueries({ queryKey: storeDetailQueryKey(storeId) });
    queryClient.invalidateQueries({ queryKey: ["stores"] });
  };
}
