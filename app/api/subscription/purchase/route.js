import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/connectDB';
import { requireAuth } from '@/lib/auth';
import SubscriptionPlan from '@/models/subscriptionPlanModel';
import subscriptionActivationService from '@/lib/services/subscriptionActivationService';

/**
 * POST /api/subscription/purchase
 *
 * Direct subscription purchase endpoint (bypasses Razorpay)
 * Activates plan immediately and creates billing history
 *
 * Request body:
 * {
 *   planId: string,
 *   billingCycle: 'monthly' | 'annual' (default: 'monthly')
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   subscription: Subscription object,
 *   invoice: Invoice object,
 *   message: string,
 *   error?: string
 * }
 */
export async function POST(request) {
  try {
    await connectDB();

    // Step 1: Authenticate
    const { account, error } = await requireAuth();
    if (error) return error;
    const userId = account._id;

    // Step 2: Parse request body
    let planId, billingCycle;
    try {
      const body = await request.json();
      planId = body.planId;
      billingCycle = body.billingCycle || 'monthly';

      if (!planId) {
        return NextResponse.json(
          { success: false, error: 'planId is required' },
          { status: 400 }
        );
      }

      if (!['monthly', 'annual'].includes(billingCycle)) {
        return NextResponse.json(
          { success: false, error: 'billingCycle must be "monthly" or "annual"' },
          { status: 400 }
        );
      }
    } catch (parseError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Step 3: Validate plan exists
    const plan = await SubscriptionPlan.findById(planId);
    if (!plan || !plan.isActive) {
      return NextResponse.json(
        { success: false, error: 'Plan not found or inactive' },
        { status: 404 }
      );
    }


    // Step 4: Detect user type from account role
    const userType = ['Distributor'].includes(account.role) ? 'distributor' : 'merchant';

    // Step 5: Call activation service
    const result = await subscriptionActivationService.activateSubscription(
      userId,
      planId,
      userType, // Now properly detected from account.role
      billingCycle,
      { paymentMethod: 'direct' } // Indicates direct activation, not Razorpay
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    // Step 6: Return success
    return NextResponse.json(
      {
        success: true,
        subscription: result.subscription,
        invoice: result.invoice,
        message: result.message,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/subscription/purchase] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to purchase subscription',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
