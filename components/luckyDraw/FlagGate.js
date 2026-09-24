"use client";

import { notFound } from "next/navigation";
import { LUCKY_DRAW_ENABLED } from "@/lib/featureFlags";

// Every Lucky Draw page renders through this, so the routes 404 while the feature is hidden.
export default function FlagGate({ children }) {
  if (!LUCKY_DRAW_ENABLED) notFound();
  return children;
}
