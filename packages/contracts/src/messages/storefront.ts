/**
 * متن پوسته‌ی فروشگاه و چهار صفحه‌ی ایستا (T-200) — عیناً از فایل‌های طراحی
 * (`docs/design/storefront/pages/{SiteHeader,MobileNav,SiteFooter,About,
 * Support,Legal,NotFound}.dc.html`). بازنویسی یا ترجمه‌ی مجدد ممنوع (قاعده‌ی #۲).
 */
import { toPersianDigits } from "../format/digits";

export const siteHeader = {
  logoAlt: "آربایت",
  /** E-01 §۱ — aria-label لینک لوگو، نه صرفاً alt تصویر. */
  homeLinkLabel: "آربایت — صفحه اصلی",
  nav: {
    products: "محصولات",
    categories: "دسته‌بندی‌ها",
    blog: "بلاگ",
    about: "درباره ما",
    support: "پشتیبانی",
  },
  megaMenu: {
    compareTitle: "مقایسه محصولات",
    compareSubtitle: "تا سه دستگاه کنار هم",
  },
  search: "جستجو",
  wishlist: "علاقه‌مندی‌ها",
  account: "ورود به حساب",
  cart: "سبد خرید",
  mobileMenuOpen: "باز کردن منو",
  mobileMenuClose: "بستن منو",
  drawer: {
    loginTitle: "ورود یا ثبت‌نام",
    loginSubtitle: "با کد پیامکی، بدون رمز",
    sectionShop: "خرید",
    allProducts: "همه محصولات",
    categories: "دسته‌بندی‌ها",
    compareProducts: "مقایسه محصولات",
    wishlist: "علاقه‌مندی‌ها",
    sectionSupport: "پشتیبانی",
    trackOrder: "پیگیری سفارش",
    contactSupport: "تماس با پشتیبانی",
    legal: "قوانین و سوالات",
    sectionArbyte: "آربایت",
    blog: "بلاگ",
    about: "درباره ما",
    onlineSupport: (hours: string) => `پشتیبانی آنلاین ${hours}`,
  },
} as const;

export const mobileNavBar = {
  ariaLabel: "ناوبری اصلی موبایل",
  home: "خانه",
  categories: "دسته‌ها",
  search: "جستجو",
  cart: "سبد",
  account: "حساب",
} as const;

export const siteFooter = {
  logoAlt: "آربایت",
  tagline:
    "فروشگاه لپ‌تاپ و سخت‌افزار حرفه‌ای. هر دستگاه پیش از ارسال تست می‌شود و با گارانتی رسمی به دست شما می‌رسد.",
  social: {
    instagram: "اینستاگرام",
    telegram: "تلگرام",
    whatsapp: "واتساپ",
    youtube: "یوتیوب",
  },
  shopColumn: {
    title: "خرید",
    gamingLaptop: "لپ‌تاپ گیمینگ",
    proLaptop: "لپ‌تاپ حرفه‌ای",
    monitor: "مانیتور و نمایشگر",
    accessories: "لوازم جانبی",
  },
  supportColumn: {
    title: "پشتیبانی",
    faq: "سوالات متداول",
    trackOrder: "پیگیری سفارش",
    warranty: "شرایط گارانتی",
    onlineChat: "ثبت درخواست پشتیبانی",
  },
  /** G-01 — ایمیل/تلفن/نشانی از SiteSettings (`/content/site-info`)، نه این‌جا. */
  contactColumn: {
    title: "تماس با ما",
  },
  mobile: {
    callButton: "تماس",
    onlineChatButton: "پشتیبانی",
  },
  legalLinks: {
    terms: "قوانین و مقررات",
    privacy: "حریم خصوصی",
  },
  copyright: "© ۱۴۰۴ آربایت. تمام حقوق محفوظ است.",
} as const;

/**
 * G-01 — متن‌های محتوایی «درباره ما» (داستان، اصول، خط زمانی، تیم) از پنل
 * می‌آیند (`GET /content/about`)؛ این‌جا فقط برچسب‌های رابط. آمار از
 * `storeFacts.stats`. متن نمونه‌ی طراحی (سال تأسیس، تعداد تیم، …) حذف شد.
 */
export const aboutPage = {
  breadcrumb: { home: "خانه", current: "درباره ما" },
  hero: { imageAlt: "میز تست آربایت" },
  metaDescription:
    "آشنایی با آربایت: فروشگاه لپ‌تاپ و سخت‌افزار که هر دستگاه را پیش از ارسال تست می‌کند.",
  team: { contactCta: "تماس با تیم" },
  closingCta: {
    title: "هنوز مطمئن نیستید کدام دستگاه؟",
    body: "بگویید با دستگاه چه کار می‌کنید تا کارشناس ما گزینه‌های مناسب را پیشنهاد دهد.",
    primary: "گفت‌وگو با کارشناس",
    secondary: "انتخاب بر اساس کاربری",
  },
} as const;

export const supportPage = {
  breadcrumb: { home: "خانه", current: "پشتیبانی" },
  title: "پشتیبانی آربایت",
  /** متا/پیش‌نمایش؛ متن صفحه با ساعت واقعی پنل از `subtitleWithHours` است. */
  subtitle:
    "کارشناس‌های آربایت در ساعات کاری پاسخ‌گو هستند. برای پیگیری سفارش، شماره سفارش را آماده داشته باشید.",
  subtitleWithHours: (hours: string) =>
    `کارشناس‌ها ${hours} در دسترس‌اند. برای پیگیری سفارش، شماره سفارش را آماده داشته باشید.`,
  channels: {
    request: { title: "ثبت درخواست", meta: "پاسخ در ساعات کاری" },
    call: { title: "تماس تلفنی" },
    trackOrder: { title: "پیگیری سفارش", meta: "با شماره سفارش" },
    faq: { title: "سوالات متداول", meta: "پاسخ‌های آماده" },
  },
  form: {
    title: "ثبت درخواست",
    subtitle: "فرم را پر کنید؛ کارشناس مربوطه در ساعات کاری پاسخ می‌دهد.",
    topicLabel: "موضوع درخواست",
    topics: [
      {
        label: "پیش از خرید",
        hint: "پیش از خرید مشاوره می‌خواهید؟ بنویسید با دستگاه چه کاری می‌کنید و بودجه‌تان چقدر است.",
        placeholder: "مثلاً: برای تدوین ۴K بودجه ۲۰۰ میلیون دارم، کدام دستگاه؟",
        needsOrder: false,
      },
      {
        label: "سفارش و ارسال",
        hint: "برای پیگیری سریع‌تر، شماره سفارش را وارد کنید.",
        placeholder: "مثلاً: سفارشم سه روز است در وضعیت آماده‌سازی مانده.",
        needsOrder: true,
      },
      {
        label: "گارانتی و خدمات",
        hint: "سریال دستگاه در پنل کاربری شما ثبت شده است.",
        placeholder: "مثلاً: کیبورد دستگاه از دیروز یک کلید نمی‌زند.",
        needsOrder: true,
      },
      {
        label: "ارتقای رم و SSD",
        hint: "نصب رم و SSD روی دستگاه خریداری‌شده رایگان انجام می‌شود.",
        placeholder: "مثلاً: می‌خواهم رم Titan را به ۱۲۸ گیگ برسانم.",
        needsOrder: true,
      },
      {
        label: "خرید سازمانی",
        hint: "برای سفارش بالای پنج دستگاه، پیش‌فاکتور رسمی صادر می‌کنیم.",
        placeholder: "مثلاً: ۸ لپ‌تاپ حرفه‌ای برای تیم طراحی نیاز داریم.",
        needsOrder: false,
      },
    ] as const,
    nameLabel: "نام و نام خانوادگی",
    namePlaceholder: "مثلاً سارا محمودی",
    phoneLabel: "شماره موبایل",
    phonePlaceholder: "09120000000",
    orderLabel: "شماره سفارش",
    orderPlaceholder: "ARB-14042738",
    messageLabel: "شرح درخواست",
    submit: "ارسال درخواست",
    submitted: "درخواست ثبت شد ✓",
    noteDefault: "پاسخ در ساعات کاری داده می‌شود.",
    noteInvalid: "نام، شماره موبایل معتبر و شرح حداقل ۱۰ حرفی لازم است.",
    noteSent: (code: string) => `کد پیگیری درخواست: ${code}`,
    noteError: "ارسال ناموفق بود؛ لطفاً دوباره تلاش کنید.",
    noteRateLimited: "تعداد درخواست‌ها زیاد است؛ کمی بعد دوباره تلاش کنید.",
    sending: "در حال ارسال…",
  },
  hours: {
    title: "ساعات پاسخ‌گویی",
    everyDay: "همه‌روزه",
    range: (from: string, to: string) => `${from} تا ${to}`,
    outsideHours:
      "خارج از این ساعات پیام بگذارید؛ اول وقت کاری بعد پاسخ می‌دهیم.",
  },
  b2b: {
    title: "خرید سازمانی",
    body: "برای سفارش‌های بالای پنج دستگاه، قیمت و شرایط پرداخت جداگانه تعریف می‌شود.",
  },
} as const;

