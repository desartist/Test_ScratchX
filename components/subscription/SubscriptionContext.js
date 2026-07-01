'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuthContext } from '@/components/auth/AuthContext';

const SubscriptionContext = createContext();

export function SubscriptionProvider({ children }) {
  const { account } = useAuthContext();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!account?.id) {
      setLoading(false);
      return;
    }

    const fetchSubscription = async () => {
      try {
        const response = await fetch(`/api/accounts/${account.id}/subscription`, {
          headers: { 'x-user-id': account.id },
        });
        if (response.ok) {
          const data = await response.json();
          setSubscription(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch subscription:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [account?.id]);

  return (
    <SubscriptionContext.Provider value={{ subscription, loading }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    return { subscription: null, loading: false };
  }
  return context;
}
