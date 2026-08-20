"use strict";

/**
 * Shared Tailwind v4 config base. Colors/spacing/radius/etc. are NOT
 * defined here — they are consumed from `packages/tokens` (CSS variables,
 * output of T-001). This file only wires up shared plugin/content behavior
 * so apps/web and apps/admin stay consistent.
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [],
  theme: {
    extend: {},
  },
  plugins: [],
};
