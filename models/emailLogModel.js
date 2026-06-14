/**
 * Email Log Model
 *
 * Tracks all sent and failed emails for audit trail
 */

import mongoose from 'mongoose';

const emailLogSchema = new mongoose.Schema(
  {
    // Email Details
    recipient: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    templateName: {
      type: String,
      required: true,
      enum: [
        'paymentConfirmation',
        'trialExpiring',
        'quotaWarning',
        'upgradeSuccess',
        'cancellationConfirm',
        'invoiceEmail',
      ],
      index: true,
    },
    subject: String,

    // Status
    status: {
      type: String,
      enum: ['sent', 'failed', 'bounced', 'complained'],
      default: 'sent',
      index: true,
    },

    // Message ID from email provider
    messageId: String,

    // Error details
    error: String,
    errorDetails: mongoose.Schema.Types.Mixed,

    // Metadata
    metadata: mongoose.Schema.Types.Mixed,

    // Tracking
    openedAt: Date,
    clickedAt: Date,
    bounceAt: Date,

    // Merchant reference
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      index: true,
    },

    // Relations
    paymentId: mongoose.Schema.Types.ObjectId,
    subscriptionId: mongoose.Schema.Types.ObjectId,
    invoiceId: mongoose.Schema.Types.ObjectId,
  },
  {
    timestamps: true,
    indexes: [
      { recipient: 1, templateName: 1, createdAt: -1 },
      { status: 1, createdAt: -1 },
      { merchantId: 1, templateName: 1 },
    ],
  }
);

export default mongoose.models.EmailLog || mongoose.model('EmailLog', emailLogSchema);
