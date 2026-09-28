import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildVariantLabel } from "./variant-label";

/**
 * D-03 §3 — این بردار در apps/backend/apps/public_api/tests.py هم اجرا
 * می‌شود؛ یک منطق، دو پیاده‌سازی (Nest/TS و Django/Python)، یک مجموعه‌ی جواب.
 */
const vectorsPath = fileURLToPath(
  new URL("../../test-vectors/variant-label.json", import.meta.url),
);
const vectors: {
  description: string;
  axisValues: Record<string, string>;
  variantAxes: { specDefId: string }[];
  expected: string;
}[] = JSON.parse(readFileSync(vectorsPath, "utf-8"));

describe("buildVariantLabel — بردار مشترک test-vectors/variant-label.json", () => {
  for (const vector of vectors) {
    it(vector.description, () => {
      expect(buildVariantLabel(vector.axisValues, vector.variantAxes)).toBe(
        vector.expected,
      );
    });
  }
});
