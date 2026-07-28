/** @type {import('tailwindcss').Config} */

/*
 * IMPACT WALL DESIGN SYSTEM — light, professional, B2B/internal tooling.
 *
 * Rules of the system:
 *  - One accent (brand indigo). Colour means something; it never decorates.
 *  - Neutrals carry the layout; borders are 1px and low-contrast; elevation is soft.
 *  - Semantic colours (success/warning/danger) only ever appear as status.
 *  - Motion is 150-250ms on a single easing curve. Nothing bounces for fun.
 */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-plus-jakarta)", "ui-sans-serif", "system-ui", "sans-serif"],
      },

      colors: {
        /* Accent — the only decorative hue in the product. */
        brand: {
          50: "#EEF2FF",
          100: "#E0E7FF",
          200: "#C7D2FE",
          300: "#A5B4FC",
          400: "#818CF8",
          500: "#6366F1",
          600: "#4F46E5", // primary action — 7.0:1 with white text
          700: "#4338CA",
          800: "#3730A3",
          900: "#312E81",
        },

        /* Text ramp. `ink` = primary, descending to `ink-400` = disabled. */
        ink: {
          DEFAULT: "#101828", // 16.9:1 on white
          700: "#344054", // 10.4:1 — body
          600: "#475467", //  7.6:1 — secondary
          500: "#667085", //  4.9:1 — tertiary, still AA
          400: "#98A2B3", //  2.8:1 — decorative / disabled only
        },

        /* Surfaces & hairlines. */
        canvas: "#F6F7F9", // page background
        surface: {
          DEFAULT: "#FFFFFF",
          sunken: "#F2F4F7", // wells, segmented-control track, skeletons
          hover: "#F9FAFB",
        },
        line: {
          DEFAULT: "#E4E7EC", // standard hairline
          strong: "#D0D5DD", // input borders, dividers that must read
          soft: "#F0F1F4",
        },

        /* Semantic status — each has bg / border / fg / solid. */
        success: {
          bg: "#ECFDF3",
          border: "#A9EFC5",
          fg: "#067647", // 5.3:1 on its own bg
          solid: "#12B76A",
        },
        warning: {
          bg: "#FFFAEB",
          border: "#FEDF89",
          fg: "#B54708", // 5.9:1 on its own bg
          solid: "#F79009",
        },
        danger: {
          bg: "#FEF3F2",
          border: "#FECDCA",
          fg: "#B42318", // 6.4:1 on its own bg
          solid: "#F04438",
        },
        info: {
          bg: "#EEF2FF",
          border: "#C7D2FE",
          fg: "#3730A3",
          solid: "#4F46E5",
        },
      },

      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.01em" }],
        "display-xs": ["1.5rem", { lineHeight: "2rem", letterSpacing: "-0.02em" }],
        "display-sm": ["1.875rem", { lineHeight: "2.375rem", letterSpacing: "-0.022em" }],
        "display-md": ["2.25rem", { lineHeight: "2.75rem", letterSpacing: "-0.025em" }],
      },

      spacing: {
        4.5: "1.125rem",
        18: "4.5rem",
        22: "5.5rem",
      },

      borderRadius: {
        md: "0.5rem", //  8 — inputs, small controls
        lg: "0.625rem", // 10 — buttons
        xl: "0.75rem", // 12 — cards
        "2xl": "1rem", // 16 — panels, modal
        "3xl": "1.25rem", // 20 — hero surfaces
      },

      boxShadow: {
        xs: "0 1px 2px rgba(16,24,40,0.05)",
        sm: "0 1px 3px rgba(16,24,40,0.08), 0 1px 2px rgba(16,24,40,0.04)",
        md: "0 4px 8px -2px rgba(16,24,40,0.08), 0 2px 4px -2px rgba(16,24,40,0.04)",
        lg: "0 12px 16px -4px rgba(16,24,40,0.08), 0 4px 6px -2px rgba(16,24,40,0.03)",
        xl: "0 20px 24px -4px rgba(16,24,40,0.10), 0 8px 8px -4px rgba(16,24,40,0.04)",
        "2xl": "0 24px 48px -12px rgba(16,24,40,0.18)",
        focus: "0 0 0 4px rgba(79,70,229,0.16)",
        "focus-danger": "0 0 0 4px rgba(240,68,56,0.16)",
        none: "none",
      },

      transitionTimingFunction: {
        /* One curve for the whole product. */
        smooth: "cubic-bezier(0.16, 1, 0.3, 1)",
      },

      transitionDuration: {
        fast: "150ms",
        base: "200ms",
        slow: "250ms",
      },

      maxWidth: {
        shell: "82rem", // 1312px app shell
      },

      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: { "100%": { transform: "translateX(100%)" } },
        "pulse-soft": { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.55" } },
      },

      animation: {
        "fade-in": "fade-in 200ms cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-up": "slide-up 250ms cubic-bezier(0.16, 1, 0.3, 1)",
        shimmer: "shimmer 1.6s infinite",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
