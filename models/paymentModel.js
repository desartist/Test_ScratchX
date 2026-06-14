import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      default: null,
    },
    // Which distributor sold the subscription (for commission calculation)
    distributorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
    },

    amount: { type: Number, required: true },
    tax: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    currency: { type: String, default: "INR" },

    paymentGateway: {
      type: String,
      enum: ["razorpay", "stripe", "direct"],
      default: null,
      required: false,
    },

    // Razorpay: order_id | Stripe: payment_intent id
    gatewayOrderId: { type: String, default: null },
    // Razorpay: razorpay_payment_id (filled on success)
    gatewayPaymentId: { type: String, default: null },
    // Razorpay HMAC-SHA256 signature for verification
    gatewaySignature: { type: String, default: null },

    status: {
      type: String,
      enum: ["created", "pending", "success", "failed", "refunded"],
      default: "created",
    },

    description: { type: String, default: "" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },

    // Generic ownership for merchant/distributor support
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
    },
    ownerType: {
      type: String,
      enum: ['merchant', 'distributor'],
      default: null,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
    },

    // Subscription tracking
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubscriptionPlan",
      default: null,
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      default: null,
    },
    transactionId: {
      type: String,
      unique: true,
      sparse: true,
      default: null,
    },
    paymentMethod: {
      type: String,
      enum: ['razorpay', 'direct', 'manual'],
      default: null,
    },
  },
  { timestamps: true },
);

export default mongoose.models.Payment ||
  mongoose.model("Payment", paymentSchema);
