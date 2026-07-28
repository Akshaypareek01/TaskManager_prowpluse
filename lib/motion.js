/**
 * Motion tokens for framer-motion. Mirrors the CSS tokens in app/globals.css.
 *
 * Rules:
 *  - 150ms for micro-interactions (hover, press, colour changes)
 *  - 200ms for element enter/exit
 *  - 250ms for panel/route level changes
 *  - One easing curve everywhere: EASE
 *  - Distances are small (4-8px). Nothing slides across the screen.
 *
 * Every component that animates calls framer-motion's `useReducedMotion()` and
 * passes the result to these helpers, which then collapse to opacity-only.
 */

export const EASE = [0.16, 1, 0.3, 1];

export const DUR = {
  fast: 0.15,
  base: 0.2,
  slow: 0.25,
};

export const tFast = { duration: DUR.fast, ease: EASE };
export const tBase = { duration: DUR.base, ease: EASE };
export const tSlow = { duration: DUR.slow, ease: EASE };

/** Spring reserved for the tab indicator and modal, where overshoot reads as responsiveness. */
export const spring = { type: "spring", stiffness: 420, damping: 34, mass: 0.7 };

/**
 * Fade + small rise. Used for cards, list rows and panels.
 * @param {boolean} reduced - result of useReducedMotion()
 * @param {number} y - travel distance in px
 */
export function rise(reduced, y = 8) {
  return {
    initial: { opacity: 0, y: reduced ? 0 : y },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: reduced ? 0 : -4 },
    transition: tBase,
  };
}

/**
 * Container that staggers its children in. Pair with `riseItem`.
 * @param {boolean} reduced
 * @param {number} stagger - seconds between children
 */
export function staggerParent(reduced, stagger = 0.035) {
  return {
    initial: "hidden",
    animate: "show",
    variants: {
      hidden: {},
      show: {
        transition: { staggerChildren: reduced ? 0 : stagger, delayChildren: 0.02 },
      },
    },
  };
}

/**
 * Child variant for `staggerParent`.
 * @param {boolean} reduced
 */
export function riseItem(reduced) {
  return {
    variants: {
      hidden: { opacity: 0, y: reduced ? 0 : 8 },
      show: { opacity: 1, y: 0, transition: tBase },
    },
  };
}

/**
 * Collapse/expand for inline disclosure regions (e.g. the complete-task form).
 * @param {boolean} reduced
 */
export function collapse(reduced) {
  if (reduced) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: tFast,
    };
  }
  return {
    initial: { height: 0, opacity: 0 },
    animate: { height: "auto", opacity: 1 },
    exit: { height: 0, opacity: 0 },
    transition: { height: tSlow, opacity: tFast },
  };
}

/** Hover/press feedback for cards and chips. */
export function pressable(reduced) {
  if (reduced) return {};
  return { whileHover: { y: -1 }, whileTap: { scale: 0.985 }, transition: tFast };
}
