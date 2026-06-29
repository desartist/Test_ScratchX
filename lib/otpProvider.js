/**
 * OTP Provider Abstraction
 * Supports: Twilio, MSG91 (commented), AWS SNS, Console (for testing)
 *
 * Note: Twilio and AWS SDK are optional dependencies
 * Only use console provider for development
 */

class OTPProvider {
  constructor() {
    this.provider = process.env.OTP_PROVIDER || 'console';
    this.client = null;
    this.sns = null;

    if (this.provider === 'console' && process.env.NODE_ENV === 'development') {
      console.log('⚠️  Using console OTP provider (development only)');
    }

    if (this.provider === 'twilio') {
      console.log('✓ Using Twilio OTP provider');
    }
  }

  async sendOTP(phone, code) {
    const message = `Your ScratchX verification code is: ${code}. Valid for 10 minutes. Do not share this code.`;

    switch (this.provider) {
      case 'twilio':
        return this.sendTwilio(phone, message);
      /* case 'msg91':
        return this.sendMSG91(phone, code); */
      case 'aws-sns':
        return this.sendAWSSNS(phone, message);
      case 'console':
      default:
        // Default to console for all other cases
        console.log(`\n📱 OTP for ${phone}: ${code}\n`);
        return { success: true, messageId: 'console-' + Date.now() };
    }
  }

  async sendTwilio(phone, message) {
    try {
      // Lazy-load twilio only when needed
      const twilio = (await import('twilio')).default;
      const client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );

      const result = await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      });

      return { success: true, messageId: result.sid };
    } catch (err) {
      throw new Error(`Twilio error: ${err.message}`);
    }
  }

  /* async sendMSG91(phone, code) {
    try {
      const authkey = process.env.MSG91_AUTHKEY;
      const route = process.env.MSG91_ROUTE || '4';

      if (!authkey) {
        throw new Error('MSG91_AUTHKEY is not configured');
      }

      const message = `Your ScratchX verification code is: ${code}. Valid for 10 minutes. Do not share this code.`;

      const url = 'https://api.msg91.com/api/sendotp.php';
      const params = new URLSearchParams({
        authkey,
        mobile: phone,
        message,
        route,
      });

      const response = await fetch(`${url}?${params.toString()}`, {
        method: 'GET',
      });

      const text = await response.text();

      if (!response.ok) {
        throw new Error(`MSG91 error: ${text}`);
      }

      return {
        success: true,
        messageId: `msg91-${Date.now()}`,
        provider: 'MSG91',
      };
    } catch (err) {
      throw new Error(`MSG91 error: ${err.message}`);
    }
  } */

  async sendAWSSNS(phone, message) {
    try {
      // Lazy-load AWS SDK only when needed
      const AWS = (await import('aws-sdk')).default;
      const sns = new AWS.SNS({
        region: process.env.AWS_REGION || 'us-east-1',
      });

      const result = await sns
        .publish({
          Message: message,
          PhoneNumber: phone,
        })
        .promise();

      return { success: true, messageId: result.MessageId };
    } catch (err) {
      throw new Error(`AWS SNS error: ${err.message}`);
    }
  }
}

module.exports = new OTPProvider();
