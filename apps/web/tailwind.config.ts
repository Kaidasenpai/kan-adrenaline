import type { Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";

import baseConfig from "@kan/tailwind-config/web";

export default {
  darkMode: "class",
  content: [...baseConfig.content],
  plugins: [require("@tailwindcss/typography")],
  presets: [baseConfig],
  theme: {
    extend: {
      colors: {
        "light-50": "#F5F5F2",
        "light-100": "#F0F1EC",
        "light-200": "#EAEEE3",
        "light-300": "#E3E7DC",
        "light-400": "#DCE1D4",
        "light-500": "#D3DAC9",
        "light-600": "#C8D0BC",
        "light-700": "#ADB9A0",
        "light-800": "#66705C",
        "light-900": "#62685C",
        "light-950": "#4D5544",
        "light-1000": "#171A15",
        "dark-50": "#151713",
        "dark-100": "#20241F",
        "dark-200": "#282D26",
        "dark-300": "#30362C",
        "dark-400": "#373E33",
        "dark-500": "#414A3B",
        "dark-600": "#4C5744",
        "dark-700": "#5D6953",
        "dark-800": "#8E9A84",
        "dark-900": "#A8B19F",
        "dark-950": "#D2D8CB",
        "dark-1000": "#F4F4EF",
        brand: {
          lime: "#B4D234",
          hover: "#AAC731",
          muted: "#90A829",
          ink: "#171A12",
          accent: "#536312",
        },
      },
      fontFamily: {
        sans: ["var(--font-plus-jakarta-sans)", ...fontFamily.sans],
        mono: fontFamily.mono,
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.875rem", { lineHeight: "1.25rem" }],
      },
      boxShadow: {
        sm: "0 1px 2px rgba(23, 26, 21, 0.04)",
        panel: "0 2px 8px rgba(23, 26, 21, 0.025)",
        "3xl-light": "0 24px 72px rgba(23, 26, 21, 0.14)",
        "3xl-dark": "0 24px 72px rgba(0, 0, 0, 0.25)",
      },
      transitionTimingFunction: {
        interface: "cubic-bezier(0.23, 1, 0.32, 1)",
      },
    },
  },
} satisfies Config;
