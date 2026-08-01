'use client';

import React from 'react';
import { X } from 'lucide-react';
import styles from './whatsapp.module.css';

export default function ImagePreview({ src, onRemove }) {
  if (!src) return null;

  return (
    <div className={styles.imagePreview}>
      <img src={src} alt="Attachment preview" className={styles.imagePreviewImg} />
      <button
        type="button"
        className={styles.imagePreviewRemove}
        onClick={onRemove}
        aria-label="Remove image"
      >
        <X size={14} />
      </button>
    </div>
  );
}
