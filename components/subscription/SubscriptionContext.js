'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

const SubscriptionContext = createContext();

export function SubscriptionProvider({ children }) {
  const [planData, setPlanData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load plan data from API
  const loadPlanData = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[SubscriptionContext] Loading plan data...');
      const response = await fetch('/api/subscription/current', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      console.log('[SubscriptionContext] Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('[SubscriptionContext] API Response:', data);

        if (data?.displayName) {
          const newPlanData = {
            displayName: data.displayName,
            planType: data.subscription?.planType,
            subscription: data.subscription,
          };
          console.log('[SubscriptionContext] Setting plan data:', newPlanData);
          setPlanData(newPlanData);
        }
      } else {
        console.warn('[SubscriptionContext] API returned non-OK status:', response.status);
      }
    } catch (err) {
      console.error('[SubscriptionContext] Error loading plan data:', err);
    } finally {
      setLoading(false);
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
    await loadPlanData();
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
