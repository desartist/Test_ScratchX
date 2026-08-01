import mongoose from 'mongoose';

const whatsappImageSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
    },
    imageData: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

// TTL index - automatically delete shared images after expiry
whatsappImageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const WhatsAppImageModel = mongoose.models.WhatsAppImage || mongoose.model('WhatsAppImage', whatsappImageSchema);

if (!mongoose.models.WhatsAppImage) {
  WhatsAppImageModel.collection.createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 }
  ).catch(err => {
    if (err.code !== 85) { // 85 = IndexOptionsConflict
      console.error('Error creating TTL index:', err);
    }
  });
}

export default WhatsAppImageModel;
