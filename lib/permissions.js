/**
 * Role hierarchy (highest to lowest):
 *   Super_Admin > Distributor > Merchant > Manager > Store_Manager > Store_Staff
 *
 * Each role can only create/manage accounts one level below it.
 */

export const ROLES = {
  SUPER_ADMIN: "Super_Admin",
  DISTRIBUTOR: "Distributor",
  MERCHANT: "Merchant",
  MANAGER: "Manager",
  STORE_MANAGER: "Store_Manager",
  STORE_STAFF: "Store_Staff",
};

// '*' means all permissions
export const PERMISSIONS = {
  Super_Admin: ["*"],

  Distributor: [
    "merchant:create",
    "merchant:read",
    "merchant:update",
    "merchant:suspend",
    "subscription:assign",
    "subscription:view",
    "commission:read",
    "analytics:own_merchants",
    "subscription:upgrade",
    "subscription:purchase",
    "lead:create",
    "lead:read",
    "lead:update",
    "lead:assign",
    "sales_executive:manage",
  ],

  // Works under a Distributor, scoped to leads assigned to them — cannot
  // touch pricing, distributor earnings, payments, or distributor settings.
  Sales_Executive: [
    "lead:create",
    "lead:read_assigned",
    "lead:update_assigned",
    "lead:schedule_demo",
    "lead:follow_up",
  ],

  Merchant: [
    "campaign:create",
    "campaign:read",
    "campaign:update",
    "campaign:delete",
    "store:create",
    "store:read",
    "store:update",
    "store:delete",
    "range:create",
    "range:read",
    "range:update",
    "range:delete",
    "scan:read",
    "manager:create",
    "manager:read",
    "manager:update",
    "manager:delete",
    "subscription:read",
    "subscription:upgrade",
    "subscription:purchase",
    "analytics:own",
  ],

  Manager: [
    "campaign:read",
    "campaign:update",
    "range:read",
    "scan:read",
    "analytics:own",
  ],

  Store_Manager: [
    "campaign:read",
    "campaign:update",
    "store:read",
    "store:update",
    "range:read",
    "scan:read",
    "inventory:read",
    "inventory:allocate",
    "analytics:own_store",
  ],

  Store_Staff: [
    "campaign:read",
    "range:read",
    "scan:read",
    "scan:redeem",
    "analytics:read",
  ],
};

/**
 * Returns true if the given role has the requested permission.
 * Super_Admin always returns true.
 */
export function hasPermission(role, permission) {
  const rolePerms = PERMISSIONS[role];
  if (!rolePerms) return false;
  if (rolePerms.includes("*")) return true;
  return rolePerms.includes(permission);
}

/** Dashboard path for each role — used for post-login redirects */
// Where each role's dashboard actually lives. ROLE_HOME (below) deliberately
// points everything at the neutral /dashboard entry point; this is the map
// that entry point resolves to. Kept here — with no imports — so the Edge
// middleware can use it as well as the page component, rather than the
// mapping being hardcoded in two places that can drift apart.
export const ROLE_DASHBOARD = {
  Super_Admin: "/admin-overview",
  Admin: "/admin-overview",
  Distributor: "/distributor-overview",
  Sales_Executive: "/my-leads",
  Merchant: "/merchant-overview",
  Manager: "/merchant-overview",
  Store_Manager: "/store-dashboard",
  Store_Staff: "/store-dashboard",
};

// Case/format-tolerant lookup — the role can arrive from a cookie or an API
// payload, and older records use variants like "super admin" / "superadmin".
export function dashboardForRole(role) {
  if (!role) return null;
  const key = String(role).toLowerCase().replace(/[\s-]+/g, "_").trim();
  const byNormalised = {
    super_admin: "/admin-overview",
    superadmin: "/admin-overview",
    admin: "/admin-overview",
    distributor: "/distributor-overview",
    sales_executive: "/my-leads",
    merchant: "/merchant-overview",
    manager: "/merchant-overview",
    store_manager: "/store-dashboard",
    store_staff: "/store-dashboard",
  };
  return byNormalised[key] || null;
}

export const ROLE_HOME = {
  Super_Admin: "/dashboard",
  Distributor: "/dashboard",
  Sales_Executive: "/dashboard",
  Merchant: "/dashboard",
  Manager: "/dashboard",
  Store_Manager: "/dashboard",
  Store_Staff: "/dashboard",
};
