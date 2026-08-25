"use client";
import { useEffect, useState } from "react";

/**
 * Traps the browser/phone back button on a one-way customer step (scratch
 * reveal, coupon claim) so pressing back can't silently reload the earlier
 * scan/participation-form step with a blank form. On mount it pushes a
 * duplicate history entry; when the user presses back, the resulting
 * `popstate` is caught, the duplicate entry is pushed again (canceling the
 * actual navigation), and `blocked` flips to true so the caller can render
 * a "please scan the QR code again" screen instead.
 */
export function useBackNavigationGuard() {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
      setBlocked(true);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return blocked;
}
