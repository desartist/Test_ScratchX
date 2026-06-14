'use client';
import React from 'react';
import Modal from '@/components/common/Modal';
import FormButton from '@/components/common/FormButton';

export default function StoreDeleteModal({
  store,
  isOpen,
  onConfirm,
  onCancel,
  loading = false
}) {
  if (!store) return null;

  const handleConfirm = () => {
    onConfirm(store._id);
  };

  return (
    <Modal
      isOpen={isOpen}
      title="Delete Store"
      onClose={onCancel}
      footer={
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <FormButton
            type="button"
            variant="cancel"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </FormButton>
          <FormButton
            type="button"
            variant="danger"
            onClick={handleConfirm}
            loading={loading}
            disabled={loading}
          >
            {loading ? 'Deleting...' : 'Delete'}
          </FormButton>
        </div>
      }
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '16px' }}>⚠️</div>
        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>
          Are you sure you want to delete <strong>"{store.name}"</strong>?
        </p>
        <p style={{ fontSize: '13px', color: '#ef4444' }}>
          This action cannot be undone.
        </p>
      </div>
    </Modal>
  );
}
