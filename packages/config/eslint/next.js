"use strict";

const { FlatCompat } = require("@eslint/eslintrc");
const base = require("./index");

const compat = new FlatCompat({ baseDirectory: __dirname });

// next/core-web-vitals قبل از base می‌آید چون خودش یک parser (babel) ست می‌کند
// که types را strip می‌کند؛ base بعد از آن می‌آید تا @typescript-eslint/parser
// را دوباره فعال کند — وگرنه @typescript-eslint/no-unused-vars روی importهای
// type-only (مثل `import type { Metadata }`) false-positive می‌دهد.
module.exports = [...compat.extends("next/core-web-vitals"), ...base];
