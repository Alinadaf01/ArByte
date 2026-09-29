import { PageHeader } from "@/components/ui/PageHeader";
import { Input } from "@/components/ui/Field";
import { useQueryFilters } from "@/lib/useQueryFilters";
import { PerformanceCard } from "@/pages/searchConsole/PerformanceCard";
import { QueriesCard } from "@/pages/searchConsole/QueriesCard";
import { PagesCard } from "@/pages/searchConsole/PagesCard";
import { IndexStatusCard } from "@/pages/searchConsole/IndexStatusCard";
import { SitemapStatusCard } from "@/pages/searchConsole/SitemapStatusCard";

export default function SearchConsolePage() {
  const [filters, setFilters] = useQueryFilters({ from: "", to: "" });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="سرچ کنسول"
        description="عملکرد سایت در جست‌وجوی گوگل — نمایش، کلیک، پرس‌وجوهای برتر، و وضعیت ایندکس."
      />

      <section className="glass-card flex flex-wrap items-center gap-3 p-5">
        <label className="flex items-center gap-2 text-xs text-slate-400">
          از
          <Input
            type="date"
            className="w-auto"
            value={filters.from}
            onChange={(e) => setFilters({ from: e.target.value })}
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-400">
          تا
          <Input
            type="date"
            className="w-auto"
            value={filters.to}
            onChange={(e) => setFilters({ to: e.target.value })}
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