export const legalPage = {
  breadcrumb: { home: "خانه", current: "قوانین و سوالات" },
  title: "قوانین و سوالات",
  subtitle:
    "شرایط خرید، گارانتی، مرجوعی و حریم خصوصی، کنار پاسخ پرسش‌های پرتکرار.",
  lastUpdated: (date: string) => `آخرین به‌روزرسانی: ${date}`,
  sections: { faq: "سوالات متداول" },
  faqSearch: {
    placeholder: "جستجو در سوالات",
    ariaLabel: "جستجو در سوالات",
    noResultsTitle: "پاسخی پیدا نشد",
    noResultsBody:
      "سوال خود را از پشتیبانی بپرسید؛ معمولاً کمتر از دو ساعت کاری جواب می‌دهیم.",
    noResultsCta: "پرسیدن از پشتیبانی",
  },
  askSupport: "سوالی دارید؟ بپرسید",
} as const;

/**
 * T-201 — صفحه اصلی. مزیت‌های خرید («Guarantees») چهار مورد ثابت‌اند
 * (واقعیت برند، نه محتوای HomepageBlock تک‌به‌تک قابل‌ویرایش)، عیناً از
 * `docs/design/storefront/pages/Home.dc.html` بخش Guarantees رونویسی
 * شده‌اند.
 */
/**
 * T-211 §۲ — هیروی اسکرولی صفحه اصلی، عیناً از `Home.dc.html`.
 * ⚠️ یک اصلاح عمدی (§۲، هشدار صریح تسک): زیرمتن طراحی «...و سریالش ثبت
 * می‌شود» می‌گفت؛ سیستم سریال نداریم، پس حذف شد — نه رونویسی نادرست.
 */
export const homeHero = {
  badgeNew: "جدید",
  badgeText: "چهار مدل تازه",
  title: "فناوری با ظرافت",
  subtitle:
    "چهار لپ‌تاپ که کارشناسان آربایت انتخاب کرده‌اند. هر دستگاه پیش از ارسال تست می‌شود.",
  scrollHint: "اسکرول کنید",
  loadingLabel: (percent: string) => `بارگذاری ${percent}٪`,
  readyLabel: "آماده",
  expertPickLabel: "انتخاب کارشناسان آربایت",
  modelOf: (current: string, total: string) => `مدل ${current} از ${total}`,
  viewModelsCta: "مشاهده مدل‌ها",
  consultCta: "مشاوره انتخاب",
  steps: [
    {
      title: "کالای اصل، با گارانتی رسمی",
      label: "اصالت",
    },
    {
      title: "قدرت پردازش، بی‌صدا",
      label: "عملکرد",
    },
    {
      title: "نمایشگری که چشم را خسته نمی‌کند",
      label: "نمایشگر",
    },
    {
      title: "ارسال سریع، پشتیبانی واقعی",
      label: "خرید",
    },
  ],
} as const;

/**
 * T-211 §۳ — بخش دسته‌ها (آکاردئون پنج‌کاشی)، Home.dc.html خط ~۱۷۵.
 * برای شمارش محصول از `categoriesPage.productCount` استفاده می‌شود، نه
 * تکرار همان رشته اینجا.
 */
export const homeCategories = {
  title: "دسته‌بندی محصولات",
  subtitle: "نشانگر را روی هر دسته ببرید تا باز شود.",
  viewAll: "همه دسته‌ها",
  viewCategoryCta: "مشاهده دسته",
} as const;

/**
 * T-211 §۴ — دو پرچم‌دار، Home.dc.html خط ~۲۶۸. `taglines` به‌ترتیب همان
 * `productSlugs` بلوک FLAGSHIP_DUEL است (seed.ts: [MSI, ASUS]) — تاپل، نه
 * آبجکت با کلید محصول، چون تگ‌لاین‌ها خودشان به محصول خاص وابسته نیستند
 * (اگر محصول عوض شود، این متن‌ها هم باید دستی بازبینی شوند).
 */
export const homeFlagships = {
  title: "دو پرچم‌دار، یک انتخاب",
  switchHint: "با دکمه‌های پایین جابه‌جا کنید",
  taglines: ["سلطه کامل، بی‌صدا", "پیروزی، شتاب‌گرفته"] as [string, string],
  viewAndBuyCta: "مشاهده و خرید",
  fullSpecsCta: "مشخصات کامل",
} as const;

/**
 * T-212 §۴ — جامعه آربایت (نقشه)، Home.dc.html خط ~۶۶۱.
 * ⚠️ اصلاح اجباری — متن طراحی «انبار تهران... هفت مرکز استانی» می‌گفت؛
 * آربایت «مرکز استانی» ندارد، فقط از تهران ارسال می‌کند. عدد روزهای
 * تحویل تابعی از `storeFacts` می‌گیرد، نه رشته‌ی ثابت.
 */
