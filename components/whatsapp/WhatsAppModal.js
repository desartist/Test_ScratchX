'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertCircle } from 'lucide-react';
import MessageEditor from './MessageEditor';
import ImageUploader from './ImageUploader';
import { openWhatsApp } from '@/lib/utils/whatsapp';
import { buildShareMessage } from '@/lib/utils/buildShareMessage';
import { substituteTemplate } from '@/lib/utils/substituteTemplate';
import { useWhatsAppTemplatesQuery } from '@/hooks/queries/useWhatsAppTemplatesQuery';
import styles from './whatsapp.module.css';

/**
 * Shared "Share on WhatsApp" modal — used from both the distributor's
 * Businesses table (recipientType: 'business') and the merchant's
 * Customers page (recipientType: 'customer'). Sends via a plain wa.me
 * redirect (no WhatsApp Business API): the user still has to tap Send
 * themselves inside WhatsApp once it opens.
 */
export default function WhatsAppModal({
  isOpen,
  onClose,
  phoneNumber,
  countryCode = '+91',
  defaultMessage = '',
  defaultImage = null,
  recipientType,
  customerId = null,
  businessId = null,
  campaignId = null,
  placeholderValues = {},
}) {
  const [message, setMessage] = useState(defaultMessage);
  const [image, setImage] = useState(null); // { url, previewSrc } | null
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [defaultImageDone, setDefaultImageDone] = useState(false);
  const uploadingDefault = Boolean(defaultImage) && !defaultImageDone;

  // Only fetches once the modal is actually opened; cached afterward so
  // reopening never re-fetches unnecessarily.
  const { data: templates } = useWhatsAppTemplatesQuery({ enabled: isOpen });

  // A won gift's image (a data URL on the scratch card) can't go in a
  // wa.me link as-is, so on open it's uploaded through the same endpoint the
  // manual uploader uses, and the resulting public link is appended to the
  // message like any other attached image.
  useEffect(() => {
    if (!isOpen || !defaultImage) return undefined;
    let cancelled = false;
    fetch('/api/whatsapp/upload-image', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageData: defaultImage }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (!json.success) throw new Error(json.error || 'Upload failed');
        setImage({ url: json.url, previewSrc: defaultImage });
      })
      .catch((err) => {
        if (cancelled) return;
        setError(`Could not attach the gift image: ${err.message}`);
      })
      .finally(() => {
        if (!cancelled) setDefaultImageDone(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, defaultImage]);

  if (!isOpen) return null;

  const resetAndClose = () => {
    onClose();
    setMessage(defaultMessage);
    setImage(null);
    setError(null);
    setSelectedTemplateId('');
    setDefaultImageDone(false);
  };

  const handleTemplateSelect = (templateId) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;
    const template = (templates || []).find((t) => t._id === templateId);
    if (!template) return;
    setMessage(substituteTemplate(template.message, placeholderValues));
    // A template without its own image keeps whatever is attached (e.g. the won gift).
    if (template.imageUrl) setImage({ url: template.imageUrl, previewSrc: template.imageUrl });
  };

  const digitsOnly = (phoneNumber || '').replace(/\D/g, '');
  const fullPhone = phoneNumber ? `${countryCode}${digitsOnly}` : '';

  const handleSend = async () => {
    setError(null);

    if (!phoneNumber) {
      setError('No phone number on file for this contact.');
      return;
    }
    if (!message.trim()) {
      setError('Message cannot be empty.');
      return;
    }

    setSending(true);
    const finalMessage = buildShareMessage(message, image?.url);

    // Fire-and-forget analytics — a failure here must never block the
    // actual WhatsApp redirect.
    fetch('/api/whatsapp/share', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientType,
        customerId,
        businessId,
        campaignId,
        phone: fullPhone,
        message: finalMessage,
        imageUrl: image?.url || null,
      }),
    }).catch(() => {});

    openWhatsApp(fullPhone, finalMessage);
    setSending(false);
    resetAndClose();
  };

  // Rendered via a portal straight onto document.body — this modal is used
  // inside hoverable cards/rows (e.g. the Customers page's .customerCard,
  // which applies `transform` on hover). A `position: fixed` element nested
  // inside a transformed ancestor gets trapped inside that ancestor's box
  // instead of covering the viewport, so we escape the component tree
  // entirely instead of fighting z-index/positioning from inside it.
  return createPortal(
    <div className={styles.modalOverlay} onClick={resetAndClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Share on WhatsApp</h2>
          <button className={styles.modalClose} onClick={resetAndClose} aria-label="Close">
            <X size={22} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {error && (
            <div className={styles.errorBanner}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className={styles.formGroup}>
            <label className={styles.label}>Phone Number</label>
            <div className={styles.phoneDisplay}>
              {phoneNumber ? fullPhone : 'No phone number on file'}
            </div>
          </div>

          {templates && templates.length > 0 && (
            <div className={styles.formGroup}>
              <label className={styles.label}>Template</label>
              <select
                className={styles.templateSelect}
                value={selectedTemplateId}
                onChange={(e) => handleTemplateSelect(e.target.value)}
              >
                <option value="">Select Template</option>
                {templates.map((template) => (
                  <option key={template._id} value={template._id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <MessageEditor value={message} onChange={setMessage} />

         {image&& <div className={styles.formGroup}>
            <label className={styles.label}>Image</label>
            <ImageUploader value={image} onChange={setImage} onError={setError} />
          </div>}
        </div>

        <div className={styles.modalFooter}>
          <button type="button" className={styles.cancelButton} onClick={resetAndClose}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.sendButton}
            onClick={handleSend}
            disabled={sending || !phoneNumber || uploadingDefault}
          >
            Send 
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
