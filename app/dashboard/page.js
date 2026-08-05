"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import LoadingState from "@/components/common/LoadingState";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    checkUserRoleAndRedirect();
  }, []);

  const checkUserRoleAndRedirect = async () => {
    try {
      const res = await fetch("/api/auth/me", {
        credentials: "include",
      });
      const data = await res.json();

      if (!data.success || !data.account) {
        throw new Error(data.error || "Failed to fetch user role");
      }

      const role = data.account.role;
      console.log("[Dashboard Router] User role:", role);
      setUserRole(role);

      // Route based on role (case-insensitive)
      const roleNormalized = role ? role.toLowerCase().trim() : "";
      console.log("[Dashboard Router] Normalized role:", roleNormalized);

      if (roleNormalized === "distributor") {
        console.log("[Dashboard Router] Redirecting to /distributor-overview");
        router.push("/distributor-overview");
      } else if (roleNormalized === "merchant") {
        console.log("[Dashboard Router] Redirecting to /merchant-overview");
        router.push("/merchant-overview");
      } else if (roleNormalized === "super_admin" || roleNormalized === "super admin" || roleNormalized === "admin" || roleNormalized === "superadmin") {
        console.log("[Dashboard Router] Redirecting to /admin-overview");
        router.push("/admin-overview");
      } else if (roleNormalized === "store_manager" || roleNormalized === "store_staff") {
        console.log("[Dashboard Router] Redirecting to /store-dashboard");
        router.push("/store-dashboard");
      } else {
        console.log("[Dashboard Router] Unknown role, defaulting to /merchant-overview");
        router.push("/merchant-overview");
      }
    } catch (err) {
      console.error("[Dashboard Router] Error:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading dashboard..." fullScreen />;
  }

  if (error) {
    return (
      <div style={loadingStyles.container}>
        <div style={loadingStyles.errorBox}>
          <AlertCircle size={48} style={loadingStyles.errorIcon} />
          <p>{error}</p>
          <button onClick={checkUserRoleAndRedirect} style={loadingStyles.retryBtn}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return null;
}

const loadingStyles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
  },
  errorBox: {
    background: "white",
    borderRadius: "16px",
    padding: "60px 24px",
    textAlign: "center",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.07)",
  },
  errorIcon: {
    color: "#ef4444",
    marginBottom: "16px",
  },
  retryBtn: {
    padding: "10px 20px",
    background: "#3b82f6",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "16px",
  },
};
