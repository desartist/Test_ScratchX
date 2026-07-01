import crypto from 'crypto';

/**
 * Mock Payment Service
 * Simulates Razorpay responses for testing without actual payment
 * Enable with: PAYMENT_TEST_MODE=true
 */

class MockPaymentService {
  constructor() {
    this.isEnabled = process.env.PAYMENT_TEST_MODE === 'true';
    if (this.isEnabled) {
      console.log('✓ Mock Payment Service enabled (TEST MODE)');
    }
  }

  /**
   * Generate realistic mock Razorpay order ID
   * Format: order_XXXXXXXXXXXXXXXXXX (same as real Razorpay)
   */
  generateOrderId() {
    const timestamp = Date.now().toString();
    const random = crypto.randomBytes(8).toString('hex');
    return `order_${timestamp}${random}`;
  }

  /**
   * Generate realistic mock payment ID
   * Format: pay_XXXXXXXXXXXXXXXXXX (same as real Razorpay)
   */
  generatePaymentId() {
    const timestamp = Date.now().toString();
    const random = crypto.randomBytes(8).toString('hex');
    return `pay_${timestamp}${random}`;
  }

  /**
   * Generate valid HMAC signature
   * Matches: HMAC-SHA256(order_id|payment_id, key_secret)
   */
  generateSignature(orderId, paymentId, keySecret = process.env.RAZORPAY_KEY_SECRET) {
    return crypto
      .createHmac('sha256', keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
  }

  /**
   * Mock order creation (replaces razorpay.orders.create)
   * Returns structure matching Razorpay API
   */
  createMockOrder(options) {
    const orderId = this.generateOrderId();

    return {
      id: orderId,
      entity: 'order',
      amount: options.amount, // in paise
      amount_paid: 0,
      amount_due: options.amount,
      currency: options.currency || 'INR',
      receipt: options.receipt || `receipt_${Date.now()}`,
      status: 'created',
      attempts: 0,
      notes: options.notes || {},
      created_at: Math.floor(Date.now() / 1000),
      // Additional fields for realism
      short_url: `https://rzp.io/${Math.random().toString(36).substring(7)}`,
      view_less: true,
      expire_by: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    };
  }

  /**
   * Mock payment verification
   * Generates complete payment data with valid signature
   */
  createMockPaymentData(orderId) {
    const paymentId = this.generatePaymentId();
    const signature = this.generateSignature(orderId, paymentId);

    return {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
      // Additional metadata
      _mock: true,
      _timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create complete mock payment object for database
   * Matches Payment model schema
   */
  createMockPaymentRecord(merchantId, amount, planName = 'CORE') {
    return {
      merchantId,
      planName,
      amount,
      totalAmount: amount,
      currency: 'INR',
      paymentGateway: 'razorpay',
      paymentMethod: 'razorpay',
      status: 'created', // will be 'success' after verification
      description: `Mock payment for ${planName} plan`,
      metadata: {
        isMockPayment: true,
        createdAt: new Date().toISOString(),
        planType: planName,
      },
    };
  }

  /**
   * Create mock subscription record
   */
  createMockSubscription(merchantId, planType = 'CORE') {
    return {
      ownerId: merchantId,
      ownerType: 'merchant',
      merchantId,
      planType,
      status: 'active',
      billingCycle: 'one-time',
      purchaseDate: new Date(),
      isMockData: true,
    };
  }

  /**
   * Simulate successful payment verification
   * Returns same structure as actual Razorpay verification
   */
  simulatePaymentVerification(orderId, paymentId) {
    const signature = this.generateSignature(orderId, paymentId);

    return {
      orderId,
      paymentId,
      signature,
      verified: true,
      mockData: true,
    };
  }

  /**
   * Check if test mode is enabled
   */
  isTestModeEnabled() {
    return this.isEnabled;
  }
}

export default new MockPaymentService();
