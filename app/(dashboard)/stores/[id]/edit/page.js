'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthContext } from '@/components/auth/AuthContext';
import StoreForm from '@/components/stores/StoreForm';
import styles from './page.module.css';

export default function EditStorePage() {
  const router = useRouter();
  const params = useParams();
  const { account } = useAuthContext();
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [id, setId] = useState(null);

  // Extract id from params
  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await Promise.resolve(params);
      setId(resolvedParams.id);
    };
    resolveParams();
  }, [params]);

  // Fetch store on mount
  useEffect(() => {
    const fetchStore = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!account || !account.id) {
          setError('No account information available');
          setLoading(false);
          return;
        }

        const response = await fetch(`/api/stores/${id}`, {
          headers: {
            'x-user-id': account.id,
            'x-user-role': account.role
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to load store');
        }

        const result = await response.json();
        setStore(result.data);
      } catch (err) {
        setError(err.message || 'Failed to load store. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (id && account) {
      fetchStore();
    }
  }, [id, account]);

  // Update store
  const handleSubmit = async (formData) => {
    try {
      setFormLoading(true);
      setError(null);

      if (!account || !account.id) {
        setError('No account information available');
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

      router.push(`/stores/${id}`);
    } catch (err) {
      setError(err.message || 'Failed to update store. Please try again.');
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
        <a href={`/stores/${id}`} className={styles.backLink}>
          ← Back to Store
        </a>
        <h1 className={styles.title}>Edit Store: {store?.name}</h1>
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