export const homeCommunity = {
  badge: "جامعه آربایت",
  title: "کسانی که اینجا خرید کردند",
  description: (tehranDays: string, provinceRange: string) =>
    `سفارش‌ها از تهران ارسال می‌شوند. تحویل در تهران ${tehranDays} روز کاری و در شهرستان ${provinceRange} روز کاری است.`,
  statLabels: {
    deliveredOrders: "سفارش تحویل‌شده",
    satisfactionPercent: "رضایت از خرید",
    activeSinceYear: "آغاز فعالیت",
  },
  legendHub: "تهران",
  legendDelivery: (provinceRange: string) => `تحویل ${provinceRange} روز کاری`,
} as const;

/** T-212 §۲ — مجله («پیش از خرید، بخوانید»)، Home.dc.html خط ~۴۲۲. */
export const homeJournal = {
  badge: "بلاگ آربایت",
  title: "پیش از خرید، بخوانید",
  subtitle: "راهنماها و بررسی‌هایی که کارشناسان آربایت می‌نویسند.",
  hintDesktop: "اسکرول کنید تا باز شوند؛ نشانگر را روی هر کارت ببرید.",
  hintMobile: "برای دیدن پشت هر کارت روی آن بزنید.",
  viewAllCta: "همه نوشته‌ها",
  readMinutes: (n: string) => `${n} دقیقه مطالعه`,
  readCta: "خواندن مقاله ←",
} as const;

/** T-212 §۱ — «محصولات منتخب»، Home.dc.html خط ~۳۵۷. */
export const homeFeatured = {
  viewShopCta: "مشاهده فروشگاه",
  expertPickBadge: "انتخاب کارشناسان",
  testedHint: "تست‌شده و آماده ارسال",
  fullDetailsCta: "جزئیات کامل",
} as const;

export const homePage = {
  categoriesTitle: "دسته‌بندی محصولات",
  categoriesViewAll: "همه دسته‌ها",
  featuredTitle: "محصولات منتخب",
  /**
   * T-212 §۵ — اعداد به‌جای رشته‌ی ثابت، تابعی روی مقدار `storeFacts`
   * می‌گیرند (اگر سیاست عوض شود، این متن هم خودکار درست می‌ماند).
   */
  benefits: {
    warranty: {
      title: "گارانتی رسمی",
      description: "کارت گارانتی همراه دستگاه",
    },
    freeShipping: {
      title: "ارسال رایگان",
      description: (minMillions: string) =>
        `خرید بالای ${minMillions} میلیون تومان`,
    },
    sevenDayReturn: {
      title: (days: string) => `${days} روز مرجوعی`,
      description: "هزینه بازگشت با ماست",
    },
    /** T-212 §۵ اصلاح اجباری — به‌جای «سریال در پرونده خرید شما» (سیستم سریال نداریم). */
    testedBeforeShipping: {
      title: "تست پیش از ارسال",
      description: "هر دستگاه پیش از بسته‌بندی روشن می‌شود",
    },
  },
  blog: {
    title: "از وبلاگ آربایت",
    emptyTitle: "هنوز مطلبی منتشر نشده",
    emptyDescription: "به‌زودی راهنما و مقایسه محصولات را اینجا می‌بینید.",
  },
  /** T-212 §۵ — بنر پیگیری سفارش، بالای کاشی‌های تضمین‌ها. */
  trackOrderBanner: {
    text: "سفارش داده‌اید؟ بدون ورود به حساب، با شماره سفارش وضعیتش را ببینید.",
    cta: "پیگیری سفارش",
  },
} as const;

/**
 * T-202 §۲.۱ / T-213 §۸ — صفحه‌ی `/categories`. متن `Categories.dc.html` عدد
 * ثابت («هفت دسته») در خودش دارد که با داده‌ی واقعی هم‌خوان نیست — این نسخه
 * تعداد واقعی دسته‌ها را جای‌گذاری می‌کند، نه رونویسی نادرست از طراحی.
 */
export const categoriesPage = {
  breadcrumb: { home: "خانه", current: "دسته‌بندی‌ها" },
  title: "از کجا شروع کنیم؟",
  subtitle: (categoryCount: number) =>
    `${toPersianDigits(categoryCount)} دسته، هر کدام با محدوده قیمت و تعداد موجودی واقعی.`,
  /** «۶ محصول» — بند ۲.۱۵، عدد فارسی چون متن نمایشی عمومی است. */
  productCount: (count: number) => `${toPersianDigits(count)} محصول`,
  /**
   * T-213 §۸ — کارت بزرگ بالای گرید. طراحی برچسب «پرفروش‌ترین دسته» دارد که
   * داده‌ی فروش واقعی نداریم تا اثباتش کنیم؛ به‌جایش آمار واقعی («بیشترین
   * موجودی» از productCount) — ر.ک. QUESTIONS.md.
   */
  featuredBadge: "بیشترین موجودی",
  featuredCta: "مشاهده دسته",
  priceFromLabel: (millions: string) => `از ${millions} میلیون`,
  /**
   * T-213 §۸ — سوییچر «نمی‌دانید کدام دسته؟». متن توصیفی عیناً از طراحی؛ عدد
   * دستگاه هر گزینه (مثلاً «۲۴ دستگاه گیمینگ») ساختگی بود و حذف شده — ر.ک.
   * QUESTIONS.md. `href` هر گزینه در E-01 §۵ اضافه شد (جدول Q-11 سند تسک).
   */
  useCaseSwitcher: {
    title: "نمی‌دانید کدام دسته؟",
    subtitle:
      "بگویید دستگاه را برای چه کاری می‌خواهید تا فهرست را بر همان اساس ببندیم.",
    cta: "مشاهده فروشگاه",
  },
  useCases: [
    {
      label: "بازی",
      description:
        "لپ‌تاپ گیمینگ با نمایشگر بالای ۱۶۵ هرتز و گرافیک سری ۴۰۷۰ به بالا. بودجه پیشنهادی از ۱۵۰ میلیون.",
      href: "/category/gaming-pc",
    },
    {
      label: "رندر و تدوین",
      description:
        "نمایشگر کالیبره، رم ۳۲ گیگ به بالا و ذخیره‌سازی دو ترابایتی. تدوین چهارکی بدون افت فریم.",
      href: "/category/laptop-new?sort=price_desc",
    },
    {
      label: "برنامه‌نویسی",
      description:
        "رم زیاد و کیبورد راحت مهم‌تر از گرافیک است. اولترابوک‌های ۱۶ اینچی با ۳۲ گیگ رم گزینه درست‌اند.",
      href: "/category/laptop-open-box",
    },
    {
      label: "دانشجویی",
      description:
        "زیر ۶۰ میلیون، با باتری بلند و وزن کم برای بردن به دانشگاه. گارانتی و خدمات پس از فروش کامل.",
      href: "/category/laptop-stock?sort=price_asc",
    },
    {
      label: "سفر و جلسه",
      description:
        "زیر ۱٫۳ کیلوگرم، باتری بالای ۱۲ ساعت و شارژ با USB-C. برای جلسه و پرواز طولانی.",
      href: "/category/surface",
    },
  ],
} as const;

/**
 * T-213 — فروشگاه (`/products` و `/category/[slug]`، یک کامپوننت صفحه).
 * عیناً از `Products.dc.html`؛ فیلتر «شرایط کالا» طبق §۰ سند تسک از UI
 * حذف شده (دسته‌ها خودشان شرایط‌اند: آکبند/اپن‌باکس/استوک).
 */
