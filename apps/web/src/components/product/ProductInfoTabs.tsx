import {
  formatNumberFa,
  productDetailPage,
  storeFacts,
} from "@arbyte/contracts";
import type { PublicProductDetail } from "@arbyte/contracts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@arbyte/ui";

interface ProductInfoTabsProps {
  specifications: PublicProductDetail["specifications"];
  description: string | null;
  qualifiesForFreeShipping: boolean;
  isPresale: boolean;
  /** یادداشت ارسال/مرجوعی مخصوص همین محصول (پنل) — وقتی ست باشد جای متن
   * عمومی storeFacts.policies می‌نشیند. */
  shippingNote: string | null;
  returnPolicyNote: string | null;
}

/**
 * T-214 §۲ — سه تب. ⚠️ «محتوای هر سه تب در HTML سرور رندر شود» (بند ۹.۷۵):
 * `TabsContent` با `forceMount` هر سه پنل را در DOM نگه می‌دارد، فقط
 * غیرفعال‌ها با CSS پنهان می‌شوند — نه این‌که Radix آن‌ها را کلاً حذف کند.
 */
export function ProductInfoTabs({
  specifications,
  description,
  qualifiesForFreeShipping,
  isPresale,
  shippingNote,
  returnPolicyNote,
}: ProductInfoTabsProps) {
  const paragraphs = description?.split("\n").filter(Boolean) ?? [];
  const { policies } = storeFacts;

  return (
    <section className="border-border bg-surface overflow-hidden rounded-card border">
      <Tabs defaultValue="specs">
        <TabsList className="px-2 pt-2">
          <TabsTrigger value="specs">
            {productDetailPage.tabs.specs}
          </TabsTrigger>
          {paragraphs.length > 0 ? (
            <TabsTrigger value="review">
              {productDetailPage.tabs.review}
            </TabsTrigger>
          ) : null}
          <TabsTrigger value="warranty">
            {productDetailPage.tabs.warrantyShipping}
          </TabsTrigger>
        </TabsList>

        <div className="p-4.5 md:p-7.5">
          <TabsContent
            value="specs"
            forceMount
            className="data-[state=inactive]:hidden"
          >
            <div className="grid grid-cols-1 gap-x-9 md:grid-cols-2">
              {specifications.flatMap((group) =>
                group.items.map((item) => (
                  <div
                    key={`${group.groupName}-${item.name}`}
                    className="border-border-divider flex items-baseline justify-between gap-4 border-b py-3.5"
                  >
                    <span className="text-caption text-secondary whitespace-nowrap">
                      {item.name}
                    </span>
                    <span
                      dir="ltr"
                      className="text-caption text-primary text-end font-emphasis"
                    >
                      {item.value}
                    </span>
                  </div>
                )),
              )}
            </div>
          </TabsContent>

          {paragraphs.length > 0 ? (
            <TabsContent
              value="review"
              forceMount
              className="data-[state=inactive]:hidden"
            >
              <div className="flex max-w-[70ch] flex-col gap-4">
                {paragraphs.map((paragraph, index) => (
                  <p
                    key={index}
                    className="text-body text-primary leading-loose"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </TabsContent>
          ) : null}

          <TabsContent
            value="warranty"
            forceMount
            className="data-[state=inactive]:hidden"
          >
            <div className="grid grid-cols-1 gap-7 md:grid-cols-3">
              <div className="flex flex-col gap-2">
                <p className="text-caption text-primary font-emphasis">
                  {productDetailPage.warrantyPolicy.heading}
                </p>
                <p className="text-caption text-secondary leading-loose">
                  {productDetailPage.warrantyPolicy.body(
                    formatNumberFa(policies.warrantyMonths),
                  )}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-caption text-primary font-emphasis">
                  {productDetailPage.shippingPolicy.heading}
                </p>
                <p className="text-caption text-secondary leading-loose">
                  {isPresale ? (
                    productDetailPage.presaleShippingNote
                  ) : shippingNote ? (
                    shippingNote
                  ) : (
                    <>
                      {productDetailPage.shippingPolicy.body(
                        formatNumberFa(policies.sameDayCutoffHour),
                        formatNumberFa(policies.tehranDeliveryDays),
                        formatNumberFa(policies.provinceDeliveryDays[0]),
                        formatNumberFa(policies.provinceDeliveryDays[1]),
                      )}
                      {qualifiesForFreeShipping
                        ? ` ${productDetailPage.shippingPolicy.freeShippingNote}`
                        : ""}
                    </>
                  )}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-caption text-primary font-emphasis">
                  {productDetailPage.returnPolicy.heading}
                </p>
                <p className="text-caption text-secondary leading-loose">
                  {returnPolicyNote
                    ? returnPolicyNote
                    : productDetailPage.returnPolicy.body(
                        formatNumberFa(policies.returnDays),
                      )}
                </p>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </section>
  );
}
