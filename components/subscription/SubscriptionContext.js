'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const SubscriptionContext = createContext();

export function SubscriptionProvider({ children }) {
  const [planData, setPlanData] = useState(null);
  const [loading, setLoading] = useState(true);

  const lastLoadedAt = useRef(0);
  const inFlight = useRef(null);
  const hasData = useRef(false);

  // Load plan data from API. PlanStatusCard asks for a refresh on every
  // navigation and tab-focus, which fired a burst of identical requests (and
  // flashed the skeleton each time) — so unless `force` is passed (payment
  // flows), reuse a load that is in flight or finished in the last 15s, and
  // only show the loading state when there is nothing to display yet.
  const loadPlanData = useCallback(async ({ force = false } = {}) => {
    if (!force) {
      if (inFlight.current) return inFlight.current;
      if (Date.now() - lastLoadedAt.current < 15_000) return undefined;
    }
    const run = (async () => {
    try {
      if (!hasData.current) setLoading(true);
      const response = await fetch('/api/subscription/current', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();

        if (data?.displayName) {
          const newPlanData = {
            displayName: data.displayName,
            planType: data.subscription?.planType,
            subscription: data.subscription,
          };
          hasData.current = true;
          setPlanData(newPlanData);
        }
      }
    } catch (err) {
      console.error('[SubscriptionContext] Error loading plan data:', err);
    } finally {
      lastLoadedAt.current = Date.now();
      setLoading(false);
    }
    })();
    inFlight.current = run;
    try {
      await run;
    } finally {
      inFlight.current = null;
    }
  }, []);

  // Update plan in global state (called after successful payment)
  const updatePlan = useCallback(async () => {
    // First reload from server
    try {
      await fetch('/api/subscription/reload', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      console.error('Error reloading plan:', err);
    }

    // Then load fresh data
    await loadPlanData({ force: true });
  }, [loadPlanData]);

  // Initialize plan data on mount
  React.useEffect(() => {
    loadPlanData();
  }, [loadPlanData]);

  const value = {
    planData,
    loading,
    updatePlan,
    loadPlanData,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return context;
}
