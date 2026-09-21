/**
 * داده‌ی نمایشی تا مدل داده‌ی واقعی سفارش (T-003) و اتصال API (T-004) بیاید.
 * این «محتوا»ست نه متن رابط کاربری — مثل آرایه‌های BASE/ORDERS در منطق
 * صفحات طراحی، نه رشته‌ای که باید در dictionary متمرکز شود.
 */
export interface DemoOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerInitial: string;
  amountToman: bigint;
  dateLabel: string;
  status: "paid" | "pending" | "shipped" | "cancelled";
}

export const DEMO_ORDERS: DemoOrder[] = [
  {
    id: "1",
    orderNumber: "ARB-14042738",
    customerName: "سارا احمدی",
    customerInitial: "س",
    amountToman: 2_450_000n,
    dateLabel: "۱۴۰۴/۰۳/۱۵",
    status: "paid",
  },
  {
    id: "2",
    orderNumber: "ARB-14042737",
    customerName: "محمد رضایی",
    customerInitial: "م",
    amountToman: 890_000n,
    dateLabel: "۱۴۰۴/۰۳/۱۵",
    status: "pending",
  },
  {
    id: "3",
    orderNumber: "ARB-14042736",
    customerName: "نیما کریمی",
    customerInitial: "ن",
    amountToman: 5_120_000n,
    dateLabel: "۱۴۰۴/۰۳/۱۴",
    status: "shipped",
  },
  {
    id: "4",
    orderNumber: "ARB-14042735",
    customerName: "زهرا موسوی",
    customerInitial: "ز",
    amountToman: 1_200_000n,
    dateLabel: "۱۴۰۴/۰۳/۱۴",
    status: "cancelled",
  },
  {
    id: "5",
    orderNumber: "ARB-14042734",
    customerName: "امیر حسینی",
    customerInitial: "ا",
    amountToman: 3_750_000n,
    dateLabel: "۱۴۰۴/۰۳/۱۳",
    status: "paid",
  },
  {
    id: "6",
    orderNumber: "ARB-14042733",
    customerName: "فاطمه نوری",
    customerInitial: "ف",
    amountToman: 640_000n,
    dateLabel: "۱۴۰۴/۰۳/۱۳",
    status: "shipped",
  },
  {
    id: "7",
    orderNumber: "ARB-14042732",
    customerName: "رضا اکبری",
    customerInitial: "ر",
    amountToman: 12_300_000n,
    dateLabel: "۱۴۰۴/۰۳/۱۲",
    status: "paid",
  },
];
