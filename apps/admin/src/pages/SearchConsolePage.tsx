import { useQuery } from "@tanstack/react-query";
import { JalaliDateInput } from "@/components/ui/JalaliDateInput";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { authorizedFetch } from "@/lib/api";
import { SearchConsoleNotConnected } from "@/pages/searchConsole/NotConnected";
import { useQueryFilters } from "@/lib/useQueryFilters";
import { PerformanceCard } from "@/pages/searchConsole/PerformanceCard";
import { QueriesCard } from "@/pages/searchConsole/QueriesCard";
import { PagesCard } from "@/pages/searchConsole/PagesCard";
import { IndexStatusCard } from "@/pages/searchConsole/IndexStatusCard";
import { SitemapStatusCard } from "@/pages/searchConsole/SitemapStatusCard";

export default function SearchConsolePage() {
  const [filters, setFilters] = useQueryFilters({ from: "", to: "" });
  // F-04 — بدون داده (اتصال واقعی بچ ۰۵) فقط پیام «متصل نیست»؛ کارت‌ها صدا زده نمی‌شوند.
  const status = useQuery({
    queryKey: ["search-console-status"],
    queryFn: async () =>
      (
        (await (await authorizedFetch("/search-console/status/")).json()) as {
          hasData: boolean;
        }
      ).hasData,
  });
  if (status.isPending) return <Skeleton className="h-64 w-full" />;
  if (!status.data) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="سرچ کنسول"
          description="عملکرد سایت در جست‌وجوی گوگل — نمایش، کلیک، پرس‌وجوهای برتر، و وضعیت ایندکس."
        />
        <section className="glass-card">
          <SearchConsoleNotConnected />
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="سرچ کنسول"
        description="عملکرد سایت در جست‌وجوی گوگل — نمایش، کلیک، پرس‌وجوهای برتر، و وضعیت ایندکس."
      />

      <section className="glass-card flex flex-wrap items-center gap-3 p-5">
        <label className="flex items-center gap-2 text-xs text-slate-400">
          از
          <JalaliDateInput
            label="از تاریخ"
            value={filters.from}
            onChange={(iso) => setFilters({ from: iso })}
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-400">
          تا
          <JalaliDateInput
            label="تا تاریخ"
            value={filters.to}
            onChange={(iso) => setFilters({ to: iso })}
          />
        </label>
      </section>

      <PerformanceCard from={filters.from} to={filters.to} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <QueriesCard from={filters.from} to={filters.to} />
        <PagesCard from={filters.from} to={filters.to} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <IndexStatusCard />
        <SitemapStatusCard />
      </div>
    </div>
  );
}
