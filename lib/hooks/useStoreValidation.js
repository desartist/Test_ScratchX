'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthContext } from '@/components/auth/AuthContext';
import { useStoresQuery } from '@/hooks/queries/useStoresQuery';

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

  const exemptPages = [
    '/stores/create',
    '/stores/edit',
    '/settings',
    '/support',
    '/profile'
  ];
  const isExempt = exemptPages.some(page => pathname?.startsWith(page));

  // Shares the same cached /api/stores response as stores/page.js and
  // stores/create/page.js instead of firing its own request on every page.
  const { data: storesJson, isSuccess } = useStoresQuery({
    enabled: account?.role === 'Merchant' && !isExempt,
  });

  useEffect(() => {
    if (!account?.id || account?.role !== 'Merchant' || isExempt || !isSuccess) {
      return;
    }

    const stores = storesJson?.data || [];
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
  }, [account, pathname, router, isExempt, isSuccess, storesJson]);
}
