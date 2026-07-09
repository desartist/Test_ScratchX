'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthContext } from '@/components/auth/AuthContext';
import { useStoreDetailQuery, useInvalidateStoreDetail } from '@/hooks/queries/useStoreDetailQuery';
import StoreForm from '@/components/stores/StoreForm';
import styles from './page.module.css';

export default function EditStorePage() {
  const router = useRouter();
  const params = useParams();
  const { account } = useAuthContext();
  const [formLoading, setFormLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [id, setId] = useState(null);

  // Extract id from params
  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await Promise.resolve(params);
      setId(resolvedParams.id);
    };
    resolveParams();
  }, [params]);

  // Shares the same cached /api/stores/{id} response as stores/[id]/page.js.
  const {
    data: storeJson,
    isPending: loading,
    error: queryError,
  } = useStoreDetailQuery(id);
  const store = storeJson?.data || null;
  const error = submitError || (queryError ? queryError.message || 'Failed to load store' : null);
  const invalidateStoreDetail = useInvalidateStoreDetail();

  // Update store
  const handleSubmit = async (formData) => {
    try {
      setFormLoading(true);
      setSubmitError(null);

      if (!account || !account.id) {
        setSubmitError('No account information available');
        setFormLoading(false);
        return;
      }

      const response = await fetch(`/api/stores/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': account.id,
          'x-user-role': account.role
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update store');
      }

      invalidateStoreDetail(id);
      router.push(`/stores/${id}`);
    } catch (err) {
      setSubmitError(err.message || 'Failed to update store. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleCancel = () => {
    router.push(`/stores/${id}`);
  };

  // Loading state
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading store...</div>
      </div>
    );
  }

  // Error state (no store found)
  if (!store && !loading) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          {error || 'Store not found. Please try again.'}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <a href={`/stores/${id}`} className={styles.backLink}>‹</a>
        <h1 className={styles.title}>Edit Store</h1>
      </div>

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      <div className={styles.formContainer}>
        <StoreForm
          storeData={store}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={formLoading}
        />
      </div>
    </div>
  );
}