export const productsPage = {
  breadcrumbHome: "خانه",
  breadcrumbShop: "فروشگاه",
  title: "فروشگاه آربایت",
  subtitle:
    "هر دستگاه پیش از ارسال روشن و تست می‌شود. قیمت‌ها روزانه به‌روز می‌شوند و موجودی لحظه‌ای است.",
  /** بخش تیره‌ی عدد و برچسب استایل جدا دارند (طراحی)؛ برای همین دو کلید جداست، نه یک تابع. */
  deviceLabel: "دستگاه",
  categoryLabel: "دسته‌بندی",
  allCategories: "همه",
  brandLabel: "برند",
  maxPriceLabel: "حداکثر قیمت",
  maxPriceAriaLabel: "حداکثر قیمت به میلیون تومان",
  upToLabel: (millions: string) => `تا ${millions} تومان`,
  millionShort: "م",
  onlyInStockLabel: "فقط کالاهای موجود",
  clearFiltersCta: "پاک کردن فیلترها",
  clearCta: "پاک کردن",
  resultCount: (count: string) => `${count} نتیجه`,
  filtersButton: "فیلترها",
  activeFilterCount: (count: string) => `${count} فیلتر فعال`,
  noActiveFilters: "همه دستگاه‌ها",
  showResultsCta: (count: string) => `نمایش ${count} نتیجه`,
  filterSheetTitle: "فیلترها",
  emptyTitle: "دستگاهی با این فیلترها نداریم",
  emptyDescription: "سقف قیمت را بالا ببرید یا یک برند دیگر را هم انتخاب کنید.",
  emptyCta: "نمایش همه دستگاه‌ها",
} as const;

/** T-202 §۲.۲ — صفحه‌ی `/category/[slug]`. */
export const categoryDetailPage = {
  breadcrumbHome: "خانه",
  breadcrumbCategories: "دسته‌بندی‌ها",
  resultCount: (count: number) => `${toPersianDigits(count)} نتیجه`,
  sortLabel: "مرتب‌سازی",
  sortOptions: {
    newest: "جدیدترین",
    price_asc: "ارزان‌ترین",
    price_desc: "گران‌ترین",
    popular: "محبوب‌ترین",
    /** T-213 §۶ — پیش‌فرض فروشگاه؛ Products.dc.html خط ۱۲۹. */
    featured: "پیشنهاد آربایت",
  },
  paginationPrevious: "قبلی",
  paginationNext: "بعدی",
} as const;

/**
 * T-214 — صفحه‌ی `/products/[slug]` (`Product.dc.html`). دو حذف عمدی طبق
 * هشدار صریح سند تسک: بدون «یا X در ۱۲ قسط» (اقساط نداریم، T-149) و بدون
 * «موجود در انبار تهران» (بدون بُعد مکانی موجودی — به‌جایش `availabilityLabel()`
 * از `lib/labels.ts`). تایل سوم اعتماد («تست پیش از ارسال») همان اصلاحِ
 * T-212 است (`homePage.benefits.testedBeforeShipping`) — رونویسی از طراحی
 * («سریال در پرونده») ادعای بدون پشتیبان بود.
 */
export const productDetailPage = {
  configLabel: "پیکربندی",
  decreaseQtyAriaLabel: "کم کردن",
  increaseQtyAriaLabel: "اضافه کردن",
  addToCartCta: "افزودن به سبد خرید",
  addedToCartCta: "در سبد خرید",
  addToWishlistAriaLabel: "افزودن به علاقه‌مندی‌ها",
  removeFromWishlistAriaLabel: "حذف از علاقه‌مندی‌ها",
  toastAddedLabel: (deviceCountLabel: string) =>
    `${deviceCountLabel} به سبد اضافه شد`,
  toastDeviceCount: (qtyFa: string) => `${qtyFa} دستگاه`,
  viewCartCta: "دیدن سبد",
  tabs: {
    specs: "مشخصات فنی",
    review: "بررسی آربایت",
    warrantyShipping: "گارانتی و ارسال",
  },
  trustTiles: {
    warrantyTitle: (months: string) => `${months} ماه گارانتی`,
    replacementSubtitle: "تعویض سه‌روزه",
    freeShippingTitle: "ارسال رایگان",
    /** طبق storeFacts.policies.tehranDeliveryDays فعلی (۱ روز = «فردا»). */
    tehranSubtitle: "تهران فردا",
  },
  warrantyPolicy: {
    heading: "گارانتی",
    body: (months: string) =>
      `${months} ماه گارانتی رسمی شرکتی با کارت همراه دستگاه. در ۷۲ ساعت اول، ایراد سخت‌افزاری یعنی تعویض کامل دستگاه، نه تعمیر.`,
  },
  shippingPolicy: {
    heading: "ارسال",
    body: (
      cutoffHour: string,
      tehranDays: string,
      provinceMin: string,
      provinceMax: string,
    ) =>
      `سفارش تا ساعت ${cutoffHour} همان روز ارسال می‌شود. تهران ${tehranDays} روز کاری، شهرستان ${provinceMin} تا ${provinceMax} روز کاری.`,
    freeShippingNote: "برای این دستگاه ارسال رایگان است.",
  },
  returnPolicy: {
    heading: "مرجوعی",
    body: (days: string) =>
      `تا ${days} روز پس از تحویل، با جعبه و لوازم کامل، بدون نیاز به دلیل. هزینه بازگشت با ماست.`,
  },
  relatedTitle: "گزینه‌های هم‌رده",
  relatedViewAllCta: (categoryName: string) => `همه ${categoryName}`,
} as const;

/**
 * T-215 §۱ — `/search`. طبق §۰ سند تسک: تب «نوشته‌ها» چون API وبلاگ نداریم
 * پنهان است (Q). چیپ‌های پرتکرار فهرست ثابت خودِ سند تسک‌اند، نه رونویسی
 * از طراحی (طراحی «مانیتور OLED»/«کد تخفیف» دارد که محصول ما نیست — Q).
 * نمایه‌ی راهنما = صفحات ثابت؛ سوالات متداول از پنل در خود صفحه‌ی جستجو اضافه می‌شوند.
 */
