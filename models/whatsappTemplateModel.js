import mongoose from 'mongoose';

const whatsappTemplateSchema = new mongoose.Schema(
  {
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Template name is required'],
      trim: true,
      maxlength: [60, 'Template name cannot exceed 60 characters'],
    },
    // Supports {{customerName}}, {{reward}}, {{businessName}}, {{ownerName}}
    // placeholders — substituted at send time based on the recipient context.
    message: {
      type: String,
      required: [true, 'Template message is required'],
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },
    imageUrl: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

whatsappTemplateSchema.index({ accountId: 1, createdAt: -1 });

export default mongoose.models.WhatsAppTemplate || mongoose.model('WhatsAppTemplate', whatsappTemplateSchema);
