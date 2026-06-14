/**
 * A/B Testing Utility for Pre-Subscription Dashboard
 * Tests different hero messages and CTA copy to optimize conversion
 */

class ABTesting {
  constructor() {
    this.storageKey = 'scratchx_ab_test_variant';
    this.variants = {
      // Variant A: Exciting/Action-oriented message
      heroA: {
        title: 'Your Main Store Is Ready',
        description: 'You have successfully completed your store setup. Now let\'s activate a subscription to launch your first campaign.',
        ctaPrimary: 'View Plans',
        ctaSecondary: 'Upgrade Now',
      },
      // Variant B: Benefit-focused message
      heroB: {
        title: 'Start Running Campaigns Today',
        description: 'Your store is all set up! Activate a subscription now to unlock unlimited campaigns and engage your customers with scratch rewards.',
        ctaPrimary: 'See Plans & Pricing',
        ctaSecondary: 'Start Free Trial',
      },
    };
  }

  /**
   * Get the assigned variant for this user
   * Assigns randomly on first visit and stores in localStorage
   */
  getVariant(userId) {
    // Try to get stored variant
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        return stored;
      }

      // Assign new variant randomly
      const variant = Math.random() < 0.5 ? 'heroA' : 'heroB';
      localStorage.setItem(this.storageKey, variant);
      localStorage.setItem(`${this.storageKey}_assigned_at`, new Date().toISOString());

      // Track variant assignment
      this.trackVariantAssignment(userId, variant);

      return variant;
    }

    return 'heroA'; // Fallback
  }

  /**
   * Get the content for a specific variant
   */
  getVariantContent(variant) {
    return this.variants[variant] || this.variants.heroA;
  }

  /**
   * Track variant assignment
   */
  async trackVariantAssignment(userId, variant) {
    try {
      await fetch('/api/analytics/ab-test-assignment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          variant,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.debug('A/B test assignment tracking failed:', error);
    }
  }

  /**
   * Track conversion for a variant
   * Call this when user completes purchase with assigned variant
   */
  async trackVariantConversion(variant, planId, planName, billingCycle) {
    try {
      await fetch('/api/analytics/ab-test-conversion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          variant,
          planId,
          planName,
          billingCycle,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.debug('A/B test conversion tracking failed:', error);
    }
  }

  /**
   * Get analytics dashboard data for A/B test results
   * Returns conversion rates by variant
   */
  static async getTestResults() {
    try {
      const response = await fetch('/api/analytics/ab-test-results');
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.debug('Failed to fetch A/B test results:', error);
    }
    return null;
  }
}

// Export singleton instance
export const abTesting = new ABTesting();
export default ABTesting;
