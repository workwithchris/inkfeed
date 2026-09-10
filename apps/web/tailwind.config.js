/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Geist", "Inter", "Arial", "sans-serif"],
        mono: ["Geist Mono", "JetBrains Mono", "ui-monospace", "monospace"],
      },
      colors: {
        ink: "#171717",
        body: "#4d4d4d",
        mute: "#8f8f8f",
        faint: "#a1a1a1",
        hairline: "#ebebeb",
        "hairline-soft": "#f2f2f2",
        canvas: "#fafafa",
        elevated: "#ffffff",
        link: "#0070f3",
        "link-deep": "#0761d1",
        "link-soft": "#d3e5ff",
        error: "#ee0000",
        "error-deep": "#c50000",
        warning: "#f5a623",
        violet: "#7928ca",
        cyan: "#50e3c2",
        pink: "#ff0080",
        magenta: "#eb367f",
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
