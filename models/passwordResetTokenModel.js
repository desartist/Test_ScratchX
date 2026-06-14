import mongoose from 'mongoose';

const passwordResetTokenSchema = new mongoose.Schema(
  {
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
    },
    ipAddress: String,
    userAgent: String,
    expiresAt: {
      type: Date,
      required: true,
    },
    usedAt: Date,
  },
  { timestamps: true }
);

// TTL index - automatically delete expired tokens after expiry
passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const PasswordResetTokenModel = mongoose.models.PasswordResetToken || mongoose.model('PasswordResetToken', passwordResetTokenSchema);

// Ensure TTL index is created on model initialization
if (!mongoose.models.PasswordResetToken) {
  // This runs on first model creation
  PasswordResetTokenModel.collection.createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 }
  ).catch(err => {
    // Index might already exist, which is fine
    if (err.code !== 85) { // 85 = IndexOptionsConflict
      console.error('Error creating TTL index:', err);
    }
  });
}

export default PasswordResetTokenModel;