export const searchPage = {
  inputPlaceholder: "نام محصول، برند یا مثلاً «لپ‌تاپ ۱۸ اینچ»",
  inputAriaLabel: "جستجو در آربایت",
  clearAriaLabel: "پاک کردن جستجو",
  idleSummary: "عبارتی بنویسید تا در محصولات و راهنماها جستجو کنیم.",
  resultsSummary: (count: string, q: string) => `${count} نتیجه برای «${q}»`,
  kindTabs: {
    all: "همه",
    products: "محصولات",
    posts: "نوشته‌ها",
    support: "راهنما و پشتیبانی",
  },
  hotSearchesTitle: "جستجوهای پرتکرار",
  hotSearches: [
    "لپ‌تاپ آکبند",
    "لپ‌تاپ استوک",
    "سرفیس",
    "کیس گیمینگ",
    "MSI",
    "ASUS ROG",
  ] as const,
  suggestion: {
    title: "نمی‌دانید دنبال چه بگردید؟",
    subtitle:
      "بر اساس کاربری انتخاب کنید یا بگذارید کارشناس ما دو سه گزینه پیشنهاد بدهد.",
    categoriesCta: "انتخاب بر اساس کاربری",
    supportCta: "پرسیدن از کارشناس",
  },
  emptyState: {
    title: (q: string) => `برای «${q}» چیزی پیدا نشد`,
    body: "املای عبارت را بررسی کنید، یا یکی از این جستجوها را امتحان کنید.",
    supportCta: "پرسیدن از پشتیبانی",
  },
  productsHeading: "محصولات",
  productsViewAllCta: "همه محصولات",
  helpHeading: "راهنما و پشتیبانی",
  postsHeading: "نوشته‌ها",
  postsViewAllCta: "همه نوشته‌ها",
  resultCount: (count: string) => `${count} نتیجه`,
  helpIndex: [
    {
      title: "پیگیری سفارش",
      description: "وضعیت لحظه‌ای سفارش با شماره سفارش",
      tag: "پشتیبانی",
      href: "/track-order",
    },
    {
      title: "شرایط گارانتی",
      description: "مدت، تعویض سه‌روزه و موارد خارج از پوشش",
      tag: "قوانین",
      href: "/legal",
    },
    {
      title: "تماس با پشتیبانی",
      description: "گفت‌وگوی آنلاین یا تماس تلفنی با کارشناس",
      tag: "پشتیبانی",
      href: "/support",
    },
    {
      title: "قوانین و مقررات",
      description: "شرایط خرید، حریم خصوصی و مرجوعی",
      tag: "قوانین",
      href: "/legal",
    },
  ],
} as const;

/**
 * T-215 §۲ — `/compare`. ردیف‌های مشخصات عیناً از `Compare.dc.html`؛ نشان
 * «ارزش خرید بهتر» و یادداشت «اعداد از تست‌های داخلی...» طبق هشدار صریح
 * سند تسک حذف شدند (مبنای محاسبه/تستی نداریم).
 */
export const comparePage = {
  breadcrumbHome: "خانه",
  breadcrumbShop: "فروشگاه",
  breadcrumbCurrent: "مقایسه",
  title: "مقایسه دستگاه‌ها",
  subtitle:
    "تا سه دستگاه را کنار هم بگذارید. در هر ردیف، مقدار بهتر با نشان بنفش مشخص می‌شود.",
  diffOnlyLabel: "فقط تفاوت‌ها",
  removeAriaLabel: "حذف از مقایسه",
  viewAndBuyCta: "مشاهده و خرید",
  addDeviceCta: "افزودن دستگاه",
  addDevicePickerPlaceholder: "نام محصول را جستجو کنید",
  addDevicePickerEmpty: "محصولی پیدا نشد",
  emptyState: {
    title: "چیزی برای مقایسه نمانده",
    body: "از فروشگاه دو یا سه دستگاه انتخاب کنید تا کنار هم ببینید.",
    resetCta: "برگرداندن مقایسه",
  },
  rowLabels: {
    price: "قیمت",
    cpu: "پردازنده",
    gpu: "گرافیک",
    ram: "رم",
    storage: "حافظه SSD",
    display: "نمایشگر",
    refreshRate: "نرخ نوسازی",
    weight: "وزن",
    battery: "باتری در کار سبک",
    fanNoise: "صدای فن زیر بار",
    ports: "پورت‌ها",
    warranty: "گارانتی",
  },
} as const;

/**
 * T-215 §۳ — `/wishlist`. «اطلاع از موجودی» طبق T-213 حذف است (Q)؛ برای
 * کالای ناموجود فقط دکمه‌ی سبد غیرفعال می‌شود.
 */
export const wishlistPage = {
  breadcrumbHome: "خانه",
  breadcrumbAccount: "حساب کاربری",
  breadcrumbCurrent: "علاقه‌مندی‌ها",
  title: "علاقه‌مندی‌ها",
  /** بخش تیره‌ی عدد و برچسب استایل جدا دارند (طراحی)؛ برای همین دو کلید جداست، نه یک تابع. */
  itemsLabel: "کالا",
  introWithDrops: (count: string) =>
    `قیمت ${count} کالا از زمانی که ذخیره کردید پایین آمده است.`,
  introNoDrops:
    "کالاهایی که ذخیره کرده‌اید، همراه با تغییر قیمت و وضعیت موجودی.",
  dropNote:
    "تغییر قیمت هر کالا نسبت به روزی که آن را ذخیره کرده‌اید محاسبه می‌شود.",
  addAllCta: "افزودن همه موجودها به سبد",
  addAllDoneCta: "به سبد اضافه شد",
  clearCta: "خالی کردن فهرست",
  removeAriaLabel: "حذف از علاقه‌مندی‌ها",
  addToCartCta: "افزودن به سبد",
  addedToCartCta: "در سبد خرید",
  priceTrend: {
    down: (percent: string) => `${percent}٪ ارزان‌تر نسبت به زمان ذخیره`,
    up: (percent: string) => `${percent}٪ گران‌تر شده`,
    same: "قیمت بدون تغییر",
  },
  removedNote: "دیگر در فروشگاه نیست",
  emptyState: {
    title: "فهرست علاقه‌مندی خالی است",
    body: "روی قلب کنار هر محصول بزنید تا اینجا ذخیره شود و از تغییر قیمتش باخبر شوید.",
    shopCta: "رفتن به فروشگاه",
    restoreCta: "برگرداندن فهرست",
  },
} as const;

export const notFoundPage = {
  badge: "خطای ۴۰۴",
  title: "این صفحه را پیدا نکردیم",
  body: "شاید نشانی را اشتباه وارد کرده‌اید، یا محصولی که دنبالش بودید از فهرست خارج شده است. از اینجا ادامه بدهید:",
  searchPlaceholder: "جستجوی محصول یا راهنما",
  searchAriaLabel: "جستجو در آربایت",
  searchButton: "جستجو",
  primaryCta: "بازگشت به خانه",
  secondaryCta: "رفتن به فروشگاه",
  links: {
    categories: "دسته‌بندی‌ها",
    trackOrder: "پیگیری سفارش",
    blog: "بلاگ",
    support: "پشتیبانی",
  },
} as const;

