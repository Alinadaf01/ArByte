"use strict";

const js = require("@eslint/js");
const globals = require("globals");
const tseslint = require("@typescript-eslint/eslint-plugin");
const tsParser = require("@typescript-eslint/parser");
const arbyteNoHardcoding = require("../eslint-rules");

/**
 * Base ESLint flat config shared by every app/package.
 * Brand Book 12.86 (No Hardcoding) is enforced here via the custom
 * no-hex-colors rule — it applies to component files (.tsx/.jsx) only,
 * since non-component code (e.g. tokens definitions) legitimately needs
 * to define the HEX values once.
 */
module.exports = [
  js.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        sourceType: "module",
      },
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      // این دو قانون پایه‌ی JS، AST تایپ‌اسکریپت (type-only import/annotation،
      // `as const`، و...) را نمی‌شناسند و false-positive می‌دهند — نسخه‌ی
      // TS-aware همین قوانین جایگزین‌شان است؛ خطای واقعی نبود متغیر را tsc می‌گیرد.
      "no-unused-vars": "off",
      "no-undef": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // قانون پایه‌ی JS الگوی رایج `export const X = {...}; export type X = ...`
      // (همان چیزی که خودِ Prisma برای enumهایش تولید می‌کند) را redeclare
      // اشتباه می‌گیرد، چون namespace جدای type/value تایپ‌اسکریپت را
      // نمی‌شناسد. نسخه‌ی TS-aware هم به‌صورت پیش‌فرض این الگو را رد می‌کند —
      // `ignoreDeclarationMerge` باید صریح فعال شود تا const+type هم‌نام را
      // بشناسد.
      "no-redeclare": "off",
      "@typescript-eslint/no-redeclare": ["error", { ignoreDeclarationMerge: true }],
    },
  },
  {
    files: ["**/*.{tsx,jsx}"],
    plugins: {
      "@arbyte/no-hardcoding": arbyteNoHardcoding,
    },
    rules: {
      "@arbyte/no-hardcoding/no-hex-colors": "error",
    },
  },
  {
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/node_modules/**",
      "**/coverage/**",
      "**/*.config.js",
      "**/next-env.d.ts",
    ],
  },
];
