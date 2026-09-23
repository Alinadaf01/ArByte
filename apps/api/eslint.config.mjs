import nestConfig from "@arbyte/config/eslint/nest";

export default [
  ...nestConfig,
  {
    // T-210 §۰ — اسکریپت pretest که خارج از src/ اجرا می‌شود و به globalهای
    // Node (process, import.meta) نیاز دارد؛ پیکربندی مشترک فقط .ts می‌پوشاند.
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: { process: "readonly" },
    },
  },
];