/** E-02 §۲ — Login.dc.html، عیناً. */
export const loginPage = {
  logoHomeLabel: "بازگشت به صفحه‌ی اصلی آربایت",
  title: {
    phone: "ورود به حساب کاربری",
    otp: "کد تایید را وارد کنید",
  },
  subtitle: {
    phone: "شماره موبایل خود را وارد کنید تا کد ورود برایتان ارسال شود.",
    otp: (digitCount: string) =>
      `کد تایید ${digitCount} رقمی به شماره شما ارسال شد.`,
  },
  phonePrefix: "+۹۸",
  phonePlaceholder: "912 000 0000",
  phoneAriaLabel: "شماره موبایل",
  sendCodeCta: "دریافت کد ورود",
  otpHelperNote: "کد ورود پیامک می‌شود. رمز عبوری لازم نیست.",
  otpAriaLabel: "کد تایید چهار رقمی",
  otpErrorNote: "کد وارد شده درست نیست. دوباره تلاش کنید.",
  verifyCta: {
    idle: "تایید و ورود",
    busy: "در حال بررسی…",
  },
  resendPrompt: "کد را دریافت نکردید؟",
  resendCta: "ارسال مجدد کد",
  resendTimer: (mmss: string) => `امکان ارسال مجدد تا ${mmss}`,
  resendReady: "می‌توانید کد جدید بگیرید",
  editNumberCta: "ویرایش شماره موبایل",
  success: {
    title: "خوش آمدید",
    body: "وارد حساب کاربری خود شدید",
    maskedNote: (masked: string) => `شماره ${masked} تأیید شد`,
    continueCta: "رفتن به پنل کاربری",
    otherNumberCta: "ورود با شماره دیگر",
  },
  legalPrefix: "با ورود،",
  legalConnector: "و",
  legalSuffix: "را می‌پذیرید.",
  legalTermsLink: "قوانین آربایت",
  legalPrivacyLink: "حریم خصوصی",
} as const;

/** E-02 §۳ — Cart.dc.html، عیناً (بدون «برآورد اقساط»، ر.ک. DEVIATIONS.md). */
export const cartPage = {
  breadcrumbHome: "خانه",
  breadcrumbCurrent: "سبد خرید",
  title: "سبد خرید شما",
  lineCountNote: (count: string) =>
    `${count} قلم · قیمت‌ها تا ۲۴ ساعت رزرو می‌ماند`,
  steps: ["سبد خرید", "پرداخت", "ثبت سفارش"] as const,
  emptyState: {
    title: "سبد خرید خالی است",
    body: "هنوز چیزی اضافه نکرده‌اید. از فروشگاه شروع کنید یا سبد قبلی را برگردانید.",
    shopCta: "رفتن به فروشگاه",
    restoreCta: "برگرداندن سبد قبلی",
  },
  removeAriaLabel: "حذف از سبد",
  decreaseAriaLabel: "کم کردن",
  increaseAriaLabel: "اضافه کردن",
  unitPriceLabel: "قیمت واحد",
  unitPriceMultiple: (price: string) => `واحدی ${price}`,
  supportNote:
    "برای ارتقای رم یا SSD پیش از ارسال، با پشتیبانی تماس بگیرید؛ نصب روی دستگاه رایگان انجام می‌شود.",
  supportCta: "تماس با پشتیبانی",
  shippingSectionTitle: "روش ارسال",
  freeLabel: "رایگان",
  couponLabel: "کد تخفیف",
  couponPlaceholder: "کد تخفیف را وارد کنید",
  couponApplyCta: "اعمال",
  couponRemoveCta: "حذف کد",
  couponAppliedNote: (code: string) => `کد ${code} اعمال شد.`,
  couponDefaultNote: "کد تخفیف دارید؟ همین‌جا وارد کنید.",
  subtotalLabel: "جمع کالاها",
  discountLabel: "تخفیف",
  shippingLabel: "هزینه ارسال",
  totalLabel: "مبلغ قابل پرداخت",
  continueCta: "ادامه و پرداخت",
  secureNote: "پرداخت امن از درگاه بانکی",
} as const;

/** E-02 §۴ — Checkout.dc.html، عیناً؛ «یادداشت برای ما» حذف شد (بدون
 * فیلد مدل نگه‌داری‌اش در Order، ساختن آن ادعای دروغ می‌بود — قانون «بدون
 * ادعای بی‌پشتوانه»). فیلد «استان» به فرم آدرس اضافه شد (طراحی نداشت، اما
 * apps/users/models.py's Address آن را الزامی می‌خواهد) — docs/QUESTIONS.md. */
export const checkoutPage = {
  title: "تکمیل خرید",
  steps: ["سبد خرید", "پرداخت", "ثبت سفارش"] as const,
  addressSectionTitle: "آدرس تحویل",
  newAddressCta: { open: "آدرس جدید", close: "بستن فرم" },
  addressDefaultBadge: "پیش‌فرض",
  addressForm: {
    recipientNameLabel: "نام گیرنده",
    recipientNamePlaceholder: "نام و نام خانوادگی",
    mobileLabel: "شماره موبایل",
    mobilePlaceholder: "۰۹۱۲۰۰۰۰۰۰۰",
    provinceLabel: "استان",
    provincePlaceholder: "تهران",
    cityLabel: "شهر",
    cityPlaceholder: "تهران",
    postalCodeLabel: "کد پستی",
    postalCodePlaceholder: "۱۰ رقم",
    addressLineLabel: "نشانی کامل",
    addressLinePlaceholder: "خیابان، کوچه، پلاک و واحد",
    saveCta: "ذخیره آدرس",
  },
  paymentSectionTitle: "روش پرداخت",
  noPaymentMethodsNote: "پرداخت موقتاً در دسترس نیست",
  /**
   * AUDIT-3 §۵/§۱۵ — سه روش. ADDENDUM §C: برچسب «پرداخت آنلاین» می‌ماند ولی
   * توضیح صریح می‌گوید پرداخت در اپلیکیشن «بله» کامل می‌شود (تغییر اپ غافلگیر نکند).
   * مبالغ قالب‌بندی‌شده (`formatPrice`) پاس داده می‌شوند.
   */
  paymentPlans: {
    ONLINE: {
      title: "پرداخت آنلاین",
      description:
        "پرداخت در اپلیکیشن «بله» کامل می‌شود: پس از ثبت سفارش، «باز کردن بله» را بزنید و فاکتور را همان‌جا پرداخت کنید.",
      limitNote: (limit: string) => `تا سقف ${limit}`,
    },
    BANK_TRANSFER: {
      title: "واریز مستقیم به حساب",
      description:
        "مبلغ را به حساب آربایت واریز و تصویر رسید را بارگذاری کنید؛ سفارش پس از تأیید رسید پردازش می‌شود.",
    },
    COMBINED: {
      title: "پرداخت ترکیبی",
      description:
        "بخشی از مبلغ را آنلاین پرداخت کنید و باقی‌مانده را مستقیماً به حساب ArByte واریز کنید.",
      split: (online: string, bank: string) =>
        `${online} آنلاین در «بله» + ${bank} واریز مستقیم`,
    },
    unavailableBadge: "در دسترس نیست",
  },
  invoiceSectionTitle: "فاکتور",
  invoicePersonalCta: "شخصی",
  invoiceCorporateCta: "حقوقی",
  invoiceForm: {
    companyNameLabel: "نام شرکت",
    companyNamePlaceholder: "نام ثبتی شرکت",
    nationalIdLabel: "شناسه ملی",
    nationalIdPlaceholder: "۱۱ رقم",
    economicCodeLabel: "کد اقتصادی",
    economicCodePlaceholder: "اختیاری",
  },
  summaryTitle: "سفارش شما",
  editCta: "ویرایش",
  subtotalLabel: "جمع کالاها",
  discountLabel: "تخفیف",
  shippingLabel: "هزینه ارسال",
  totalLabel: "مبلغ قابل پرداخت",
  placeOrderCta: {
    idle: "پرداخت و ثبت سفارش",
    placingGateway: "در حال انتقال به درگاه…",
    placingCardToCard: "در حال ثبت سفارش…",
  },
  legalNote: "با ثبت سفارش، قوانین آربایت را می‌پذیرید.",
  legalLink: "قوانین آربایت",
  emptyCartRedirectNote: "سبد خرید شما خالی است.",
} as const;

