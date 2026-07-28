import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

/*
 * The three.js particle canvas that used to mount here has been removed from
 * the render tree (app/components/ThreeBackground.js is still on disk). It was
 * built for the old dark theme, cost ~150KB of JS plus a per-frame render loop,
 * and reads as a demo rather than a tool people work in all day.
 */

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata = {
  title: "Impact Wall · PROWPLUS",
  description: "The team's daily task wall — today's work, alerts, history and analytics.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={plusJakarta.variable}>
      <body className="font-sans">
        {/* Keyboard users get past the header in one keystroke. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
