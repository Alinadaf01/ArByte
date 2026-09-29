import { Link } from "react-router-dom";
import { DashboardZone } from "@/pages/dashboard/DashboardZone";
import type { NeedsAction } from "@/types/dashboard";

export function NeedsActionZone({ data }: { data: NeedsAction }) {
  const items: {
    label: string;
    value: number;
    to: string;
    danger?: boolean;
  }[] = [
    {
      label: "رسید در انتظار بررسی",
      value: data.paymentReview,
      to: "/orders?status=PAYMENT_REVIEW",
    },
    {
      label: "پرداخت‌شده در انتظار پردازش",
      value: data.paidPendingProcessing,
      to: "/orders?status=PAID",
    },
    {
      label: "در حال پردازش",
      value: data.readyToShip,
      to: "/orders?status=PROCESSING",
    },
    {
      label: "آماده‌ی ارسال بدون سریال",
      value: data.readyWithoutSerial,
      to: "/orders?status=PROCESSING&readyWithoutSerial=true",
      danger: true,
    },
    {
      label: "درخواست مرجوعی جدید",
      value: data.newReturnRequests,
      to: "/returns?status=requested",
    },
    {
      label: "پیام خوانده‌نشده",
      value: data.unreadMessages,
      to: "/messages?isRead=false",
    },
    {
      label: "نظر در انتظار تأیید",
      value: data.pendingReviews,
      to: "/reviews?status=pending",
    },
    {
      label: "کالای زیر نقطه سفارش",
      value: data.lowStockCount,
      to: "/inventory?isLow=true",
    },
    {
      label: "ناموجود ولی فعال در سایت",
      value: data.outOfStockActive,
      to: "/products?isActive=true&inStock=false",
      danger: true,
    },
    {
      label: "پرداخت نیمه‌تمام (+۳۰ دقیقه)",
      value: data.stalePendingPayments,
      to: "/orders?status=AWAITING_PAYMENT",
      danger: true,
    },
  ];

  const total = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <DashboardZone
      title="نیازمند اقدام"
      description="هر عدد به لیست فیلترشده مربوطه لینک است."
    >
      {total === 0 ? (
        <p className="m-0 rounded-xl border border-success/20 bg-success/10 px-4 py-3 text-sm font-semibold text-success">
          همه چیز مرتب است.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {items.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className={`rounded-xl border p-4 transition-colors ${
                item.value > 0
                  ? item.danger
                    ? "border-danger/20 bg-danger/10 hover:border-danger/40"
                    : "border-warning/20 bg-warning/10 hover:border-warning/40"
                  : "border-white/[0.06] bg-ink-800/40 hover:border-brand-500/30"
              }`}
            >
              <p className="m-0 text-[11px] text-slate-400">{item.label}</p>
              <p
                className={`m-0 mt-1 text-xl font-extrabold ${
                  item.value > 0
                    ? item.danger
                      ? "text-danger"
                      : "text-warning"
                    : "text-white"
                }`}
              >
                {item.value.toLocaleString("fa-IR")}
              </p>
            </Link>
          ))}
        </div>
      )}
    </DashboardZone>
  );
}
