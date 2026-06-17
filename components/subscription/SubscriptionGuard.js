"use client";

import { useEffect, useState } from "react";
import SubscriptionRequired from "./SubscriptionRequired";

/**
 * Client-side guard for pages that need an active subscription.
 * Use this inside client components where the server layout check
 * can't be applied (e.g. dynamically rendered modals or tabs).
 *
 * For full-page protection prefer the server-layout check in
 * app/(dashboard)/layout.js — that prevents any page flash.
 */
export default function SubscriptionGuard({ children, fallback }) {
  const [status, setStatus] = useState("loading"); // "loading" | "active" | "inactive"

  useEffect(() => {
    fetch("/api/subscription/current")
      .then((r) => r.json())
      .then((data) => {
        setStatus(data.subscription ? "active" : "inactive");
      })
      .catch(() => setStatus("inactive"));
  }, []);

  if (status === "loading") {
    return fallback ?? null;
  }

  if (status === "inactive") {
    return <SubscriptionRequired />;
  }

  return children;
}
