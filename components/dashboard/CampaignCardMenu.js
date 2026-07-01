'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical, Plus, Pencil, Pause, Play, Trash2, X, AlertTriangle } from 'lucide-react';
import styles from './CampaignCardMenu.module.css';

function DeleteModal({ onConfirm, onCancel, loading, apiError }) {
  return createPortal(
    <div className={styles.modalOverlay} onClick={apiError ? undefined : onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.modalClose} onClick={onCancel}>
          <X size={16} />
        </button>

        {apiError ? (
          <>
            <div className={`${styles.modalIcon} ${styles.modalIconWarn}`}>
              <AlertTriangle size={28} />
            </div>
            <h3 className={styles.modalTitle}>Cannot Delete Campaign</h3>
            <p className={styles.modalText}>{apiError}</p>
            <div className={styles.modalHint}>
              Only draft and ended campaigns can be deleted. To delete an active campaign, wait for it to end or change its status from the campaign detail page.
            </div>
            <button type="button" className={styles.modalCancelFull} onClick={onCancel}>
              Got it
            </button>
          </>
        ) : (
          <>
            <div className={styles.modalIcon}>
              <AlertTriangle size={28} />
            </div>
            <h3 className={styles.modalTitle}>Delete Campaign?</h3>
            <p className={styles.modalText}>
              This will permanently delete the campaign and all its data. This action cannot be undone.
            </p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.modalCancel} onClick={onCancel} disabled={loading}>
                Cancel
              </button>
              <button type="button" className={styles.modalDelete} onClick={onConfirm} disabled={loading}>
                {loading ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

export default function CampaignCardMenu({ onAction, isPaused = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const menuItems = [
    { icon: Plus,   label: 'Scratches', action: 'scratches' },
    { icon: Pencil, label: 'Edit',      action: 'edit' },
    isPaused
      ? { icon: Play,  label: 'Resume', action: 'resume' }
      : { icon: Pause, label: 'Pause',  action: 'pause' },
  ];

  const toggleOpen = useCallback((event) => {
    event.stopPropagation();
    setIsOpen((prev) => !prev);
  }, []);

  const handleMenuClick = useCallback((event, action) => {
    event.stopPropagation();
    setIsOpen(false);
    onAction(action);
  }, [onAction]);

  const handleDeleteClick = useCallback((event) => {
    event.stopPropagation();
    setIsOpen(false);
    setDeleteError(null);
    setShowDeleteModal(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      const result = await onAction('delete');
      if (result && result.error) {
        setDeleteError(result.error);
      } else {
        setShowDeleteModal(false);
      }
    } catch (err) {
      setDeleteError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setDeleting(false);
    }
  }, [onAction]);

  const handleDeleteCancel = useCallback((e) => {
    if (e) e.stopPropagation();
    setShowDeleteModal(false);
    setDeleteError(null);
  }, []);

  return (
    <>
      <div className={styles.menuContainer} ref={menuRef}>
        <button
          type="button"
          className={styles.menuButton}
          onClick={toggleOpen}
          aria-label="Campaign menu"
          aria-haspopup="menu"
          aria-expanded={isOpen}
        >
          <MoreVertical size={18} />
        </button>

        {isOpen && (
          <div className={styles.dropdown} role="menu">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.action}
                  type="button"
                  role="menuitem"
                  className={styles.menuItem}
                  onClick={(event) => handleMenuClick(event, item.action)}
                >
                  <Icon size={16} className={styles.menuIcon} />
                  <span>{item.label}</span>
                </button>
              );
            })}
            <button
              type="button"
              role="menuitem"
              className={`${styles.menuItem} ${styles.menuItemDanger}`}
              onClick={handleDeleteClick}
            >
              <Trash2 size={16} className={styles.menuIconDanger} />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>

      {showDeleteModal && (
        <DeleteModal
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
          loading={deleting}
          apiError={deleteError}
        />
      )}
    </>
  );
}
