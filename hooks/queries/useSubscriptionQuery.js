"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/components/auth/AuthContext";

export function subscriptionCurrentQueryKey(accountId) {
  return ["subscription-current", accountId];
}

export function subscriptionStatusQueryKey(accountId) {
  return ["subscription-status", accountId];
}

export function subscriptionPlansQueryKey() {
  return ["subscription-plans"];
}

export async function fetchSubscriptionCurrent() {
  const res = await fetch("/api/subscription/current", { credentials: "include" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || "Failed to load subscription");
  }
  return json; // { success, subscription, displayName }
}

export async function fetchSubscriptionStatus() {
  const res = await fetch("/api/subscription/status", { credentials: "include" });
  return res.json();
}

export async function fetchSubscriptionPlans() {
  const res = await fetch("/api/subscription/plans");
  const json = await res.json().catch(() => ({}));
  if (!json.success) {
    throw new Error(json.error || "Failed to load plans");
  }
  return json; // { success, data }
}

// Shared across settings cards (SettingsAccountCard, SettingsSubscriptionCard,
// SettingsProfileCard — all three previously fetched this independently and
// simultaneously on every settings page visit), SubscriptionSummaryCard,
// team/page.js, subscription/page.js, and billing/plans/page.js.
export function useSubscriptionCurrentQuery(options = {}) {
  const { account } = useAuthContext();
  const accountId = account?.id || account?._id;

  return useQuery({
    queryKey: subscriptionCurrentQueryKey(accountId),
    queryFn: fetchSubscriptionCurrent,
    enabled: !!accountId && options.enabled !== false,
  });
}

// Shared across stores/page.js, campaign/[id]/page.js, LaunchWizardModal.js,
// ScratchAllocationModal.js, and subscription/page.js.
export function useSubscriptionStatusQuery(options = {}) {
  const { account } = useAuthContext();
  const accountId = account?.id || account?._id;

  return useQuery({
    queryKey: subscriptionStatusQueryKey(accountId),
    queryFn: fetchSubscriptionStatus,
    enabled: !!accountId && options.enabled !== false,
  });
}

// Not account-scoped — plan definitions are the same for every account.
// Shared across subscription/page.js and billing/plans/page.js.
export function useSubscriptionPlansQuery(options = {}) {
  return useQuery({
    queryKey: subscriptionPlansQueryKey(),
    queryFn: fetchSubscriptionPlans,
    staleTime: 5 * 60 * 1000,
    enabled: options.enabled !== false,
  });
}

// Invalidate all subscription caches after a purchase/upgrade/reload.
export function useInvalidateSubscription() {
  const queryClient = useQueryClient();
  const { account } = useAuthContext();
  const accountId = account?.id || account?._id;

  return () => {
    queryClient.invalidateQueries({ queryKey: subscriptionCurrentQueryKey(accountId) });
    queryClient.invalidateQueries({ queryKey: subscriptionStatusQueryKey(accountId) });
    queryClient.invalidateQueries({ queryKey: subscriptionPlansQueryKey() });
  };
}