/**
 * E-05 §۱ — `/orders/[orderNumber]`. یادداشت‌های هر وضعیت («stateNotes»)
 * برای هر ۹ وضعیت یک جمله دارند؛ طراحی (`OrderStatus.dc.html`) فقط دو
 * حالت را صریح نوشته بود (پرداخت درگاهی/کارت‌به‌کارت) — بقیه با همان الگو
 * (سند تسک §۱: «بقیه‌ی وضعیت‌ها با همان الگو»).
 */
export const orderStatusPage = {
  orderNumberLabel: "شماره سفارش",
  stateNotes: {
    registered: "سفارش شما ثبت شد.",
    awaitingPayment: "برای تکمیل سفارش، پرداخت را انجام دهید.",
    paymentReview:
      "رسید شما دریافت شد و در حال بررسی توسط کارشناس مالی است. معمولاً کمتر از دو ساعت کاری طول می‌کشد.",
    paymentConfirmed:
      "پرداخت با موفقیت تأیید شد. سفارش شما وارد صف آماده‌سازی شده است.",
    processing: "دستگاه شما در حال آماده‌سازی و تست است.",
    readyToShip: "سفارش شما آماده‌ی ارسال است.",
    shipped: "سفارش شما ارسال شد.",
    delivered: "سفارش شما با موفقیت تحویل داده شد.",
    cancelled: "این سفارش لغو شده است.",
  } as const,

  /** بازگشت از درگاه/بله‌پی (`?payment=return`) — سند تسک §۱: «صفحه هرگز
   * خودش پرداخت را موفق اعلام نمی‌کند»، فقط بررسی کوتاه‌مدت وضعیت. */
  paymentReturn: {
    checking: "در حال تأیید پرداخت…",
    stillWaitingNote: "تأیید پرداخت کمی طول می‌کشد، پیامک می‌گیرید.",
  },

  /** AUDIT-3 §۵/§۶/§۱۵ — ترکیب پرداخت و پرداخت آنلاین در «بله». */
  payment: {
    title: "پرداخت",
    totalLabel: "مبلغ سفارش",
    paidLabel: "پرداخت‌شده",
    remainingLabel: "باقی‌مانده",
    shareLabels: { online: "آنلاین (بله)", bank: "واریز مستقیم" },
    shareStatus: {
      UNPAID: "در انتظار پرداخت",
      RECEIPT_UPLOADED: "رسید در حال بررسی",
      UNDER_REVIEW: "در حال بررسی",
      CONFIRMED: "پرداخت شد",
      PARTIALLY_PAID: "پرداخت بخشی",
      FAILED: "ناموفق",
      VOID: "باطل",
    },
    online: {
      title: "پرداخت آنلاین در «بله»",
      note: (amount: string) =>
        `${amount} در اپلیکیشن «بله» پرداخت می‌شود. با زدن دکمه، بله باز می‌شود و فاکتور سفارش برایتان ارسال می‌شود.`,
      openCta: "باز کردن بله",
      preparing: "در حال آماده‌سازی…",
      desktopNote:
        "روی کامپیوتر هستید؟ این کد را با دوربین گوشی اسکن کنید یا لینک زیر را در گوشی باز کنید.",
      linkLabel: "لینک پرداخت در بله",
      waiting: "پس از پرداخت در بله، این صفحه خودکار به‌روز می‌شود.",
      failedTitle: "پرداخت آنلاین انجام نشد؟",
      failedNote:
        "سقف پرداخت روزانه‌ی بله بین همه‌ی فروشگاه‌ها مشترک است، پس ممکن است پرداخت کمتر از سقف ما هم ناموفق شود. می‌توانید باقی‌مانده را مستقیم به حساب واریز کنید؛ سفارش باز می‌ماند.",
      moveToBankCta: "پرداخت باقی‌مانده با واریز مستقیم",
      moving: "در حال تغییر…",
      startError: "اتصال به بله ممکن نشد. کمی بعد دوباره تلاش کنید.",
    },
    bankAmountLabel: "مبلغ قابل واریز",
    receiptPendingNote:
      "رسید شما دریافت شد و در حال بررسی است. پس از تأیید، وضعیت سفارش به‌روز می‌شود.",
  },

  timelineTitle: "مراحل سفارش",
  timelineSteps: {
    registered: "سفارش ثبت شد",
    paid: "پرداخت تأیید شد",
    processing: "آماده‌سازی و تست دستگاه",
    shipped: "تحویل به پست",
    delivered: "تحویل به شما",
  } as const,

  cardToCard: {
    title: "اطلاعات حساب برای واریز",
    bankLabel: "شماره شبا",
    cardLabel: "شماره کارت",
    holderLabel: "به نام",
    copyIdle: "کپی",
    copyDone: "کپی شد ✓",
    amountNote: (orderNumber: string) =>
      `هنگام واریز، شماره سفارش ${orderNumber} را در توضیحات بنویسید تا تطبیق سریع‌تر انجام شود.`,
    receiptSectionTitle: "ثبت رسید پرداخت",
    dropzoneIdle: "تصویر رسید را اینجا بیندازید",
    dropzoneHint: "یا کلیک کنید و از دستگاه انتخاب کنید · JPG، PNG یا PDF",
    submitIdle: "ثبت رسید و ارسال برای بررسی",
    submitSending: "در حال ارسال…",
    submitDone: "رسید ثبت شد ✓",
    afterSubmitNote: "نتیجه‌ی بررسی با پیامک به شما اطلاع داده می‌شود.",
  },

  summaryTitle: "خلاصه سفارش",
  deliveryTitle: "تحویل",
  invoiceSectionTitle: "فاکتور رسمی",
  invoiceDownloadIdle: "دانلود فاکتور PDF",
  invoiceDownloadPreparing: "در حال آماده‌سازی…",
  invoiceDownloadDone: "دانلود شد ✓",
  invoiceNotAvailableNote: "فاکتور از لحظه‌ی تأیید پرداخت در دسترس است.",
  warrantyCardSectionTitle: "کارت گارانتی دستگاه‌ها",
  warrantyCardDownloadCta: "دانلود کارت گارانتی",
  warrantyCardNotAvailableNote: "کارت گارانتی پس از ارسال سفارش در دسترس است.",
  notFoundTitle: "سفارشی با این مشخصات پیدا نشد",
  notFoundNote: "این سفارش متعلق به شما نیست یا وجود ندارد.",
} as const;

