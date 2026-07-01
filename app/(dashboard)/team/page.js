"use client";

import React, { useState, useEffect } from "react";
import { useAuthContext } from "@/components/auth/AuthContext";
import { UserPlus, Edit2, Trash2, AlertCircle, X } from "lucide-react";
import styles from "./team.module.css";

export default function TeamPage() {
  const { account } = useAuthContext();
  const [teamMembers, setTeamMembers] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [formError, setFormError] = useState(null);
  const [editFormError, setEditFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);

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

  const canAddMore = true;

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCreateTeamMember = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name || !formData.email || !formData.phone || !formData.password) {
      setFormError("All fields are required");
      return;
    }

    if (formData.password.length < 6) {
      setFormError("Password must be at least 6 characters");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/team/members", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create team member");
      }

      setTeamMembers((prev) => [data.member, ...prev]);
      setShowModal(false);
      setFormData({ name: "", email: "", phone: "", password: "" });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (member) => {
    setEditingMember(member);
    setEditFormData({
      name: member.name,
      email: member.email,
      phone: member.phone,
    });
    setShowEditModal(true);
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUpdateTeamMember = async (e) => {
    e.preventDefault();
    setEditFormError(null);

    if (!editFormData.name || !editFormData.email || !editFormData.phone) {
      setEditFormError("All fields are required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/team/members", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: editingMember._id,
          ...editFormData,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update team member");
      }

      setTeamMembers((prev) =>
        prev.map((m) =>
          m._id === editingMember._id
            ? { ...m, ...editFormData }
            : m
        )
      );
      setShowEditModal(false);
      setEditingMember(null);
    } catch (err) {
      setEditFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (member) => {
    setMemberToDelete(member);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    const memberId = memberToDelete._id;
    setDeleting(memberId);
    setShowDeleteConfirm(false);

    try {
      const res = await fetch(`/api/team/members?memberId=${memberId}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete team member");
      }

      setTeamMembers((prev) => prev.filter((m) => m._id !== memberId));
      setMemberToDelete(null);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setDeleting(null);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setMemberToDelete(null);
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
            onClick={() => setShowModal(true)}
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
      </div>

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
                <button
                  className={styles.actionButton}
                  title="Edit"
                  onClick={() => handleEditClick(member)}
                >
                  <Edit2 size={16} />
                </button>
                <button
                  className={styles.actionButton}
                  title="Remove"
                  disabled={deleting === member._id}
                  onClick={() => handleDeleteClick(member)}
                >
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
            <button
              className={styles.emptyStateButton}
              onClick={() => setShowModal(true)}
            >
              <UserPlus size={16} />
              Add Your First Team Member
            </button>
          </div>
        </div>
      )}

      {/* Add Team Member Modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Add Team Member</h2>
              <button
                className={styles.modalClose}
                onClick={() => setShowModal(false)}
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateTeamMember} className={styles.modalForm}>
              {formError && (
                <div className={styles.formError}>
                  <AlertCircle size={16} />
                  {formError}
                </div>
              )}

              <div className={styles.formGroup}>
                <label htmlFor="name" className={styles.formLabel}>
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter full name"
                  className={styles.formInput}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="email" className={styles.formLabel}>
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter email address"
                  className={styles.formInput}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="phone" className={styles.formLabel}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Enter phone number"
                  className={styles.formInput}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="password" className={styles.formLabel}>
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter password (min 6 characters)"
                  className={styles.formInput}
                  required
                />
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={submitting}
                >
                  {submitting ? "Creating..." : "Create Team Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Team Member Modal */}
      {showEditModal && editingMember && (
        <div className={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Edit Team Member</h2>
              <button
                className={styles.modalClose}
                onClick={() => setShowEditModal(false)}
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleUpdateTeamMember} className={styles.modalForm}>
              {editFormError && (
                <div className={styles.formError}>
                  <AlertCircle size={16} />
                  {editFormError}
                </div>
              )}

              <div className={styles.formGroup}>
                <label htmlFor="edit-name" className={styles.formLabel}>
                  Full Name
                </label>
                <input
                  type="text"
                  id="edit-name"
                  name="name"
                  value={editFormData.name}
                  onChange={handleEditInputChange}
                  placeholder="Enter full name"
                  className={styles.formInput}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="edit-email" className={styles.formLabel}>
                  Email Address
                </label>
                <input
                  type="email"
                  id="edit-email"
                  name="email"
                  value={editFormData.email}
                  onChange={handleEditInputChange}
                  placeholder="Enter email address"
                  className={styles.formInput}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="edit-phone" className={styles.formLabel}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="edit-phone"
                  name="phone"
                  value={editFormData.phone}
                  onChange={handleEditInputChange}
                  placeholder="Enter phone number"
                  className={styles.formInput}
                  required
                />
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={submitting}
                >
                  {submitting ? "Updating..." : "Update Team Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && memberToDelete && (
        <div className={styles.modalOverlay} onClick={handleCancelDelete}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.confirmIcon}>
              <AlertCircle size={48} />
            </div>
            <h2 className={styles.confirmTitle}>Delete Team Member?</h2>
            <p className={styles.confirmMessage}>
              Are you sure you want to delete <strong>{memberToDelete.name}</strong>? This action cannot be undone.
            </p>
            <div className={styles.confirmFooter}>
              <button
                className={styles.confirmCancelBtn}
                onClick={handleCancelDelete}
              >
                Cancel
              </button>
              <button
                className={styles.confirmDeleteBtn}
                onClick={handleConfirmDelete}
                disabled={deleting === memberToDelete._id}
              >
                {deleting === memberToDelete._id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
