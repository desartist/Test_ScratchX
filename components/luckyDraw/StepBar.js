import React from "react";
import { Check } from "lucide-react";
import styles from "@/app/(dashboard)/lucky-draws/luckyDraws.module.css";

/**
 * The create wizard's step bar, shared with the draw page (where it shows the draw's stage).
 * steps: [{ name, sub? }]; done: how many steps are finished; current: index of the active step, or -1.
 */
export default function StepBar({ steps, done = 0, current = -1, label = "Steps" }) {
  return (
    <ol className={styles.steps} aria-label={label}>
      {steps.map((step, i) => {
        const state = i < done ? styles.stepDone : i === current ? styles.stepNow : "";
        return (
          <li key={step.name} className={`${styles.step} ${state}`} aria-current={i === current ? "step" : undefined}>
            <span className={styles.stepDot}>{i < done ? <Check size={16} aria-hidden="true" /> : i + 1}</span>
            <span className={styles.stepName}>{step.name}</span>
            {step.sub && <span className={styles.stepSub}>{step.sub}</span>}
          </li>
        );
      })}
    </ol>
  );
}
