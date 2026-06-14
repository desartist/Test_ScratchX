'use client';

import React, { useEffect, useRef } from 'react';
import styles from './Modal.module.css';

/**
 * Reusable Modal/Dialog Component
 *
 * Features:
 * - Overlay click to close
 * - ESC key to close
 * - Close button (X) in top-right
 * - Slide-in animation from top
 * - Prevent body scroll when modal open
 * - Focus trap (focuses first focusable element)
 * - Conditional rendering (only render to DOM when open)
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is visible (required)
 * @param {string} props.title - Modal title (required)
 * @param {React.ReactNode} props.children - Modal body content (required)
 * @param {Function} props.onClose - Callback when modal should close (required)
 * @param {React.ReactNode} props.footer - Optional footer content (usually buttons)
 */
export default function Modal({
  isOpen,
  title,
  children,
  onClose,
  footer
}) {
  const modalRef = useRef(null);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  // Focus trap - focus first focusable element in modal
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    // Get all focusable elements
    const focusableElements = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length > 0) {
      // Focus the first focusable element (usually the close button)
      focusableElements[0].focus();
    }

    // Handle Tab key to trap focus
    const handleTab = (e) => {
      if (e.key !== 'Tab') return;

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        // Shift+Tab
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  // Only render to DOM when open (not display: none)
  if (!isOpen) return null;

  return (
    <div
      className={styles.modalOverlay}
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={modalRef}
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Modal Header */}
        <div className={styles.modalHeader}>
          <h2 id="modal-title" className={styles.modalTitle}>{title}</h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close modal"
            type="button"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className={styles.modalBody}>
          {children}
        </div>

        {/* Modal Footer (if provided) */}
        {footer && (
          <div className={styles.modalFooter}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
