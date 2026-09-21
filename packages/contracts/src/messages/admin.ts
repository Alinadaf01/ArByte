/**
 * لایه‌ی متن پنل ادمین — خروجی T-005، جایگزینِ dictionary موقتِ T-100.
 * بخش زیادی از این متن‌ها (ناوبری، ستون‌های جدول، ...) کپی رابط کاربری
 * ادمین است، نه نقل‌قول مستقیم از برند بوک؛ اما `status` باید دقیقاً با
 * واژه‌نامه‌ی مرکزی سفارش (order.ts / §۲.۳۷) یکی باشد — طبق §۲.۳۸، مفهوم
 * «در انتظار پرداخت» نباید در پنل ادمین با عبارتی متفاوت از سایت مشتری
 * بیان شود. مقادیر قبلی (`ارسال‌شده`, `لغوشده`, ...) با این قاعده مغایر
 * بودند و اینجا اصلاح شدند.
 */

import { orderStatus } from "./order";

export const adminMessages = {
  brand: {
    name: "آربایت",
    panelLabel: "پنل مدیریت",
  },
  nav: {
    mainMenuLabel: "منوی اصلی",
    openMenuLabel: "باز کردن منو",
    closeMenuLabel: "بستن منو",
    groups: {
      sales: "فروش",
      catalog: "کاتالوگ",
      customers: "مشتریان",
      marketing: "بازاریابی",
      system: "سیستم",
    },
    items: {
      dashboard: "داشبورد",
      orders: "سفارش‌ها",
      payments: "پرداخت‌ها",
      shipping: "ارسال",
      returns: "مرجوعی",
      products: "محصولات",
      categories: "دسته‌بندی‌ها",
      specifications: "مشخصات",
      inventory: "موجودی",
      brands: "برندها",
      users: "کاربران",
      reviews: "نظرات",
      messages: "پیام‌ها",
      campaigns: "کمپین‌ها",
      coupons: "کوپن‌ها",
      blog: "وبلاگ",
      seo: "سئو",
      roles: "نقش‌ها",
      settings: "تنظیمات",
      notifications: "اعلان‌ها",
      logs: "لاگ",
    },
  },
  serverStatus: {
    label: "وضعیت سرور",
    online: "آنلاین",
  },
  header: {
    searchLabel: "جستجو",
    searchPlaceholder: "جستجو در سفارش‌های این صفحه...",
    searchHint: "بر اساس شماره سفارش یا نام مشتری",
    searchClearLabel: "پاک کردن جستجو",
    notificationsLabel: "اعلان‌ها",
    notificationsEmpty: "اعلان جدیدی نیست.",
    profileLabel: "پروفایل",
    profileName: "علی محمدی",
    profileRole: "مدیر ارشد",
    profileSettings: "پروفایل و تنظیمات",
    profileLogout: "خروج از حساب",
  },
  dashboard: {
    title: "داشبورد",
    subtitle: "خوش آمدید، مدیر سیستم",
  },
  kpi: {
    revenue: { label: "درآمد ماهانه" },
    orders: { label: "سفارش جدید" },
    customers: { label: "کاربران فعال" },
    conversion: { label: "نرخ تبدیل" },
  },
  recentOrders: {
    title: "سفارش‌های اخیر",
    subtitle: "به‌روزرسانی لحظه‌ای",
  },
  table: {
    columns: {
      orderId: "شماره سفارش",
      customer: "مشتری",
      amount: "مبلغ",
      date: "تاریخ",
      status: "وضعیت",
      actions: "عملیات",
    },
    tabs: {
      all: "همه",
      paid: orderStatus.paymentConfirmed,
      pending: orderStatus.awaitingPayment,
      shipped: orderStatus.shipped,
      cancelled: orderStatus.cancelled,
    },
    density: {
      label: "تراکم",
      comfortable: "راحت",
      compact: "فشرده",
    },
    empty: "موردی یافت نشد.",
    viewLabel: "مشاهده",
    moreLabel: "عملیات بیشتر",
    selectAllLabel: "انتخاب همه ردیف‌ها",
    selectRowLabel: "انتخاب ردیف",
    selectedCountSuffix: "ردیف انتخاب شد",
    pagination: {
      prevLabel: "صفحه‌ی قبل",
      nextLabel: "صفحه‌ی بعد",
      pageWord: "صفحه‌ی",
      ofWord: "از",
    },
  },
  /** دقیقاً همان واژه‌نامه‌ی order.ts — طبق §۲.۳۸ اینجا کپی نمی‌شود. */
  status: {
    paid: orderStatus.paymentConfirmed,
    pending: orderStatus.awaitingPayment,
    shipped: orderStatus.shipped,
    cancelled: orderStatus.cancelled,
  },
  settings: {
    title: "تنظیمات",
    subtitle: "پیکربندی پنل و حساب",
    account: {
      title: "حساب کاربری",
      nameLabel: "نام",
      emailLabel: "ایمیل",
      saveLabel: "ذخیره تغییرات",
      savedLabel: "ذخیره شد",
    },
    notifications: {
      title: "اعلان‌ها",
      items: {
        orderEmail: "ایمیل سفارش جدید",
        securitySms: "پیامک امنیتی",
        newsletter: "خبرنامه",
        weeklyReport: "گزارش هفتگی",
      },
    },
  },
} as const;
