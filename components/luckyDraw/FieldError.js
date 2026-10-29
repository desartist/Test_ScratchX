import React from "react";
import { AlertCircle } from "lucide-react";
import styles from "@/app/(dashboard)/lucky-draws/luckyDraws.module.css";

/** Red message under a field, the same markup as the Scratch campaign form. */
export default function FieldError({ message, id }) {
  if (!message) return null;
  return (
    <p className={styles.fieldError} id={id} role="alert">
      <AlertCircle size={13} aria-hidden="true" />
      {message}
    </p>
  );
}
