import { formatNumberFa, homeCommunity, storeFacts } from "@arbyte/contracts";
import { IranMap } from "./IranMap";

/**
 * T-212 §۴ — «جامعه آربایت». نقشه از `IranMap.tsx` (SVG ایستا، تولیدشده‌ی
 * آفلاین توسط `pnpm map:build` — صفر d3/topojson در این باندل). آمار
 * (`storeFacts.stats.*`) همه فعلاً `null`اند؛ طبق قاعده‌ی BATCH-01 (بدون
 * آمار ساختگی)، اگر هر سه null بود کل ردیف آمار پنهان می‌شود، نه صفر یا
 * جای خالی.
 */
export function CommunitySection() {
  const { stats, policies } = storeFacts;
  const statEntries = (
    [
      { key: "deliveredOrders", value: stats.deliveredOrders },
      { key: "satisfactionPercent", value: stats.satisfactionPercent },
      { key: "yearsActive", value: stats.yearsActive },
    ] as const
  ).filter(
    (entry): entry is { key: typeof entry.key; value: number } =>
      entry.value != null,
  );

  const provinceRange = `${formatNumberFa(policies.provinceDeliveryDays[0])} تا ${formatNumberFa(policies.provinceDeliveryDays[1])}`;
  const tehranDays = formatNumberFa(policies.tehranDeliveryDays);

  return (
    <section className="bg-surface border-border border-t px-[5vw] py-14 md:py-20">
      <div className="mx-auto grid max-w-[1240px] items-start gap-8 md:grid-cols-2">
        <div className="flex flex-col gap-4.5">
          <span className="bg-paper border-border text-brand inline-flex w-fit items-center gap-1.5 rounded-pill border px-3 py-1 text-caption font-emphasis">
            {homeCommunity.badge}
          </span>
          <h2 className="text-h2 text-primary font-heading tracking-tight text-pretty">
            {homeCommunity.title}
          </h2>
          <p className="text-caption text-secondary max-w-[40ch] leading-7">
            {homeCommunity.description(tehranDays, provinceRange)}
          </p>

          {statEntries.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-6">
              {statEntries.map((entry) => (
                <div key={entry.key} className="flex flex-col gap-0.5">
                  <span className="text-subhead text-primary font-heading tracking-tight">
                    {entry.key === "satisfactionPercent"
                      ? `${formatNumberFa(entry.value)}٪`
                      : formatNumberFa(entry.value)}
                  </span>
                  <span className="text-caption text-secondary">
                    {homeCommunity.statLabels[entry.key]}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-3.5">
          <div className="h-65 md:h-95">
            <IranMap />
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div className="border-border bg-paper flex items-center gap-2.5 rounded-tile border px-3.5 py-2.5">
              <span
                aria-hidden="true"
                className="bg-brand size-2.5 shrink-0 rounded-full"
              />
              <span className="text-caption text-secondary-2">
                {homeCommunity.legendHub}
              </span>
            </div>
            <div className="border-border bg-paper flex items-center gap-2.5 rounded-tile border px-3.5 py-2.5">
              <span
                aria-hidden="true"
                className="border-brand size-2.5 shrink-0 rounded-full border-[1.8px]"
              />
              <span className="text-caption text-secondary-2">
                {homeCommunity.legendDelivery(provinceRange)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
