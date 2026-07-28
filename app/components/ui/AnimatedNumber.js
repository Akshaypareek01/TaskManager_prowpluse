"use client";

import { useEffect, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";

/**
 * Counts from the previous value to the next one. Purely decorative — the
 * final value is always rendered, and with reduced motion it jumps straight
 * there, so screen readers and impatient users never see a wrong number.
 *
 * @param {{ value: number, duration?: number, className?: string, suffix?: string }} props
 */
export default function AnimatedNumber({ value, duration = 0.5, className = "", suffix = "" }) {
  const reduced = useReducedMotion();
  const target = Number.isFinite(value) ? value : 0;
  const [display, setDisplay] = useState(target);

  useEffect(() => {
    if (reduced) {
      setDisplay(target);
      return undefined;
    }
    const controls = animate(display, target, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
    // `display` intentionally excluded: it is the animation's own output.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, reduced, duration]);

  return (
    <span className={`tabular-nums ${className}`}>
      {Math.round(display)}
      {suffix}
    </span>
  );
}
