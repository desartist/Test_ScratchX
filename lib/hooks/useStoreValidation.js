'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthContext } from '@/components/auth/AuthContext';

/**
 * Custom hook for store validation
 * Redirects to /stores/create if user has no stores
 *
 * Usage:
 * useStoreValidation(); // In any page that requires a store
 */
export function useStoreValidation() {
  const router = useRouter();
  const pathname = usePathname();
  const { account } = useAuthContext();

  useEffect(() => {
    const validateStores = async () => {
      // Only check if user is authenticated and is a Merchant
      if (!account?.id || account?.role !== 'Merchant') {
        return;
      }

      // Skip validation on pages that don't require stores
      const exemptPages = [
        '/stores/create',
        '/stores/edit',
        '/settings',
        '/support',
        '/profile'
      ];

      if (exemptPages.some(page => pathname?.startsWith(page))) {
        return;
      }

      try {
        // Check if merchant has any stores
        const response = await fetch('/api/stores', {
          headers: {
            'x-user-id': account.id,
            'x-user-role': account.role
          }
        });

        if (response.ok) {
          const result = await response.json();
          const stores = result.data || [];

          // If no stores exist, redirect to create store page
          if (stores.length === 0) {
            // Pages that should NOT redirect (allow viewing even without stores)
            const allowedWithoutStores = [
              '/stores',           // Store listing page (shows empty state)
              '/campaign/new',     // Create campaign (user can still create, then assign later)
            ];

            const shouldRedirect = !allowedWithoutStores.some(page =>
              pathname?.startsWith(page)
            );

            if (shouldRedirect) {
              router.push('/stores/create');
            }
          }
        }
      } catch (error) {
        console.error('Error validating stores:', error);
      }
    };

    validateStores();
  }, [account, pathname, router]);
}
