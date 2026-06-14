/**
 * CTA Click Tracker for Pre-Subscription Dashboard
 * Tracks which conversion CTAs users click on and sends to analytics endpoint
 */

class CTATracker {
  constructor() {
    this.sessionId = this.generateSessionId();
  }

  /**
   * Generate a unique session ID for tracking
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Track a CTA click event
   * @param {string} ctaName - Name of the CTA button (e.g., "hero_view_plans", "hero_upgrade_now", "plan_select")
   * @param {string} section - Section where the CTA is located (e.g., "hero", "plans", "benefits")
   * @param {object} metadata - Additional metadata (plan ID, billing cycle, etc.)
   */
  async trackCtaClick(ctaName, section, metadata = {}) {
    try {
      const payload = {
        ctaName,
        section,
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
        metadata,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      };

      // Send to analytics endpoint (fire and forget, don't block user interaction)
      fetch('/api/analytics/cta-click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }).catch(err => {
        // Silently fail - don't disrupt user experience
        console.debug('CTA tracking failed:', err);
      });

      // Also track locally for immediate insights
      this.logLocalEvent(payload);
    } catch (error) {
      console.debug('CTA tracker error:', error);
    }
  }

  /**
   * Log event to browser console (for development)
   */
  logLocalEvent(payload) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[CTA Track]', payload);
    }
  }

  /**
   * Track view of pre-subscription dashboard
   */
  async trackDashboardView() {
    try {
      await fetch('/api/analytics/dashboard-view', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.debug('Dashboard view tracking failed:', error);
    }
  }

  /**
   * Track plan selection (before purchase)
   */
  async trackPlanSelection(planId, planName, billingCycle) {
    try {
      await fetch('/api/analytics/plan-selection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          planName,
          billingCycle,
          sessionId: this.sessionId,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.debug('Plan selection tracking failed:', error);
    }
  }

  /**
   * Track successful subscription purchase
   */
  async trackSubscriptionPurchase(planId, planName, billingCycle, amount) {
    try {
      await fetch('/api/analytics/subscription-purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          planName,
          billingCycle,
          amount,
          sessionId: this.sessionId,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.debug('Purchase tracking failed:', error);
    }
  }
}

// Export singleton instance
export const ctaTracker = new CTATracker();
export default CTATracker;
