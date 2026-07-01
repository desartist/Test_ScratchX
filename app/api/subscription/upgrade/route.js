/**
 * POST /api/subscription/upgrade
 *
 * Upgrade subscription to a higher plan
 * Calculates proration for remaining billing period
 */

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/connectDB';
import { getLoginToken } from '@/lib/auth';
import Subscription from '@/models/subscriptionModel';
import Invoice from '@/models/invoiceModel';
import Payment from '@/models/paymentModel';
import Razorpay from 'razorpay';

// Hardcoded plans
const HARDCODED_PLANS = {
  'Single Store': {
    id: 'single-store',
    name: 'Single Store',
    price: 2099,
    originalPrice: 2999,
  },
  'Multi-Store': {
    id: 'multi-store',
    name: 'Multi-Store',
    price: 2999,
    originalPrice: 4999,
  },
};

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export async function POST(request) {
  try {
    await connectDB();

    // Authenticate
    const authToken = await getLoginToken();
    if (!authToken || !authToken.accountId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const merchantId = authToken.accountId;

    // Parse request
    const body = await request.json();
    const { newPlanName } = body;

    if (!newPlanName) {
      return NextResponse.json(
        { success: false, error: 'newPlanName is required' },
        { status: 400 }
      );
    }

    // Get current subscription
    const subscription = await Subscription.findOne({
      merchantId,
      status: 'active',
    });

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: 'No active subscription found' },
        { status: 404 }
      );
    }

    // Get new plan
    const newPlan = HARDCODED_PLANS[newPlanName];
    if (!newPlan) {
      return NextResponse.json(
        { success: false, error: 'Plan not found' },
        { status: 404 }
      );
    }

    // Get current plan price
    const currentPlan = HARDCODED_PLANS[subscription.planName];
    if (!currentPlan) {
      return NextResponse.json(
        { success: false, error: 'Current plan not found' },
        { status: 404 }
      );
    }

    // Can't upgrade to same plan
    if (subscription.planName === newPlanName) {
      return NextResponse.json(
        { success: false, error: 'Already on this plan' },
        { status: 400 }
      );
    }

    // Calculate proration
    const now = new Date();
    const daysRemaining = Math.ceil(
      (subscription.currentPeriodEnd - now) / (1000 * 60 * 60 * 24)
    );
    const daysInPeriod = 30; // Assuming monthly for now

    const currentDailyRate = currentPlan.price / daysInPeriod;
    const newDailyRate = newPlan.price / daysInPeriod;

    // Calculate credit and charge
    const credit = currentDailyRate * daysRemaining;
    const newCharge = newDailyRate * daysRemaining;
    const proratedAmount = Math.max(0, newCharge - credit);

    // If no charge needed, just update subscription
    if (proratedAmount <= 0) {
      subscription.planName = newPlanName;
      await subscription.save();

      return NextResponse.json(
        {
          success: true,
          data: {
            message: 'Plan upgraded successfully',
            subscription,
            proration: {
              credit,
              charge: 0,
              total: 0,
            },
          },
        },
        { status: 200 }
      );
    }

    // Create payment order for proration amount
    const razorpayOrder = await razorpay.orders.create({
      amount: proratedAmount * 100, // Convert to paise
      currency: 'INR',
      receipt: `upgrade_${merchantId}_${Date.now()}`,
      notes: {
        upgradeFrom: subscription.planName,
        upgradeTo: newPlanName,
        merchantId: merchantId.toString(),
      },
    });

    // Save payment record
    const payment = new Payment({
      merchantId,
      planName: newPlanName,
      amount: proratedAmount,
      currency: 'INR',
      gatewayOrderId: razorpayOrder.id,
      status: 'created',
      paymentMethod: 'razorpay',
      metadata: {
        type: 'upgrade',
        fromPlan: subscription.planName,
        toPlan: newPlanName,
        proratedAmount,
        credit,
      },
    });

    await payment.save();

    return NextResponse.json(
      {
        success: true,
        data: {
          orderId: razorpayOrder.id,
          amount: proratedAmount * 100,
          currency: 'INR',
          paymentId: payment._id.toString(),
          razorpayKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          proration: {
            credit,
            charge: proratedAmount,
            total: proratedAmount,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error upgrading subscription:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error upgrading subscription',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
