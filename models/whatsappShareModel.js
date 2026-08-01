import mongoose from 'mongoose';

const whatsappShareSchema = new mongoose.Schema(
  {
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },
    recipientType: {
      type: String,
      enum: ['customer', 'business'],
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CustomerParticipation',
      default: null,
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      default: null,
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      default: null,
    },
    phone: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
      default: null,
    },
    channel: {
      type: String,
      enum: ['whatsapp'],
      default: 'whatsapp',
    },
  },
  { timestamps: true }
);

whatsappShareSchema.index({ accountId: 1, createdAt: -1 });
whatsappShareSchema.index({ campaignId: 1, createdAt: -1 });

export default mongoose.models.WhatsAppShare || mongoose.model('WhatsAppShare', whatsappShareSchema);