/** E-05 §۲ — `/track-order`. حریم خصوصی: فقط شهر مقصد نشان داده می‌شود. */
export const trackOrderPage = {
  breadcrumbHome: "خانه",
  breadcrumbSupport: "پشتیبانی",
  breadcrumbCurrent: "پیگیری سفارش",
  title: "پیگیری سفارش",
  subtitle:
    "شماره سفارش و شماره موبایل ثبت‌شده را وارد کنید. بدون ورود به حساب هم می‌توانید وضعیت را ببینید.",
  orderNumberLabel: "شماره سفارش",
  orderNumberPlaceholder: "ARB-14042738",
  mobileLabel: "شماره موبایل",
  mobilePlaceholder: "۰۹۱۲۰۰۰۰۰۰۰",
  submitCta: "پیگیری",
  requiredFieldsNote: "هر دو فیلد لازم است.",
  notFoundTitle: "سفارشی با این مشخصات پیدا نشد",
  notFoundNote:
    "شماره سفارش با ARB شروع می‌شود و در پیامک تأیید برایتان ارسال شده است. شماره موبایل هم باید همان شماره ثبت سفارش باشد.",
  notFoundSupportCta: "پرسیدن از پشتیبانی",
  timelineTitle: "مسیر سفارش",
  itemsTitle: "اقلام سفارش",
  totalPaidLabel: "مبلغ پرداخت‌شده",
  addressTitle: "نشانی تحویل",
  /** حریم خصوصی — فقط شهر، نه نشانی کامل (سند تسک §۲). */
  addressCityOnlyNote: (city: string) => `مقصد: ${city}`,
  documentsTitle: "مدارک سفارش",
  guestInvoiceNote: "برای دانلود فاکتور وارد شوید",
  guestInvoiceCta: "ورود به حساب",
  fullOrderPageCta: "صفحه کامل سفارش",
  supportBoxTitle: "مشکلی در ارسال هست؟",
  supportBoxNote:
    "اگر مرسوله بیش از دو روز در یک وضعیت مانده، به ما بگویید تا پیگیری کنیم.",
  supportBoxCta: "گفت‌وگو با پشتیبانی",
} as const;

/** E-05 §۳ — `/account`، چهار تب. */
export const accountPage = {
  memberSinceLabel: "عضو از",
  logoutCta: "خروج از حساب",
  wishlistCta: "علاقه‌مندی‌ها",
  tabs: {
    orders: "سفارش‌ها",
    addresses: "آدرس‌ها",
    devices: "دستگاه‌های من",
    info: "اطلاعات حساب",
  },
  orders: {
    emptyTitle: "هنوز سفارشی ثبت نکرده‌اید",
    emptyNote: "سفارش‌های شما اینجا نمایش داده می‌شوند.",
    emptyCta: "مشاهده فروشگاه",
    detailCta: "جزئیات سفارش",
  },
  addresses: {
    defaultBadge: "پیش‌فرض",
    editCta: "ویرایش",
    setDefaultCta: "پیش‌فرض کن",
    deleteCta: "حذف",
    addNewCta: "افزودن آدرس جدید",
    emptyNote: "هنوز آدرسی ثبت نکرده‌اید.",
  },
  devices: {
    intro:
      "دستگاه‌هایی که از آربایت خریده‌اید، با سریال ثبت‌شده و اطلاعات گارانتی.",
    serialLabel: "شماره سریال",
    testPeriodEndLabel: "پایان مهلت تست",
    warrantyLabel: "گارانتی تا",
    noWarrantyNote: "بدون گارانتی جدا",
    downloadWarrantyCardCta: "دانلود کارت گارانتی",
    emptyNote: "هنوز دستگاهی به حساب شما تحویل داده نشده است.",
  },
  info: {
    title: "اطلاعات حساب",
    firstNameLabel: "نام",
    lastNameLabel: "نام خانوادگی",
    mobileLabel: "شماره موبایل",
    mobileLockedNote: "شماره موبایل قابل ویرایش نیست",
    saveCta: "ذخیره تغییرات",
    saveDone: "ذخیره شد ✓",
  },
} as const;

/** G-01 — Blog.dc.html / BlogPost.dc.html. فرم خبرنامه و دکمه‌ی «ذخیره» عمداً نیست. */
export const blogPage = {
  breadcrumb: { home: "خانه", current: "بلاگ" },
  title: "بلاگ آربایت",
  subtitle:
    "راهنمای خرید و بررسی‌هایی که کارشناس‌های ما بعد از کار کردن با دستگاه‌ها می‌نویسند.",
  metaDescription:
    "راهنمای خرید، بررسی و نکته‌های نگهداری لپ‌تاپ و سخت‌افزار، نوشته‌ی کارشناس‌های آربایت.",
  allCategories: "همه",
  searchPlaceholder: "جستجو در نوشته‌ها",
  featuredBadge: "تازه‌ترین نوشته",
  readMore: "خواندن مقاله",
  readingTime: (minutes: string) => `${minutes} دقیقه مطالعه`,
  emptyTitle: "نوشته‌ای پیدا نشد",
  emptyBody: "عبارت دیگری را امتحان کنید یا دسته را روی «همه» بگذارید.",
  emptyNoPostsTitle: "هنوز نوشته‌ای منتشر نشده",
  emptyNoPostsBody:
    "راهنماها و بررسی‌ها پس از انتشار این‌جا نمایش داده می‌شوند.",
  resetFilters: "نمایش همه نوشته‌ها",
  prevPage: "صفحه‌ی قبل",
  nextPage: "صفحه‌ی بعد",
  pageOf: (page: string, total: string) => `صفحه ${page} از ${total}`,
} as const;

export const blogPostPage = {
  copyLink: "کپی لینک",
  copied: "کپی شد ✓",
  toc: "در این نوشته",
  continueReading: "خواندن را ادامه بدهید",
  allPosts: "همه نوشته‌ها",
  progressLabel: "پیشرفت مطالعه",
} as const;

/** G-01 — نظرات خریداران زیر تب‌های محصول؛ فقط نظرهای تأییدشده نمایش داده می‌شوند. */
export const productReviews = {
  title: "نظر خریداران",
  summary: (avg: string, count: string) => `${avg} از ۵ · ${count} نظر`,
  empty: "هنوز نظری برای این محصول ثبت نشده است.",
  verified: "خریدار",
  adminReply: "پاسخ آربایت",
  loadMore: "نظرهای بیشتر",
  formTitle: "نظر شما درباره‌ی این محصول",
  ratingLabel: "امتیاز",
  star: (n: string) => `${n} ستاره`,
  titleLabel: "عنوان (اختیاری)",
  bodyLabel: "متن نظر",
  bodyPlaceholder: "تجربه‌ی استفاده از دستگاه را بنویسید.",
  submit: "ثبت نظر",
  sending: "در حال ثبت…",
  submitted: "نظر شما ثبت شد و پس از بررسی نمایش داده می‌شود.",
  alreadyReviewed: "نظر شما برای این محصول ثبت شده است.",
  invalid: "امتیاز را انتخاب کنید و متن نظر حداقل ۱۰ حرف باشد.",
  error: "ثبت نظر ناموفق بود؛ دوباره تلاش کنید.",
  buyersOnly: "فقط خریدارانی که سفارششان تحویل شده می‌توانند نظر ثبت کنند.",
} as const;
