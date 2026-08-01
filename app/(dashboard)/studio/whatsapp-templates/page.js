'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Pencil, Trash2, MessageCircle, AlertCircle } from 'lucide-react';
import {
  useWhatsAppTemplatesQuery,
  useCreateWhatsAppTemplateMutation,
  useUpdateWhatsAppTemplateMutation,
  useDeleteWhatsAppTemplateMutation,
} from '@/hooks/queries/useWhatsAppTemplatesQuery';
import MessageEditor from '@/components/whatsapp/MessageEditor';
import ImageUploader from '@/components/whatsapp/ImageUploader';
import LoadingState from '@/components/common/LoadingState';
import styles from './whatsapp-templates.module.css';

const EMPTY_FORM = { name: '', message: '' };

export default function WhatsAppTemplatesPage() {
  const { data: templates, isPending: loading, error: queryError } = useWhatsAppTemplatesQuery();
  const createMutation = useCreateWhatsAppTemplateMutation();
  const updateMutation = useUpdateWhatsAppTemplateMutation();
  const deleteMutation = useDeleteWhatsAppTemplateMutation();

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [image, setImage] = useState(null); // { url, previewSrc } | null
  const [formError, setFormError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const error = queryError ? queryError.message : null;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const openCreateModal = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setImage(null);
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (template) => {
    setEditingId(template._id);
    setFormData({ name: template.name, message: template.message });
    setImage(template.imageUrl ? { url: template.imageUrl, previewSrc: template.imageUrl } : null);
    setFormError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setImage(null);
    setFormError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError('Template name is required');
      return;
    }
    if (!formData.message.trim()) {
      setFormError('Template message is required');
      return;
    }

    try {
      const payload = { name: formData.name, message: formData.message, imageUrl: image?.url || null };
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      closeModal();
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget._id, {
      onSettled: () => setDeleteTarget(null),
    });
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link href="/studio" className={styles.backLink}>
          <ArrowLeft size={16} />
          Back to Studio
        </Link>

        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>WhatsApp Templates</h1>
            <p className={styles.subtitle}>
              Create reusable message templates to send customers over WhatsApp in one click.
            </p>
          </div>
          <button className={styles.primaryButton} onClick={openCreateModal}>
            <Plus size={18} />
            New Template
          </button>
        </div>

        {loading ? (
          <LoadingState message="Loading templates..." />
        ) : error ? (
          <div className={styles.errorState}>
            <AlertCircle size={40} />
            <p>{error}</p>
          </div>
        ) : templates.length === 0 ? (
          <div className={styles.emptyState}>
            <MessageCircle size={40} />
            <p>No templates yet</p>
            <button className={styles.createLink} onClick={openCreateModal}>
              Create your first template
            </button>
          </div>
        ) : (
          <div className={styles.grid}>
            {templates.map((template) => (
              <div key={template._id} className={styles.card}>
                {template.imageUrl && (
                  <img
                    src={template.imageUrl}
                    alt=""
                    className={styles.cardImage}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
                <div className={styles.cardBody}>
                  <h3 className={styles.cardTitle}>{template.name}</h3>
                  <p className={styles.cardMessage}>{template.message}</p>
                </div>
                <div className={styles.cardActions}>
                  <button className={styles.iconBtn} onClick={() => openEditModal(template)} title="Edit">
                    <Pencil size={16} />
                  </button>
                  <button
                    className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                    onClick={() => setDeleteTarget(template)}
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{editingId ? 'Edit Template' : 'New Template'}</h2>
            </div>

            <form onSubmit={handleSubmit} className={styles.modalBody}>
              {formError && (
                <div className={styles.formError}>
                  <AlertCircle size={16} />
                  {formError}
                </div>
              )}

              <div className={styles.formGroup}>
                <label className={styles.label}>Template Name *</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g. Special Offer"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <MessageEditor
                value={formData.message}
                onChange={(value) => setFormData((prev) => ({ ...prev, message: value }))}
              />
              <p className={styles.hint}>
                Use <code>{'{{customerName}}'}</code> and <code>{'{{reward}}'}</code> to personalize the message when it&apos;s sent.
              </p>

              <div className={styles.formGroup}>
                <label className={styles.label}>Image (optional)</label>
                <ImageUploader value={image} onChange={setImage} onError={setFormError} />
              </div>

              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelButton} onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className={styles.saveButton} disabled={isSaving}>
                  {isSaving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className={styles.modalOverlay} onClick={() => setDeleteTarget(null)}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.confirmTitle}>Delete &quot;{deleteTarget.name}&quot;?</h2>
            <p className={styles.confirmMessage}>This template will be permanently removed.</p>
            <div className={styles.modalFooter}>
              <button className={styles.cancelButton} onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button
                className={styles.deleteButton}
                onClick={handleConfirmDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
