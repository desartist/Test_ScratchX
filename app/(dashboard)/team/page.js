"use client";

import React, { useState, useEffect } from "react";
import { useAuthContext } from "@/components/auth/AuthContext";
import { UserPlus, Edit2, Trash2, AlertCircle } from "lucide-react";
import styles from "./team.module.css";

export default function TeamPage() {
  const { account } = useAuthContext();
  const [teamMembers, setTeamMembers] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch subscription details
        const subResponse = await fetch("/api/subscription/current", {
          credentials: "include",
        });

        if (subResponse.ok) {
          const subData = await subResponse.json();
          setSubscription(subData.subscription);
        }

        // Fetch team members
        const teamResponse = await fetch("/api/team/members", {
          credentials: "include",
        });

        if (teamResponse.ok) {
          const teamData = await teamResponse.json();
          setTeamMembers(teamData.members || []);
        } else if (teamResponse.status !== 404) {
          setError("Failed to load team members");
        }

        setError(null);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Error loading team data");
      } finally {
        setLoading(false);
      }
    };

    if (account?.id) {
      fetchData();
    }
  }, [account?.id]);

  const maxManagers = subscription?.planId?.limits?.maxManagersPerAccount || 0;
  const hasTeamFeature = subscription?.planId?.limits?.maxManagersPerAccount !== undefined && subscription?.planId?.limits?.maxManagersPerAccount > 0;
  const canAddMore = hasTeamFeature && teamMembers.length < maxManagers;

  const formatDate = (date) => {
    if (!date) return "Never";
    const d = new Date(date);
    const now = new Date();
    const diffMs = now - d;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return d.toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getInitials = (name) => {
    return name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "?";
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
          <p>Loading team members...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.pageTitle}>Team Access</h1>
          <p className={styles.pageSubtitle}>
            Manage your team members and their access
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.inviteButton}
            disabled={!canAddMore || !hasTeamFeature}
            title={
              !hasTeamFeature
                ? "Team management not available in your plan"
                : !canAddMore
                ? `You can only add ${maxManagers} team member${maxManagers === 1 ? "" : "s"} with your current plan`
                : ""
            }
          >
            <UserPlus size={18} />
            Add Team Member
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{teamMembers.length}</div>
          <div className={styles.statLabel}>Active Members</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{maxManagers}</div>
          <div className={styles.statLabel}>Member Limit</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{maxManagers - teamMembers.length}</div>
          <div className={styles.statLabel}>Available Slots</div>
        </div>
      </div>

      {/* Plan Info */}
      {!hasTeamFeature && (
        <div className={styles.planLimitCard}>
          <div className={styles.planLimitIcon}>
            <AlertCircle size={24} />
          </div>
          <div className={styles.planLimitContent}>
            <h3 className={styles.planLimitTitle}>Team Management Not Included</h3>
            <p className={styles.planLimitDescription}>
              Your current plan doesn't include team member management. Upgrade your plan to invite team members and collaborate more effectively.
            </p>
            <a href="/subscription" className={styles.upgradeLink}>
              View Upgrade Options →
            </a>
          </div>
        </div>
      )}

      {/* Team Members Table */}
      {teamMembers.length > 0 ? (
        <div className={styles.tableSection}>
          <div className={styles.tableHeader}>
            <div>Name</div>
            <div>Role</div>
            <div>Status</div>
            <div>Last Login</div>
            <div></div>
          </div>

          {teamMembers.map((member) => (
            <div key={member._id} className={styles.tableRow}>
              <div className={styles.memberInfo}>
                <div className={styles.memberAvatar}>
                  {getInitials(member.name)}
                </div>
                <div className={styles.memberDetails}>
                  <div className={styles.memberName}>{member.name}</div>
                  <div className={styles.memberEmail}>{member.email}</div>
                </div>
              </div>

              <div className={styles.roleCell}>
                <span className={styles.roleBadge}>{member.role}</span>
              </div>

              <div className={styles.statusCell}>
                <span
                  className={`${styles.statusBadge} ${styles[member.status]}`}
                >
                  {member.status === "active" ? "✓" : ""}
                  {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                </span>
              </div>

              <div className={styles.lastLoginCell}>
                {formatDate(member.lastLoginAt)}
              </div>

              <div className={styles.actionsCell}>
                <button className={styles.actionButton} title="Edit">
                  <Edit2 size={16} />
                </button>
                <button className={styles.actionButton} title="Remove">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.tableSection}>
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>👥</div>
            <h3 className={styles.emptyStateTitle}>No Team Members Yet</h3>
            <p className={styles.emptyStateDescription}>
              Invite team members to collaborate on campaigns and manage your stores
            </p>
            {canAddMore && (
              <button
                className={styles.emptyStateButton}
              >
                <UserPlus size={16} />
                Add Your First Team Member
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
