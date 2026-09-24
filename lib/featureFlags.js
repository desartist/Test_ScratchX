/**
 * Build-time feature flags.
 *
 * These are plain constants (no imports, no env lookups) so they are safe to
 * import from anywhere — client components, server routes, and the Edge
 * middleware alike.
 */

/**
 * Sales Executive — hidden until the feature is finished.
 *
 * The backend is in place (the `Sales_Executive` role, /api/distributor/
 * sales-executives, per-executive lead scoping), but the UI is not ready to
 * ship, so every entry point to it is gated on this flag:
 *
 *   • the "Sales Executives" item in the Distributor's Growth Pipeline nav
 *   • the /sales-executives management page
 *   • the "Assigned To" filter and column on /leads
 *   • the assign-to-executive field in the New Lead modal
 *   • the assignee dropdown in the lead detail drawer
 *
 * It also controls WHO MAY CREATE A LEAD. While the feature was being built,
 * creation was deliberately restricted to Sales_Executive ("distributor can
 * see only currently"). With the feature hidden, that rule would leave nobody
 * able to add a lead at all — so while this is false, Distributors create
 * leads themselves. Both the UI check and the API guard read this flag, so
 * they cannot drift apart.
 *
 * Flipping this to true restores the entire feature; nothing was deleted.
 */
export const SALES_EXECUTIVE_ENABLED = false;

/**
 * Lucky Draw — hidden until the feature is finished.
 *
 * Every Lucky Draw entry point reads this flag: the Merchant "Lucky Draw" nav
 * item, the /lucky-draws pages, the public /lucky-draw/[campaignId] page and
 * all Lucky Draw API routes (which answer 404 while it is false).
 * Flipping it to true enables the whole feature; nothing is deleted.
 */
export const LUCKY_DRAW_ENABLED = false;
