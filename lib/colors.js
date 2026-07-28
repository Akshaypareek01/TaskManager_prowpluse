/**
 * Helpers for rendering per-member identity colours (lib/team.js) safely on a
 * light background. The roster palette was authored for a dark theme, so raw
 * swatches are too bright to sit on white — these deepen them and pick a
 * readable foreground instead of hard-coding one.
 */

const INK = { r: 16, g: 24, b: 40 }; // #101828

/**
 * Parse #rgb / #rrggbb into channels.
 * @param {string} hex
 * @returns {{r: number, g: number, b: number}}
 */
function parseHex(hex) {
  let h = String(hex || "").replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6 || Number.isNaN(parseInt(h, 16))) return { r: 102, g: 112, b: 133 };
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

const toHex = (n) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, "0");

/**
 * Relative luminance per WCAG 2.1.
 * @param {string} hex
 * @returns {number} 0-1
 */
export function luminance(hex) {
  const { r, g, b } = parseHex(hex);
  const ch = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

/**
 * Mix a colour toward near-black by `amount` (0-1). Used to bring the bright
 * roster palette down to a weight that works on white.
 * @param {string} hex
 * @param {number} amount
 * @returns {string}
 */
export function deepen(hex, amount = 0.22) {
  const { r, g, b } = parseHex(hex);
  const a = Math.min(1, Math.max(0, amount));
  return `#${toHex(r + (INK.r - r) * a)}${toHex(g + (INK.g - g) * a)}${toHex(b + (INK.b - b) * a)}`;
}

/**
 * Same colour at a given alpha — for soft tinted fills.
 * @param {string} hex
 * @param {number} alpha
 * @returns {string}
 */
export function alpha(hex, a = 0.12) {
  const { r, g, b } = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * Pick white or ink text for a solid swatch, whichever contrasts more.
 * @param {string} hex
 * @returns {string}
 */
export function readableOn(hex) {
  const l = luminance(hex);
  const onWhite = 1.05 / (l + 0.05);
  const onInk = (l + 0.05) / (luminance("#101828") + 0.05);
  return onInk >= onWhite ? "#101828" : "#FFFFFF";
}

/**
 * Complete avatar styling for a member colour: a deepened solid fill plus a
 * foreground guaranteed to clear 4.5:1.
 * @param {string} hex
 * @returns {{ background: string, color: string }}
 */
export function avatarStyle(hex) {
  const base = deepen(hex, 0.18);
  return { background: base, color: readableOn(base) };
}
