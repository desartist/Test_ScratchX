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
export const ROLE_HOME = {
  Super_Admin: "/dashboard",
  Distributor: "/dashboard",
  Merchant: "/dashboard",
  Manager: "/dashboard",
  Store_Manager: "/dashboard",
  Store_Staff: "/dashboard",
};
