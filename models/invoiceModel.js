/**
 * Invoice Model
 * 
 * Stores invoice records for all subscription payments
 */

import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema(
  {
    // Basic Info
    invoiceNumber: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },

    // Payment & Subscription
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: false,
      default: null,
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
      required: true,
    },
    planName: {
      type: String,
      required: true,
    },

    // Amount Details
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    originalAmount: Number,
    discountAmount: {
      type: Number,
      default: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },

    // Billing Period
    billingPeriodStart: Date,
    billingPeriodEnd: Date,
    issuedDate: {
      type: Date,
      default: Date.now,
    },
    dueDate: Date,

    // Status
    status: {
      type: String,
      enum: ['draft', 'issued', 'paid', 'overdue', 'cancelled'],
      default: 'issued',
    },
    paidDate: Date,

    // Merchant Info
    merchantEmail: String,
    merchantName: String,
    merchantPhone: String,

    // Invoice Items
    items: [
      {
        description: String,
        quantity: Number,
        unitPrice: Number,
        amount: Number,
      },
    ],

    // Notes
    notes: String,
    internalNotes: String,

    // File Storage
    pdfUrl: String,
    pdfGenerated: Boolean,

    // Metadata
    metadata: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
    indexes: [
      { merchantId: 1, issuedDate: -1 },
      { invoiceNumber: 1 },
      { status: 1 },
    ],
  }
);

// Generate Invoice Number
invoiceSchema.pre('save', async function () {
  if (!this.invoiceNumber) {
    const count = await mongoose.model('Invoice').countDocuments();
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    this.invoiceNumber = `INV-${year}${month}-${String(count + 1).padStart(5, '0')}`;
  }
});

// Calculate total amount
invoiceSchema.pre('save', function () {
  this.totalAmount = this.amount + this.taxAmount - this.discountAmount;
});

export default mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);
