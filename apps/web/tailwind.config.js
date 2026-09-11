/** @type {import('tailwindcss').Config} */
const withVar = (name) => `rgb(var(--${name}) / <alpha-value>)`;

module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Geist", "Inter", "Arial", "sans-serif"],
        mono: ["Geist Mono", "JetBrains Mono", "ui-monospace", "monospace"],
      },
      colors: {
        ink: withVar("ink"),
        body: withVar("body"),
        mute: withVar("mute"),
        faint: withVar("faint"),
        hairline: withVar("hairline"),
        "hairline-soft": withVar("hairline-soft"),
        canvas: withVar("canvas"),
        elevated: withVar("elevated"),
        "on-ink": withVar("on-ink"),
        link: withVar("link"),
        "link-deep": withVar("link-deep"),
        "link-soft": withVar("link-soft"),
        error: withVar("error"),
        "error-deep": withVar("error-deep"),
        warning: withVar("warning"),
        violet: withVar("violet"),
        cyan: withVar("cyan"),
        pink: withVar("pink"),
        magenta: withVar("magenta"),
      },
      borderRadius: {
        none: "0px",
        sm: "6px",
        md: "12px",
        lg: "16px",
        category: "64px",
        pill: "100px",
        full: "9999px",
      },
      fontSize: {
        "display-xl": [
          "48px",
          { lineHeight: "48px", letterSpacing: "-2.4px", fontWeight: "600" },
        ],
        "heading-lg": [
          "32px",
          { lineHeight: "40px", letterSpacing: "-1.28px", fontWeight: "600" },
        ],
        "heading-md": [
          "20px",
          { lineHeight: "28px", letterSpacing: "-0.4px", fontWeight: "600" },
        ],
        "label-sm": [
          "14px",
          { lineHeight: "20px", letterSpacing: "-0.28px", fontWeight: "500" },
        ],
        eyebrow: ["12px", { lineHeight: "16px", fontWeight: "500" }],
        "body-lg": ["16px", { lineHeight: "24px" }],
        "body-md": ["14px", { lineHeight: "20px" }],
        "body-sm": ["12px", { lineHeight: "16px" }],
        "button-lg": ["16px", { lineHeight: "20px", fontWeight: "500" }],
        "button-md": ["14px", { lineHeight: "20px", fontWeight: "500" }],
      },
      boxShadow: {
        whisper: "0px 1px 1px rgba(0,0,0,0.04)",
        floating:
          "0px 2px 2px rgba(0,0,0,0.04), 0px 8px 16px -4px rgba(0,0,0,0.08)",
      },
      maxWidth: {
        container: "1200px",
      },
      spacing: {
        section: "128px",
      },
    },
  },
  plugins: [],
};
