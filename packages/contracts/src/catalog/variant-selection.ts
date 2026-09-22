import type { PublicVariant } from "./variant";

/**
 * الحاقیه §۳ — وقتی فیلتر مشخصه‌ی محور فعال است (`spec[ram]=32GB`)،
 * `defaultVariant` پاسخ فهرست باید اولین واریانت *منطبق* باشد، نه واریانت
 * پیش‌فرض واقعی محصول. وگرنه کاربر روی «۳۲GB، ۲۶۱ میلیون» کلیک می‌کند و
 * صفحه با «۶۴GB، ۲۸۹ میلیون» باز می‌شود — الحاقیه این را دقیقاً همین مثال
 * زده.
 *
 * `specFilters` کلیدش `specDefId` است (همان کلیدهای query `spec[<id>]`)،
 * چون `PublicVariant.axisValues` هم با همان کلید نگه‌داری می‌شود.
 */
export function selectCardVariant(
  variants: readonly PublicVariant[],
  defaultVariantId: string,
  specFilters?: Record<string, string>,
): PublicVariant {
  const [firstVariant] = variants;
  if (!firstVariant) {
    throw new Error(
      "selectCardVariant: هر محصول حداقل یک واریانت دارد (الحاقیه T-003 بخش ۱).",
    );
  }

  if (specFilters && Object.keys(specFilters).length > 0) {
    const matching = variants.find((variant) =>
      Object.entries(specFilters).every(
        ([specDefId, value]) => variant.axisValues[specDefId] === value,
      ),
    );
    if (matching) return matching;
  }

  const byDefaultId = variants.find(
    (variant) => variant.id === defaultVariantId,
  );
  return byDefaultId ?? firstVariant;
}
