"use client";
import React from "react";
import { Clock, UserRound } from "lucide-react";

// Composed "session timed out" icon (clock + person) for the customer-facing
// session-expired screens — lucide-react has no single matching icon, so
// this layers Clock behind UserRound with a background-colored cutout circle
// behind the person, matching the reference design.
export default function SessionExpiredIcon({ size = 56, color = "#010f44", cutout = "#fff" }) {
  const userWrapSize = Math.round(size * 0.52);
  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Clock size={size} color={color} strokeWidth={1.75} />
      <div
        style={{
          position: "absolute",
          left: -size * 0.1,
          bottom: -size * 0.06,
          width: userWrapSize,
          height: userWrapSize,
          borderRadius: "50%",
          background: cutout,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <UserRound size={Math.round(userWrapSize * 0.85)} color={color} fill={color} strokeWidth={0} />
      </div>
    </div>
  );
}
