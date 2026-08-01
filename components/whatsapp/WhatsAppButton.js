'use client';

import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import WhatsAppModal from './WhatsAppModal';
import styles from './whatsapp.module.css';

export default function WhatsAppButton({
  phoneNumber,
  countryCode = '+91',
  defaultMessage = '',
  recipientType,
  customerId = null,
  businessId = null,
  campaignId = null,
  placeholderValues = {},
  disabled = false,
  disabledReason = 'No phone number on file',
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const isDisabled = disabled || !phoneNumber;

  return (
    <>
      <button
        type="button"
        className={`${styles.whatsappBtn} ${className} ${isDisabled ? styles.whatsappBtnDisabled : ''}`}
        onClick={() => !isDisabled && setOpen(true)}
        disabled={isDisabled}
        title={isDisabled ? disabledReason : 'Share on WhatsApp'}
      >
        <MessageCircle size={16} />
      </button>
      <WhatsAppModal
        isOpen={open}
        onClose={() => setOpen(false)}
        phoneNumber={phoneNumber}
        countryCode={countryCode}
        defaultMessage={defaultMessage}
        recipientType={recipientType}
        customerId={customerId}
        businessId={businessId}
        campaignId={campaignId}
        placeholderValues={placeholderValues}
      />
    </>
  );
}
