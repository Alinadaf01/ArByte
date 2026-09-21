"use client";

import { Eye, Percent, ShoppingBag, Users, Wallet } from "lucide-react";
import { formatMoney, toPersianDigits } from "@arbyte/contracts";
import { formatDateFa } from "@arbyte/contracts/date";
import { usePageSearch } from "@/components/layout/SearchContext";
import { KpiTile } from "@/components/kpi/KpiTile";
import {
  DataTable,
  type DataTableColumn,
  type DataTableFilter,
} from "@/components/table/DataTable";
import { dictionary } from "@/lib/dictionary";
import { DEMO_ORDERS, type DemoOrder } from "@/lib/demo-data";

const KPIS = [
  {
    id: "revenue",
    label: dictionary.kpi.revenue.label,
    value: formatMoney(12_400_000n),
    deltaLabel: `+${toPersianDigits("18.2")}٪`,
    trend: "up" as const,
    icon: Wallet,
    sparklineValues: [22, 18, 20, 12, 14, 8, 6],
  },
  {
    id: "orders",
    label: dictionary.kpi.orders.label,
    value: toPersianDigits(3842),
    deltaLabel: `+${toPersianDigits("9.4")}٪`,
    trend: "up" as const,
    icon: ShoppingBag,
    sparklineValues: [24, 20, 22, 14, 10, 8],
  },
  {
    id: "customers",
    label: dictionary.kpi.customers.label,
    value: toPersianDigits(28190),
    deltaLabel: `+${toPersianDigits("5.1")}٪`,
    trend: "up" as const,
    icon: Users,
    sparklineValues: [26, 22, 24, 16, 12],
  },
  {
    id: "conversion",
    label: dictionary.kpi.conversion.label,
    value: `${toPersianDigits("4.7")}٪`,
    deltaLabel: `−${toPersianDigits("0.3")}٪`,
    trend: "down" as const,
    icon: Percent,
    sparklineValues: [10, 14, 12, 18, 16],
  },
];

const STATUS_LABEL: Record<DemoOrder["status"], string> = {
  paid: dictionary.status.paid,
  pending: dictionary.status.pending,
  shipped: dictionary.status.shipped,
  cancelled: dictionary.status.cancelled,
};

// هر جفت با ابزار کنتراست بررسی شده (T-100، جدول کنتراست در ADR-004):
// text-success-text و text-warning روی سطوح tint فقط ~۴.۳:۱ می‌دهند (کمتر
// از آستانه‌ی AA برای متن) — روی bg-surface (سفید) + حاشیه هر دو >۴.۹:۱ اند.
// text-brand روی bg-brand-tint-1 هم ۴.۲۶:۱ است؛ text-brand-active (۶.۹۳:۱) جایگزین شد.
const STATUS_TONE: Record<DemoOrder["status"], string> = {
  paid: "bg-surface border border-border text-success-text",
  pending: "bg-surface border border-border text-warning",
  shipped: "bg-brand-tint-1 text-brand-active",
  cancelled: "bg-danger-tint text-danger",
};

const ORDER_FILTERS: DataTableFilter<DemoOrder>[] = [
  { key: "all", label: dictionary.table.tabs.all, predicate: () => true },
  {
    key: "paid",
    label: dictionary.table.tabs.paid,
    predicate: (row) => row.status === "paid",
  },
  {
    key: "pending",
    label: dictionary.table.tabs.pending,
    predicate: (row) => row.status === "pending",
  },
  {
    key: "shipped",
    label: dictionary.table.tabs.shipped,
    predicate: (row) => row.status === "shipped",
  },
  {
    key: "cancelled",
    label: dictionary.table.tabs.cancelled,
    predicate: (row) => row.status === "cancelled",
  },
];

const ORDER_COLUMNS: DataTableColumn<DemoOrder>[] = [
  {
    key: "orderNumber",
    header: dictionary.table.columns.orderId,
    sortValue: (row) => row.orderNumber,
    render: (row) => (
      <span dir="ltr" className="text-caption font-mono text-micro">
        {row.orderNumber}
      </span>
    ),
  },
  {
    key: "customer",
    header: dictionary.table.columns.customer,
    sortValue: (row) => row.customerName,
    render: (row) => (
      <div className="flex items-center gap-2">
        {/* حرف اول اسم متن واقعی است — text-brand روی این پس‌زمینه ۴.۲۶:۱ است، text-brand-active لازم است */}
        <span className="bg-brand-tint-1 text-brand-active flex h-9 w-9 shrink-0 items-center justify-center rounded-tile text-micro font-emphasis">
          {row.customerInitial}
        </span>
        <span className="text-primary font-emphasis">{row.customerName}</span>
      </div>
    ),
  },
  {
    key: "amount",
    header: dictionary.table.columns.amount,
    sortValue: (row) => Number(row.amountToman),
    render: (row) => (
      <span className="text-primary font-emphasis">
        {formatMoney(row.amountToman)}
      </span>
    ),
  },
  {
    key: "date",
    header: dictionary.table.columns.date,
    sortValue: (row) => row.date.getTime(),
    render: (row) => (
      <span className="text-caption">{formatDateFa(row.date)}</span>
    ),
  },
  {
    key: "status",
    header: dictionary.table.columns.status,
    render: (row) => (
      <span
        className={`inline-flex items-center rounded-pill px-2.5 py-1 text-micro font-emphasis ${STATUS_TONE[row.status]}`}
      >
        {STATUS_LABEL[row.status]}
      </span>
    ),
  },
];

export default function DashboardPage() {
  const { term } = usePageSearch();

  return (
    <>
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPIS.map((kpi) => (
          <KpiTile key={kpi.id} {...kpi} />
        ))}
      </section>

      <section className="bg-surface shadow-card rounded-card-lg p-4 sm:p-5 lg:p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="bg-brand-tint-1 text-brand flex h-11 w-11 shrink-0 items-center justify-center rounded-tile">
            <ShoppingBag size={20} aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-primary text-body font-heading sm:text-subhead">
              {dictionary.recentOrders.title}
            </h2>
            <p className="text-caption text-micro">
              {dictionary.recentOrders.subtitle}
            </p>
          </div>
        </div>

        <DataTable
          columns={ORDER_COLUMNS}
          rows={DEMO_ORDERS}
          getRowId={(row) => row.id}
          filters={ORDER_FILTERS}
          searchTerm={term}
          searchPredicate={(row, term) =>
            row.orderNumber.toLowerCase().includes(term) ||
            row.customerName.toLowerCase().includes(term)
          }
          rowActions={(row) => (
            <button
              type="button"
              aria-label={`${dictionary.table.viewLabel} ${row.orderNumber}`}
              className="text-secondary hover:bg-brand-tint-1 hover:text-brand flex h-9 w-9 items-center justify-center rounded-tile"
            >
              <Eye size={16} aria-hidden="true" />
            </button>
          )}
        />
      </section>
    </>
  );
}
