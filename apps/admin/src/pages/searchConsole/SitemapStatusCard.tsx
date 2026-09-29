import { useQuery } from "@tanstack/react-query";
import { getSearchConsoleSitemapStatus } from "@/lib/api";
import { formatJalaliDateTime } from "@/lib/formatters";
import {
  ReportSection,
  StatGrid,
  ReportLoading,
  ReportError,
} from "@/pages/reports/ReportSection";
import { SearchConsoleNotConnected } from "@/pages/searchConsole/NotConnected";

export function SitemapStatusCard() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["search-console-sitemap-status"],
    queryFn: () => getSearchConsoleSitemapStatus(),
  });

  return (
    <ReportSection
      title="وضعیت سایت‌مپ"
      description="آخرین خوانده‌شدن sitemap.xml توسط گوگل و تعداد آدرس‌های کشف‌شده."
    >
      {isPending ? (
        <ReportLoading />
      ) : isError ? (
        <ReportError onRetry={() => refetch()} />
      ) : !data ? (
        <SearchConsoleNotConnected />
      ) : (
        <StatGrid
          stats={[
            {
              label: "آخرین خوانده‌شدن",
              value: data.lastReadAt
                ? formatJalaliDateTime(data.lastReadAt)
                : "هنوز خوانده نشده",
            },
            {
              label: "آدرس‌های کشف‌شده",
              value: data.discoveredUrls.toLocaleString("fa-IR"),
            },
          ]}
        />
      )}
    </ReportSection>
  );
}
