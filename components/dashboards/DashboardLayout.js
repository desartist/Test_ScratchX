"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useAuthContext } from "@/components/auth/AuthContext";
import { useNotificationsQuery } from "@/hooks/queries/useNotificationsQuery";
import {
  getAccountDisplayName,
  getAccountInitials,
} from "@/lib/accountDisplay";
import PlanStatusCard from "@/components/sidebar/PlanStatusCard";
import PlatformNoticeModal from "@/components/policy/PlatformNoticeModal";
import {
  IconCart,
  IconChart,
  IconDashboard,
  IconLogout,
  IconReceipt,
  IconSettings,
  IconShield,
  IconStore,
  IconUsers,
  IconWallet,
} from "./shared/NavIcons";
import styles from "./DashboardLayout.module.css";

const NAV_ICONS = {
  dashboard: IconDashboard,
  users: IconUsers,
  analytics: IconChart,
  settings: IconSettings,
  merchants: IconStore,
  sales: IconChart,
  commission: IconWallet,
  staff: IconUsers,
  customers: IconUsers,
  operations: IconReceipt,
  transactions: IconReceipt,
  campaigns: IconReceipt,
  stores: IconStore,
  studio: IconDashboard,
  support: IconUsers,
  notice: IconShield,
  marketplace: IconCart,
};

