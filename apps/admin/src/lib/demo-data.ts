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
  /** تاریخ میلادی خام — نمایش شمسی با formatDateFa در محل رندر انجام می‌شود. */
  date: Date;
  status: "paid" | "pending" | "shipped" | "cancelled";
}

export interface DemoNotification {
  title: string;
  detail: string;
  time: string;
}

export const DEMO_NOTIFICATIONS: DemoNotification[] = [
  {
    title: "سفارش جدید",
    detail: "سفارش #ARB-14042738 ثبت شد",
    time: "۲ دقیقه پیش",
  },
  {
    title: "هشدار موجودی",
    detail: "موجودی «MSI Titan 18 HX» کم شد",
    time: "۱ ساعت پیش",
  },
];

export const DEMO_ORDERS: DemoOrder[] = [
  {
    id: "1",
    orderNumber: "ARB-14042738",
    customerName: "سارا احمدی",
    customerInitial: "س",
    amountToman: 2_450_000n,
    date: new Date(2025, 5, 5, 12, 0, 0),
    status: "paid",
  },
  {
    id: "2",
    orderNumber: "ARB-14042737",
    customerName: "محمد رضایی",
    customerInitial: "م",
    amountToman: 890_000n,
    date: new Date(2025, 5, 5, 12, 0, 0),
    status: "pending",
  },
  {
    id: "3",
    orderNumber: "ARB-14042736",
    customerName: "نیما کریمی",
    customerInitial: "ن",
    amountToman: 5_120_000n,
    date: new Date(2025, 5, 4, 12, 0, 0),
    status: "shipped",
  },
  {
    id: "4",
    orderNumber: "ARB-14042735",
    customerName: "زهرا موسوی",
    customerInitial: "ز",
    amountToman: 1_200_000n,
    date: new Date(2025, 5, 4, 12, 0, 0),
    status: "cancelled",
  },
  {
    id: "5",
    orderNumber: "ARB-14042734",
    customerName: "امیر حسینی",
    customerInitial: "ا",
    amountToman: 3_750_000n,
    date: new Date(2025, 5, 3, 12, 0, 0),
    status: "paid",
  },
  {
    id: "6",
    orderNumber: "ARB-14042733",
    customerName: "فاطمه نوری",
    customerInitial: "ف",
    amountToman: 640_000n,
    date: new Date(2025, 5, 3, 12, 0, 0),
    status: "shipped",
  },
  {
    id: "7",
    orderNumber: "ARB-14042732",
    customerName: "رضا اکبری",
    customerInitial: "ر",
    amountToman: 12_300_000n,
    date: new Date(2025, 5, 2, 12, 0, 0),
    status: "paid",
  },
];
