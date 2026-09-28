import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { PublicVariant } from "./variant";
import { selectCardVariant } from "./variant-selection";

function makeVariant(
  id: string,
  axisValues: Record<string, string>,
  final: number,
): PublicVariant {
  return {
    id,
    sku: `SKU-${id}`,
    label: Object.values(axisValues).join(" · "),
    axisValues,
    price: { final, compareAt: null },
    availability: { status: "IN_STOCK" },
  };
}

const vectorsPath = fileURLToPath(
  new URL("../../test-vectors/variant-selection.json", import.meta.url),
);
const vectorFile: {
  variants: { id: string; axisValues: Record<string, string>; price: number }[];
  cases: {
    description: string;
    variants?: {
      id: string;
      axisValues: Record<string, string>;
      price: number;
    }[];
    defaultVariantId: string;
    specFilters: Record<string, string> | null;
    expectedId?: string;
    expectedPrice?: number;
    expectError?: boolean;
  }[];
} = JSON.parse(readFileSync(vectorsPath, "utf-8"));

/** D-03 §3 — همان بردار در apps/backend/apps/public_api/tests.py اجرا می‌شود. */
describe("selectCardVariant — بردار مشترک test-vectors/variant-selection.json", () => {
  for (const testCase of vectorFile.cases) {
    it(testCase.description, () => {
      const rows = testCase.variants ?? vectorFile.variants;
      const variants = rows.map((r) =>
        makeVariant(r.id, r.axisValues, r.price),
      );

      if (testCase.expectError) {
        expect(() =>
          selectCardVariant(
            variants,
            testCase.defaultVariantId,
            testCase.specFilters ?? undefined,
          ),
        ).toThrow();
        return;
      }

      const result = selectCardVariant(
        variants,
        testCase.defaultVariantId,
        testCase.specFilters ?? undefined,
      );
      expect(result.id).toBe(testCase.expectedId);
      if (testCase.expectedPrice !== undefined) {
        expect(result.price.final).toBe(testCase.expectedPrice);
      }
    });
  }
});
