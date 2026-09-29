import { useQuery } from "@tanstack/react-query";
import {
  getConversionReport,
  getAbandonedCartsReport,
  getCustomersReport,
  getReturnRateReport,
  getGrossMarginReport,
} from "@/lib/api";
import { formatPrice } from "@/lib/formatters";
import {
  ReportSection,
  StatGrid,
  ReportLoading,
  ReportError,
} from "@/pages/reports/ReportSection";

function formatPercent(rate: number): string {
  return `${(rate * 100).toLocaleString("fa-IR", { maximumFractionDigits: 1 })}٪`;
}

export function ConversionReportCard({
  from,
  to,
}: {
  from: string;
  to: string;
}) {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["report-conversion", from, to],
    queryFn: () =>
      getConversionReport({ from: from || undefined, to: to || undefined }),
  });
  return (
    <ReportSection
      title="نرخ تبدیل"
      description="نسبت سبدهای ساخته‌شده به سفارش‌های پرداخت‌شده."
    >
      {isPending ? (
        <ReportLoading />
      ) : isError || !data ? (
        <ReportError onRetry={() => refetch()} />
      ) : (
        <StatGrid
          stats={[
            {
              label: "سبد ساخته‌شده",
              value: data.cartsCreated.toLocaleString("fa-IR"),
            },
            {
              label: "سفارش پرداخت‌شده",
              value: data.ordersPaid.toLocaleString("fa-IR"),
            },
            {
              label: "نرخ تبدیل",
              value: formatPercent(data.rate),
              tone: "success",
            },
          ]}
        />
      )}
    </ReportSection>
  );
}

export function AbandonedCartsReportCard({
  from,
  to,
}: {
  from: string;
  to: string;
}) {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["report-abandoned-carts", from, to],
    queryFn: () =>
      getAbandonedCartsReport({ from: from || undefined, to: to || undefined }),
  });
  return (
    <ReportSection
      title="سبدهای رهاشده"
      description="سبدهایی که با کالا باقی مانده و به سفارش تبدیل نشده‌اند."
    >
      {isPending ? (
        <ReportLoading />
      ) : isError || !data ? (
        <ReportError onRetry={() => refetch()} />
      ) : (
        <StatGrid
          stats={[
            {
              label: "سبد ساخته‌شده",
              value: data.cartsCreated.toLocaleString("fa-IR"),
            },
            {
              label: "سبد رهاشده",
              value: data.cartsAbandoned.toLocaleString("fa-IR"),
            },
            {
              label: "نرخ رهاسازی",
              value: formatPercent(data.rate),
              tone: "warning",
            },
          ]}
        />
      )}
    </ReportSection>
  );
}

export function CustomersReportCard({
  from,
  to,
}: {
  from: string;
  to: string;
}) {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["report-customers", from, to],
    queryFn: () =>
      getCustomersReport({ from: from || undefined, to: to || undefined }),
  });
  return (
    <ReportSection
      title="مشتریان"
      description="مشتریان جدید و بازگشتی در بازه انتخاب‌شده."
    >
      {isPending ? (
        <ReportLoading />
      ) : isError || !data ? (
        <ReportError onRetry={() => refetch()} />
      ) : (
        <StatGrid
          stats={[
            {
              label: "مشتری جدید",
              value: data.newCustomers.toLocaleString("fa-IR"),
            },
            {
              label: "مشتری بازگشتی",
              value: data.returningCustomers.toLocaleString("fa-IR"),
            },
          ]}
        />
      )}
    </ReportSection>
  );
}

export function ReturnRateReportCard({
  from,
  to,
}: {
  from: string;
  to: string;
}) {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["report-return-rate", from, to],
    queryFn: () =>
      getReturnRateReport({ from: from || undefined, to: to || undefined }),
  });
  return (
    <ReportSection
      title="نرخ مرجوعی"
      description="نسبت سفارش‌های مرجوعی به سفارش‌های تحویل‌شده."
    >
      {isPending ? (
        <ReportLoading />
      ) : isError || !data ? (
        <ReportError onRetry={() => refetch()} />
      ) : (
        <StatGrid
          stats={[
            {
              label: "سفارش تحویل‌شده",
              value: data.ordersDelivered.toLocaleString("fa-IR"),
            },
            {
              label: "سفارش مرجوعی",
              value: data.ordersReturned.toLocaleString("fa-IR"),
            },
            {
              label: "نرخ مرجوعی",
              value: formatPercent(data.rate),
              tone: "danger",
            },
          ]}
        />
      )}
    </ReportSection>
  );
}

export function GrossMarginReportCard({
  from,
  to,
}: {
  from: string;
  to: string;
}) {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["report-gross-margin", from, to],
    queryFn: () =>
      getGrossMarginReport({ from: from || undefined, to: to || undefined }),
  });
  return (
    <ReportSection
      title="حاشیه سود ناخالص"
      description="اختلاف درآمد و قیمت تمام‌شده؛ پوشش بر اساس قیمت تمام‌شده ثبت‌شده."
    >
      {isPending ? (
        <ReportLoading />
      ) : isError || !data ? (
        <ReportError onRetry={() => refetch()} />
      ) : (
        <StatGrid
          stats={[
            { label: "درآمد", value: formatPrice(data.revenue) },
            { label: "قیمت تمام‌شده", value: formatPrice(data.cost) },
            {
              label: "حاشیه سود",
              value: formatPrice(data.margin),
              tone: "success",
            },
            {
              label: "پوشش قیمت تمام‌شده",
              value: formatPercent(data.coveragePercent / 100),
            },
          ]}
        />
      )}
    </ReportSection>
  );
}
