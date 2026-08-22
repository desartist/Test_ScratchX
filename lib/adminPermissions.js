/**
 * Internal Admin team permissions — Module → Action matrix for the
 * `role: "Admin"` sub-roles (profile.adminRole). Super_Admin is always
 * unrestricted and never consults this matrix.
 *
 * This does NOT replace the existing per-role RBAC in lib/permissions.js
 * (that governs Super_Admin/Distributor/Merchant/... platform roles). This
 * is a second, narrower layer specifically for internal staff accounts
 * Super_Admin invites to help operate the platform.
 */
export const ADMIN_ROLES = ["Finance", "Support", "Sales", "Operations", "Analyst"];

// module -> action -> which adminRoles may perform it
const MATRIX = {
  Payments: {
    view: ["Finance", "Operations", "Analyst"],
    edit: ["Finance"],
    refund: ["Finance"],
  },
  Subscriptions: {
    view: ["Finance", "Sales", "Operations", "Analyst"],
    edit: ["Finance", "Sales"],
  },
  Retailers: {
    view: ["Sales", "Support", "Operations", "Analyst", "Finance"],
    edit: ["Sales", "Operations"],
    delete: [], // no Admin sub-role may delete/suspend a retailer — Super_Admin only
  },
  Distributors: {
    view: ["Sales", "Operations", "Analyst", "Finance"],
    edit: ["Operations"],
    delete: [],
  },
  Support: {
    view: ["Support", "Operations"],
    edit: ["Support", "Operations"],
  },
  Notifications: {
    view: ["Support", "Operations", "Sales"],
    edit: ["Operations"],
  },
  Reports: {
    view: ["Finance", "Sales", "Operations", "Analyst"],
  },
};

/**
 * @param {object} account - Account doc (role, profile.adminRole)
 * @param {string} module - key into MATRIX, e.g. "Payments"
 * @param {string} action - key into MATRIX[module], e.g. "refund"
 * @returns {boolean}
 */
export function hasAdminModulePermission(account, module, action) {
  if (account.role === "Super_Admin") return true;
  if (account.role !== "Admin") return false;
  const allowed = MATRIX[module]?.[action];
  if (!allowed) return false;
  return allowed.includes(account.profile?.adminRole);
}
