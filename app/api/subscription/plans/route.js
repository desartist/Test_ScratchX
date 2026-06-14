/**
 * GET /api/subscription/plans
 *
 * Fetch approved subscription plans: CORE and SMART only
 * ✅ NO AUTHENTICATION REQUIRED - Public endpoint for plan browsing
 * ✅ PREMIUM PLAN REMOVED - Only CORE (₹2,099) and SMART (₹2,999) available
 */

import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    // Approved plan definitions (90-day duration)
    // These are hardcoded per approved business rules - NO database lookup
    const approvedPlans = [
      {
        _id: 'plan_core',
        name: 'Core',
        planType: 'CORE',
        displayName: 'ScratchX Core',
        description: 'Perfect for single store operations',
        tier: 1,
        recommended: false,
        duration: 90, // days
        price: {
          base: 2099, // Base price
          withGST: Math.ceil(2099 * 1.18) // ₹2,477 with 18% GST
        },
        features: {
          // Included
          unlimitedCampaigns: true,
          unlimitedScratches: true,
          rewardManagement: true,
          scratchXStudioTemplates: true,
          customerDatabase: true,
          teamMembers: 3,
          basicAnalytics: true,
          basicCustomerInsights: true,
          exportReports: true,
          basicAutomation: true,
          customBranding: true,
          prioritySupport: true,
          // Not included
          multiStore: false,
          smartSegmentation: false,
          whatsappIntegration: false,
          fraudProtection: false,
          apiAccess: false,
          canvaProStudio: false,
          advancedAnalytics: false,
        },
        limits: {
          maxStores: 1, // Single store only
          additionalStores: 0,
          additionalStorePrice: 0,
        },
        isPublic: true,
      },
      {
        _id: 'plan_smart',
        name: 'Smart',
        planType: 'SMART',
        displayName: 'ScratchX Smart',
        description: 'Ideal for growing businesses with multiple stores',
        tier: 2,
        recommended: true,
        duration: 90, // days
        price: {
          base: 2999,
          withGST: Math.ceil(2999 * 1.18), // ₹3,539 with 18% GST
          extraStore: 199, // Per additional store beyond 5
          extraStoreWithGST: Math.ceil(199 * 1.18), // ₹235 with 18% GST
        },
        features: {
          // Core features + Smart features
          unlimitedCampaigns: true,
          unlimitedScratches: true,
          rewardManagement: true,
          scratchXStudioTemplates: true,
          customerDatabase: true,
          teamMembersPerStore: 3,
          basicAnalytics: true,
          basicCustomerInsights: true,
          exportReports: true,
          basicAutomation: true,
          customBranding: true,
          prioritySupport: true,
          // Smart-exclusive
          multiStore: true,
          smartSegmentation: true,
          whatsappIntegration: true,
          fraudProtection: true,
          advancedAnalytics: true,
          advancedCustomerInsights: true,
          canvaProStudio: true,
          advancedAutomation: true,
          // Not included
          apiAccess: false,
        },
        limits: {
          maxStores: 5, // 1 Main + 4 Additional
          mainStores: 1,
          additionalStores: 4,
          additionalStorePrice: 199, // Per extra store beyond 5
          additionalStoreWithGST: Math.ceil(199 * 1.18),
        },
        isPublic: true,
      },
    ];

    // Return approved plans
    const response = {
      success: true,
      data: approvedPlans,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('[Plans API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch subscription plans',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
