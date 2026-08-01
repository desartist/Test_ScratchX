'use client';

import React, { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import ImagePreview from './ImagePreview';
import styles from './whatsapp.module.css';

const MAX_SIZE_BYTES = 500 * 1024; // 500 KB — matches the server-side cap
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * value: { url, previewSrc } | null — `url` is the public link used in the
 * WhatsApp message text, `previewSrc` is the local data URL shown as a
 * thumbnail (the `url` points at APP_URL, which may not be reachable from
 * a local dev browser, so the preview never depends on it).
 */
export default function ImageUploader({ value, onChange, onError }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      onError?.('Only JPEG, PNG, WebP, and GIF images are allowed');
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      onError?.('Image too large. Maximum size is 500 KB.');
      return;
    }

    setUploading(true);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch('/api/whatsapp/upload-image', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData: dataUrl }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Upload failed');

      onChange({ url: json.url, previewSrc: dataUrl });
    } catch (err) {
      onError?.(err.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  if (value?.previewSrc) {
    return <ImagePreview src={value.previewSrc} onRemove={() => onChange(null)} />;
  }

  return (
    <div className={styles.uploadBox}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={(e) => handleFile(e.target.files?.[0])}
        className={styles.uploadInput}
        disabled={uploading}
      />
      <Upload size={18} />
      <span>{uploading ? 'Uploading...' : 'Upload an image (optional)'}</span>
    </div>
  );
}