function isNavItemActive(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isNavGroupDefaultExpanded(pathname, item) {
  return (
    isNavItemActive(pathname, item.href) ||
    (item.children || []).some((child) => isNavItemActive(pathname, child.href))
  );
}

function readMerchantHasStoreCookie() {
  if (typeof document === "undefined") return null; // SSR — unknown
  const match = document.cookie.match(/(?:^|;\s*)merchantHasStore=([^;]*)/);
  if (!match) return null; // cookie not set yet
  return match[1] === "1";
}

export default function DashboardLayout({ children, role }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Read cookie synchronously before first paint — no flash for cookie-bearing sessions.
  const [hasStore, setHasStore] = useState(() =>
    role !== "Merchant" ? true : readMerchantHasStoreCookie()
  );
  const pathname = usePathname();
  const { account, logout } = useAuthContext();
  const { data: notificationsData } = useNotificationsQuery();
  const unreadNotifications = notificationsData?.unread || 0;
  // Explicit expand/collapse overrides for nav items with sub-items — when a
  // href isn't in here, expansion falls back to whether the user is
  // currently on that item or one of its children (see isNavGroupExpanded).
  const [expandedNavGroups, setExpandedNavGroups] = useState({});

  // Only needed for old sessions where the cookie was never written (rare).
  useEffect(() => {
    if (hasStore !== null || role !== "Merchant" || !account?.id) return;
    fetch("/api/stores", {
      credentials: "include",
      headers: { "x-user-id": account.id, "x-user-role": "Merchant" },
    })
      .then((r) => r.json())
      .catch(() => ({}))
      .then((data) => {
        const stores = data?.data || data?.stores || [];
        setHasStore(Array.isArray(stores) && stores.length > 0);
      });
  }, [hasStore, role, account?.id]);

  // Cookie says no store OR API confirmed no store → bare page, no chrome.
  if (hasStore === false) return <><PlatformNoticeModal />{children}</>;
  // Still checking (null) → render nothing briefly to avoid wrong chrome flash.
  if (hasStore === null) return null;

  const getDashboardHref = () => {
    switch (role) {
      case "Merchant":
        return "/merchant-overview";
      case "Distributor":
        return "/distributor-overview";
      case "Super_Admin":
        return "/admin-overview";
      case "Store_Manager":
      case "Store_Staff":
        return "/store-dashboard";
      default:
        return "/dashboard";
    }
  };

  const getNavItems = () => {
    const baseItems = [
      { label: "Dashboard", href: getDashboardHref(), iconKey: "dashboard" },
    ];

    switch (role) {
      case "Super_Admin":
        return {
          primary: [
            ...baseItems,
            { label: "Distributors", href: "/distributors", iconKey: "users" },
            { label: "Retailers", href: "/retailers", iconKey: "merchants" },
            {
              label: "Scratch Economy",
              href: "/scratch-economy",
              iconKey: "commission",
            },
            {
              label: "Revenue Analytics",
              href: "/revenue",
              iconKey: "analytics",
            },
            {
              label: "Campaign Intelligence",
              href: "/campaign-intelligence",
              iconKey: "campaigns",
            },
            {
              label: "Creative Studio Governance",
              href: "/studio-governance",
              iconKey: "studio",
            },
            {
              label: "Support & Operations",
              href: "/support",
              iconKey: "operations",
            },
            {
              label: "Settings & Permissions",
              href: "/settings",
              iconKey: "settings",
            },
          ],
          secondary: [],
        };
      case "Distributor":
        return {
          primary: [
            ...baseItems,
            { label: "Buy Plans", href: "/marketplace", iconKey: "marketplace" },
            { label: "Retailers", href: "/retailers", iconKey: "merchants" },
            { label: "Seat Requests", href: "/seat-requests", iconKey: "commission" },
            // {
            //   label: "Scratch Allocation",
            //   href: "/scratch-allocation",
            //   iconKey: "commission",
            // },
            // {
            //   label: "Campaign Activity",
            //   href: "/campaigns",
            //   iconKey: "campaigns",
            // },
            // { label: "Analytics", href: "/analytics", iconKey: "analytics" },
            { label: "Support Center", href: "/support", iconKey: "support" },
          ],
          secondary: [
            {
              label: "Notifications",
              href: "/notifications",
              iconKey: "operations",
            },
            // {
            //   label: "Territory Reports",
            //   href: "/reports",
            //   iconKey: "analytics",
            // },
            {
              label: "Commission Summary",
              href: "/commissions",
              iconKey: "commission",
            },
            { label: "Settings", href: "/settings", iconKey: "settings" },
          ],
        };
      case "Merchant":
        return {
          primary: [
            ...baseItems,
            { label: "Campaigns", href: "/campaign", iconKey: "campaigns" },
            { label: "Customers", href: "/customers", iconKey: "customers" },
            { label: "Analytics", href: "/analytics", iconKey: "analytics" },
            { label: "Stores", href: "/stores", iconKey: "stores" },
            {
              label: "ScratchX Studio",
              href: "/studio",
              iconKey: "studio",
              children: [
                { label: "WhatsApp Templates", href: "/studio/whatsapp-templates" },
              ],
            },
          ],
          secondary: [
            {
              label: "Notifications",
              href: "/notifications",
              iconKey: "operations",
            },
            {
              label: "Subscription",
              href: "/subscription",
              iconKey: "commission",
            },
            // { label: "Billing", href: "/billing", iconKey: "transactions" },
            { label: "Team Access", href: "/team", iconKey: "users" },
            { label: "Help & Support", href: "/support", iconKey: "support" },
            { label: "Settings", href: "/settings", iconKey: "settings" },
          ],
        };
      case "Manager":
        return {
          primary: [
            ...baseItems,
            { label: "Campaigns", href: "/campaign", iconKey: "campaigns" },
            { label: "Customers", href: "/customers", iconKey: "customers" },
            {
              label: "Stores Analytics",
              href: "/store-analytics",
              iconKey: "analytics",
            },
            {
              label: "ScratchX Studio",
              href: "/studio",
              iconKey: "studio",
              children: [
                { label: "WhatsApp Templates", href: "/studio/whatsapp-templates" },
              ],
            },
            {
              label: "QR & Promotions",
              href: "/qr-promotions",
              iconKey: "campaigns",
            },
            { label: "Staff Management", href: "/staff", iconKey: "staff" },
            { label: "Support", href: "/support", iconKey: "support" },
          ],
          secondary: [
            {
              label: "Notifications",
              href: "/notifications",
              iconKey: "operations",
            },
            {
              label: "Redemption Logs",
              href: "/redemptions",
              iconKey: "transactions",
            },
            {
              label: "Store Settings",
              href: "/store-settings",
              iconKey: "settings",
            },
          ],
        };
      case "Store_Manager":
      case "Store_Staff":
        return {
          primary: [
            ...baseItems,
            { label: "Campaigns", href: "/store-campaigns", iconKey: "campaigns" },
            // { label: "Redemptions", href: "/redemptions", iconKey: "operations" },
            // { label: "Inventory", href: "/store-inventory", iconKey: "commission" },
            { label: "Analytics", href: "/store-analytics", iconKey: "analytics" },
          ],
          secondary: [
            {
              label: "Notifications",
              href: "/notifications",
              iconKey: "operations",
            },
            { label: "Settings", href: "/settings", iconKey: "settings" },
          ],
        };
      default:
        return { primary: baseItems, secondary: [] };
    }
  };

  const getRoleLabel = () => {
    const roleMap = {
      Super_Admin: "Super Admin",
      Distributor: "Admin",
      Merchant: "Merchant",
      Manager: "Manager",
      Store_Manager: "Store Manager",
      Store_Staff: "Store Staff",
    };
    return roleMap[role] || role;
  };

  const navItems = getNavItems();
  const displayName = account ? getAccountDisplayName(account) : "";
  const initials = account ? getAccountInitials(account) : "?";
  const canManageSubscription = role === "Merchant" || role === "Manager";


  return (
    <div className={styles.container}>
      <PlatformNoticeModal />
      {sidebarOpen && (
        <div
          className={styles.backdrop}
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.open : ""}`}>
        <div className={styles.sidebarHeader}>
          <Link href="/dashboard" className={styles.logo}>
            <img src="/horizontal_logo.webp" alt="ScratchX" className={styles.logoImg} />
          </Link>
          <button
            className={styles.mobileCloseBtn}
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Scrollable middle: profile + nav */}
        <div className={styles.sidebarScrollArea}>
          <div className={styles.sidebarProfile}>
            <div className={styles.sidebarProfileHeader}>
              <div className={styles.sidebarProfileAvatar}>
                {account?.profileImage ? (
                  <img src={account.profileImage} alt="Profile" className={styles.sidebarProfileAvatarImg} />
                ) : (
                  initials
                )}
              </div>
              <div className={styles.sidebarProfileInfo}>
                <span className={styles.sidebarProfileName}>
                  {displayName || account?.email}
                </span>
                <span className={styles.sidebarProfileMember}>
                  Member since {account?.createdAt
                    ? new Date(account.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.')
                    : '—'}
                </span>
              </div>
            </div>
            {canManageSubscription && (
              <PlanStatusCard onNavigate={() => setSidebarOpen(false)} />
            )}
          </div>

          <nav className={styles.nav} aria-label="Main navigation">
            {navItems.primary.map((item) => {
              const isActive = isNavItemActive(pathname, item.href);
              const Icon = NAV_ICONS[item.iconKey] || IconDashboard;
              const hasChildren = item.children && item.children.length > 0;
              const isExpanded = hasChildren
                ? expandedNavGroups[item.href] ?? isNavGroupDefaultExpanded(pathname, item)
                : false;

              return (
                <div key={item.href} className={styles.navGroup}>
                  <div className={styles.navItemRow}>
                    <Link
                      href={item.href}
                      className={`${styles.navItem} ${isActive ? styles.navItemActive : ""} ${hasChildren ? styles.navItemWithChildren : ""}`}
                      aria-current={isActive ? "page" : undefined}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <span className={styles.navIcon}><Icon /></span>
                      {item.label}
                    </Link>
                    {hasChildren && (
                      <button
                        type="button"
                        className={styles.navExpandBtn}
                        onClick={() =>
                          setExpandedNavGroups((prev) => ({ ...prev, [item.href]: !isExpanded }))
                        }
                        aria-label={isExpanded ? `Collapse ${item.label}` : `Expand ${item.label}`}
                        aria-expanded={isExpanded}
                      >
                        <ChevronDown
                          size={16}
                          style={{
                            transform: isExpanded ? "rotate(180deg)" : "none",
                            transition: "transform 0.2s ease",
                          }}
                        />
                      </button>
                    )}
                  </div>

                  {hasChildren && isExpanded && (
                    <div className={styles.navSubItems}>
                      {item.children.map((child) => {
                        const childActive = isNavItemActive(pathname, child.href);
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`${styles.navSubItem} ${childActive ? styles.navSubItemActive : ""}`}
                            aria-current={childActive ? "page" : undefined}
                            onClick={() => setSidebarOpen(false)}
                          >
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {navItems.secondary && navItems.secondary.length > 0 && (
              <>
                <div className={styles.navDivider}></div>
                {navItems.secondary.map((item) => {
                  const isActive = isNavItemActive(pathname, item.href);
                  const Icon = NAV_ICONS[item.iconKey] || IconDashboard;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`${styles.navItem} ${isActive ? styles.navItemActive : ""}`}
                      aria-current={isActive ? "page" : undefined}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <span className={styles.navIcon}><Icon /></span>
                      {item.label}
                    </Link>
                  );
                })}
              </>
            )}
          </nav>

          {/* Footer scrolls with nav */}
          <div className={styles.sidebarFooter}>
            <div className={styles.trustedFooter}>
              <div className={styles.trustedLogo}>
                <img src="/horizontal_logo.webp" alt="ScratchX" className={styles.trustedLogoImg} />
              </div>
              <div className={styles.trustedLabel}>TRUSTED BY</div>
              <div className={styles.trustedStats}>
                300+ Stores <span className={styles.trustedDivider}>|</span> 7+ Cities
              </div>
              <div className={styles.copyright}>
                © Copyright 2026 | Powered by Desartist
              </div>
              <Link
                href="/privacy-policy"
                className={styles.privacyPolicyLink}
                onClick={() => setSidebarOpen(false)}
              >
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
        {/* End scrollable middle */}
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <button
              className={styles.mobileMenuBtn}
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle menu"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div>
              <h1 className={styles.roleTitle}>{displayName || account?.email}</h1>
            </div>
            <div className={styles.userInfo}>
              {canManageSubscription && (
                <Link href="/campaign/new" className={styles.createCampaignBtn}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Create Campaign
                </Link>
              )}
              <Link href="/notifications" className={styles.notificationBtn} aria-label="Notifications">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                {unreadNotifications > 0 && (
                  <span className={styles.notificationBadge}>
                    {unreadNotifications > 99 ? "99+" : unreadNotifications}
                  </span>
                )}
              </Link>
              {/* <div className={styles.userMeta}>
                <span className={styles.userName}>
                  {displayName || account?.email}
                </span>
                <span className={styles.userEmail}>{account?.email}</span>
              </div>
              <div className={styles.avatar} aria-hidden>
                {account?.profileImage ? (
                  <img src={account.profileImage} alt="Profile" className={styles.avatarImg} />
                ) : (
                  initials
                )}
              </div> */}
            </div>
          </div>
        </header>

        <div className={styles.content}>{children}</div>
      </main>
    </div>
  );
}
