import { PageHeader } from "@/components/ui/PageHeader";
import { Input } from "@/components/ui/Field";
import { useQueryFilters } from "@/lib/useQueryFilters";
import { SalesReportCard } from "@/pages/reports/SalesReportCard";
import { TopProductsReportCard } from "@/pages/reports/TopProductsReportCard";
import { ByCategoryReportCard } from "@/pages/reports/ByCategoryReportCard";
import { ByGatewayReportCard } from "@/pages/reports/ByGatewayReportCard";
import {
  ConversionReportCard,
  AbandonedCartsReportCard,
  CustomersReportCard,
  ReturnRateReportCard,
  GrossMarginReportCard,
} from "@/pages/reports/SimpleStatReportCards";

export default function ReportsPage() {
  const [filters, setFilters] = useQueryFilters({ from: "", to: "" });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="مدیریت فروش"
        description="۹ گزارش فروش با فیلتر بازه زمانی."
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

      <SalesReportCard from={filters.from} to={filters.to} />
      <TopProductsReportCard from={filters.from} to={filters.to} />
      <ByCategoryReportCard from={filters.from} to={filters.to} />
      <ByGatewayReportCard from={filters.from} to={filters.to} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ConversionReportCard from={filters.from} to={filters.to} />
        <AbandonedCartsReportCard from={filters.from} to={filters.to} />
        <CustomersReportCard from={filters.from} to={filters.to} />
        <ReturnRateReportCard from={filters.from} to={filters.to} />
      </div>
      <GrossMarginReportCard from={filters.from} to={filters.to} />
    </div>
  );
}
