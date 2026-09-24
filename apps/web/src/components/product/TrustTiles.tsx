import {
  formatNumberFa,
  homePage,
  productDetailPage,
  storeFacts,
} from "@arbyte/contracts";
import { TRUST_ICON_PATHS } from "@/components/icons/trust-icon-paths";

interface TrustTilesProps {
  /** قیمت واریانت انتخاب‌شده — برای شرط «ارسال رایگان فقط اگر ≥ آستانه». */
  selectedVariantPrice: number;
}

/**
 * T-214 §۲ — سه کاشی اعتماد بالای تب‌ها. تایل سوم («تست پیش از ارسال»)
 * عیناً همان اصلاح T-212 است (`homePage.benefits.testedBeforeShipping`) —
 * نه رونویسی طراحی («سریال در پرونده»، ادعای بدون پشتیبان).
 */
export function TrustTiles({ selectedVariantPrice }: TrustTilesProps) {
  const qualifiesForFreeShipping =
    selectedVariantPrice >= storeFacts.policies.freeShippingMinToman;

  const tiles = [
    {
      key: "warranty",
      title: productDetailPage.trustTiles.warrantyTitle(
        formatNumberFa(storeFacts.policies.warrantyMonths),
      ),
      subtitle: productDetailPage.trustTiles.replacementSubtitle,
    },
    qualifiesForFreeShipping
      ? {
          key: "freeShipping",
          title: productDetailPage.trustTiles.freeShippingTitle,
          subtitle: productDetailPage.trustTiles.tehranSubtitle,
        }
      : null,
    {
      key: "testedBeforeShipping",
      title: homePage.benefits.testedBeforeShipping.title,
      subtitle: homePage.benefits.testedBeforeShipping.description,
    },
  ].filter((tile): tile is NonNullable<typeof tile> => tile !== null);

  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
      {tiles.map((tile) => (
        <div
          key={tile.key}
          className="border-border bg-surface flex items-start gap-2.5 rounded-tile border p-3.5"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-brand mt-0.5 shrink-0"
            aria-hidden="true"
          >
            {TRUST_ICON_PATHS[tile.key]}
          </svg>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-caption text-primary font-emphasis">
              {tile.title}
            </span>
            <span className="text-micro text-secondary">{tile.subtitle}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
