import mongoose from 'mongoose';

const OTPSchema = new mongoose.Schema(
  {
    // Phone number
    phone: {
      type: String,
      required: true,
      index: true,
    },

    // OTP code
    code: {
      type: String,
      required: true,
      length: 6,
    },

    // Verification
    isVerified: {
      type: Boolean,
      default: false,
    },
    verifiedAt: Date,

    // Attempt tracking
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 3,
    },

    // Expiry (typically 10 minutes)
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 10 * 60 * 1000),
      index: true,
    },

    // Context
    purpose: {
      type: String,
      enum: ['Signup', 'Login', 'Verification', 'PasswordReset'],
      required: true,
    },

    // Account reference (if user exists)
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      sparse: true,
    },

    // Metadata
    ipAddress: String,
    userAgent: String,
  },
  {
    timestamps: true,
  }
);

// TTL index - automatically delete expired OTPs after 10 minutes
OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Methods
OTPSchema.methods.isValid = function () {
  return !this.isVerified && this.attempts < this.maxAttempts && this.expiresAt > new Date();
};

OTPSchema.methods.verify = async function (code) {
  if (!this.isValid()) {
    throw new Error('OTP is no longer valid');
  }

  if (this.code !== code) {
    this.attempts += 1;
    await this.save();
    const remaining = this.maxAttempts - this.attempts;
    throw new Error(
      remaining > 0
        ? `Invalid OTP code. ${remaining} attempts remaining.`
        : 'Maximum verification attempts exceeded. Request a new code.'
    );
  }

  this.isVerified = true;
  this.verifiedAt = new Date();
  return this.save();
};

export default mongoose.models.OTP || mongoose.model('OTP', OTPSchema);
