import { comparePage, formatPrice } from "@arbyte/contracts";
import type { PublicProductDetail } from "@arbyte/contracts";
import { resolveInitialVariant } from "@/components/product/resolve-variant";
import { bestIndexesFromNumbers, bestValueIndexes } from "@/lib/compare-rules";

export interface CompareRow {
  key: string;
  label: string;
  cells: string[];
  bestIndexes: Set<number>;
}

const MISSING_VALUE = "—";

/**
 * T-215 §۲ — ردیف‌ها = اجتماع مشخصات محصولات، به ترتیب گروه‌ها؛ ردیف قیمت
 * (واریانت پیش‌فرض) همیشه اول. مقدار نبود برای یک محصول → «—».
 */
export function buildCompareRows(
  products: readonly PublicProductDetail[],
): CompareRow[] {
  const priceValues = products.map(
    (p) => resolveInitialVariant(p.variants, p.defaultVariantId).price.final,
  );
  const priceRow: CompareRow = {
    key: "price",
    label: comparePage.rowLabels.price,
    cells: priceValues.map((v) => formatPrice(BigInt(v))),
    bestIndexes: bestIndexesFromNumbers("lower-is-better", priceValues),
  };

  const specNames: string[] = [];
  const specMaps = products.map((product) => {
    const map = new Map<string, string>();
    for (const group of product.specifications) {
      for (const item of group.items) {
        map.set(item.name, item.value);
        if (!specNames.includes(item.name)) specNames.push(item.name);
      }
    }
    return map;
  });

  const specRows: CompareRow[] = specNames.map((name) => {
    const cells = specMaps.map((map) => map.get(name) ?? MISSING_VALUE);
    return {
      key: name,
      label: name,
      cells,
      bestIndexes: bestValueIndexes(name, cells),
    };
  });

  return [priceRow, ...specRows];
}

export function hideRowInDiffMode(row: CompareRow): boolean {
  return row.cells.every((cell) => cell === row.cells[0]);
}
