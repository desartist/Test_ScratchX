import OTP from '@/models/otpModel';
import otpProvider from '@/lib/otpProvider';
import Redis from 'ioredis';

// Initialize Redis for rate limiting
let redis;
try {
  redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  redis.on('error', (err) => {
    console.warn('Redis connection error (rate limiting disabled):', err.message);
  });
} catch (err) {
  console.warn('Redis not available, rate limiting disabled');
  redis = null;
}

class OTPService {
  /**
   * Generate and send OTP
   * Rate limited to 1 per minute per phone
   */
  async generateOTP(phone, purpose, ipAddress = null, userAgent = null) {
    // Validate phone
    if (!phone || !/^\+?[1-9]\d{1,14}$/.test(phone)) {
      throw new Error('Invalid phone number format');
    }

    // Rate limiting - Redis-based
    if (redis) {
      const rateLimitKey = `otp:sent:${phone}`;
      const lastSentTime = await redis.get(rateLimitKey);

      if (lastSentTime) {
        const secondsRemaining = Math.ceil(60 - (Date.now() - parseInt(lastSentTime)) / 1000);
        throw new Error(
          `Rate limit exceeded. Please try again in ${secondsRemaining} seconds.`
        );
      }
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Create OTP record
    const otpDoc = await OTP.create({
      phone,
      code,
      purpose,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      ipAddress,
      userAgent,
    });

    // Send via provider
    try {
      await otpProvider.sendOTP(phone, code);
    } catch (err) {
      // Delete OTP if sending fails
      await otpDoc.deleteOne();
      throw new Error(`Failed to send OTP: ${err.message}`);
    }

    // Set rate limit (1 minute)
    if (redis) {
      await redis.setex(rateLimitKey, 60, Date.now().toString());
    }

    return {
      success: true,
      phone,
      purpose,
      expiresIn: 600, // 10 minutes
    };
  }

  /**
   * Verify OTP code
   * Max 3 attempts per OTP
   */
  async verifyOTP(phone, code) {
    // Find latest OTP for this phone
    const otpDoc = await OTP.findOne({ phone }).sort({ createdAt: -1 });

    if (!otpDoc) {
      throw new Error('No OTP found. Request a new code.');
    }

    // Check if expired
    if (otpDoc.expiresAt < new Date()) {
      throw new Error('OTP has expired. Request a new code.');
    }

    // Check if already verified
    if (otpDoc.isVerified) {
      throw new Error('OTP already used.');
    }

    // Check max attempts
    if (otpDoc.attempts >= otpDoc.maxAttempts) {
      throw new Error(
        'Maximum verification attempts exceeded. Request a new code.'
      );
    }

    // Verify code
    if (otpDoc.code !== code) {
      otpDoc.attempts += 1;
      await otpDoc.save();
      const remaining = otpDoc.maxAttempts - otpDoc.attempts;
      throw new Error(`Invalid OTP code. ${remaining} attempts remaining.`);
    }

    // Mark as verified
    otpDoc.isVerified = true;
    otpDoc.verifiedAt = new Date();
    await otpDoc.save();

    return otpDoc;
  }

  /**
   * Get OTP status (for debugging)
   */
  async getOTPStatus(phone) {
    const otpDoc = await OTP.findOne({ phone }).sort({ createdAt: -1 });

    if (!otpDoc) {
      return { status: 'none' };
    }

    return {
      status: otpDoc.isVerified ? 'verified' : otpDoc.isValid() ? 'pending' : 'expired',
      isVerified: otpDoc.isVerified,
      attempts: otpDoc.attempts,
      maxAttempts: otpDoc.maxAttempts,
      expiresIn: Math.ceil((otpDoc.expiresAt - new Date()) / 1000),
      purpose: otpDoc.purpose,
    };
  }

  /**
   * Cleanup expired OTPs manually
   */
  async cleanupExpiredOTPs() {
    try {
      const result = await OTP.deleteMany({
        expiresAt: { $lt: new Date() },
      });

      console.log(`✓ Cleaned up ${result.deletedCount} expired OTPs`);
      return result;
    } catch (err) {
      console.error('Error cleaning up OTPs:', err.message);
      throw err;
    }
  }
}

export default new OTPService();
