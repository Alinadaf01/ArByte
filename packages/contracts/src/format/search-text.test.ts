import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { normalizeSearchText } from "./search-text";

/** D-03 §3 — همان بردار در apps/backend/apps/public_api/tests.py اجرا می‌شود. */
const vectorsPath = fileURLToPath(
  new URL("../../test-vectors/search-normalize.json", import.meta.url),
);
const vectors: { description: string; input: string; expected: string }[] =
  JSON.parse(readFileSync(vectorsPath, "utf-8"));

describe("normalizeSearchText — بردار مشترک test-vectors/search-normalize.json", () => {
  for (const vector of vectors) {
    it(vector.description, () => {
      expect(normalizeSearchText(vector.input)).toBe(vector.expected);
    });
  }
});
