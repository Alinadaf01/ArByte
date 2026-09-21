export const pageMeta = {
  dashboard: { title: "داشبورد", subtitle: "خوش آمدید، مدیر سیستم" },
  users: { title: "کاربران", subtitle: "مدیریت ۲۸,۱۹۰ کاربر فعال" },
  transactions: { title: "تراکنش‌ها", subtitle: "لیست کامل پرداخت‌ها" },
  analytics: { title: "تحلیل‌ها", subtitle: "گزارش عملکرد و روندها" },
  settings: { title: "تنظیمات", subtitle: "پیکربندی پنل و حساب" },
};

export const pages = {
  dashboard: `
    <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 anim-stagger">
      <article class="metric metric-d1"><div class="relative z-[1] flex justify-between gap-3"><div><p class="text-[12px] font-medium text-ink-faint">درآمد ماهانه</p><p class="metric-val" data-count="۱۲.۴M">۰</p><span class="trend-up mt-2"><span data-icon="trendUp" data-icon-size="sm"></span>+۱۸.۲٪</span></div><div class="metric-ico metric-ico--blue anim-pop"><span data-icon="revenue" data-icon-size="xl"></span></div></div><svg class="spark anim-draw" viewBox="0 0 120 32" preserveAspectRatio="none"><defs><linearGradient id="s1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2563eb" stop-opacity="0.25"/><stop offset="100%" stop-color="#2563eb" stop-opacity="0"/></linearGradient></defs><path class="spark-line" d="M0 22 L20 18 L40 20 L60 12 L80 14 L100 8 L120 6" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round"/><path d="M0 22 L20 18 L40 20 L60 12 L80 14 L100 8 L120 6 L120 32 L0 32Z" fill="url(#s1)"/></svg></article>
      <article class="metric metric-d2"><div class="relative z-[1] flex justify-between gap-3"><div><p class="text-[12px] font-medium text-ink-faint">سفارش جدید</p><p class="metric-val" data-count="۳۸۴۲">۰</p><span class="trend-up mt-2"><span data-icon="trendUp" data-icon-size="sm"></span>+۹.۴٪</span></div><div class="metric-ico metric-ico--purple anim-pop"><span data-icon="orders" data-icon-size="xl"></span></div></div><svg class="spark anim-draw" viewBox="0 0 120 32" preserveAspectRatio="none"><defs><linearGradient id="s2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#7c3aed" stop-opacity="0.22"/><stop offset="100%" stop-color="#7c3aed" stop-opacity="0"/></linearGradient></defs><path class="spark-line" d="M0 24 L25 20 L50 22 L75 14 L100 10 L120 8" fill="none" stroke="#7c3aed" stroke-width="2.5" stroke-linecap="round"/><path d="M0 24 L25 20 L50 22 L75 14 L100 10 L120 8 L120 32 L0 32Z" fill="url(#s2)"/></svg></article>
      <article class="metric metric-d3"><div class="relative z-[1] flex justify-between gap-3"><div><p class="text-[12px] font-medium text-ink-faint">کاربران فعال</p><p class="metric-val" data-count="۲۸,۱۹۰">۰</p><span class="trend-up mt-2"><span data-icon="trendUp" data-icon-size="sm"></span>+۵.۱٪</span></div><div class="metric-ico metric-ico--green anim-pop"><span data-icon="customers" data-icon-size="xl"></span></div></div><svg class="spark anim-draw" viewBox="0 0 120 32" preserveAspectRatio="none"><defs><linearGradient id="s3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#10b981" stop-opacity="0.22"/><stop offset="100%" stop-color="#10b981" stop-opacity="0"/></linearGradient></defs><path class="spark-line" d="M0 26 L30 22 L60 24 L90 16 L120 12" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round"/><path d="M0 26 L30 22 L60 24 L90 16 L120 12 L120 32 L0 32Z" fill="url(#s3)"/></svg></article>
      <article class="metric metric-d4"><div class="relative z-[1] flex justify-between gap-3"><div><p class="text-[12px] font-medium text-ink-faint">نرخ تبدیل</p><p class="metric-val" data-count="۴.۷٪">۰</p><span class="trend-down mt-2"><span data-icon="trendDown" data-icon-size="sm"></span>−۰.۳٪</span></div><div class="metric-ico metric-ico--orange anim-pop"><span data-icon="growth" data-icon-size="xl"></span></div></div><svg class="spark anim-draw" viewBox="0 0 120 32" preserveAspectRatio="none"><defs><linearGradient id="s4" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f59e0b" stop-opacity="0.2"/><stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/></linearGradient></defs><path class="spark-line" d="M0 10 L30 14 L60 12 L90 18 L120 16" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round"/><path d="M0 10 L30 14 L60 12 L90 18 L120 16 L120 32 L0 32Z" fill="url(#s4)"/></svg></article>
    </section>
    <section class="table-panel anim-fade-up">${transactionsTable()}</section>
  `,

  users: `
    <section class="panel p-5 anim-fade-up">
      <div class="relative z-[1] mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 class="text-base font-bold text-ink sm:text-lg">لیست کاربران</h2><p class="text-[11px] text-ink-faint sm:text-[12px]">۸ کاربر نمونه</p></div>
        <button type="button" class="btn-fill w-full justify-center sm:w-auto" id="btn-add-user"><span data-icon="plus" data-icon-size="sm"></span>کاربر جدید</button>
      </div>
      <div class="relative z-[1] grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 anim-stagger">
        ${userCards()}
      </div>
    </section>
  `,

  transactions: `
    <section class="table-panel anim-fade-up">${transactionsTable(true)}</section>
  `,

  analytics: `
    <section class="grid grid-cols-1 gap-4 lg:grid-cols-2 anim-stagger">
      <article class="panel p-5 anim-scale-in">
        <h3 class="relative z-[1] mb-4 text-base font-bold text-ink">فروش هفتگی</h3>
        <div class="chart-bars relative z-[1] flex items-end justify-between gap-1 sm:gap-2">
          ${[65, 45, 80, 55, 90, 70, 95].map((h, i) => `<div class="bar-col flex-1"><div class="bar-fill" style="--h:${h}%;--d:${i * 0.08}s"></div><span class="mt-2 block text-center text-[10px] text-ink-faint">${["ش", "ی", "د", "س", "چ", "پ", "ج"][i]}</span></div>`).join("")}
        </div>
      </article>
      <article class="panel p-5 anim-scale-in" style="animation-delay:.1s">
        <h3 class="relative z-[1] mb-4 text-base font-bold text-ink">منابع ترافیک</h3>
        <div class="relative z-[1] space-y-4">
          ${[
            { l: "مستقیم", p: 42, c: "#2563eb" },
            { l: "گوگل", p: 28, c: "#7c3aed" },
            { l: "شبکه‌ها", p: 18, c: "#10b981" },
            { l: "ایمیل", p: 12, c: "#f59e0b" },
          ]
            .map(
              (x) =>
                `<div><div class="mb-1 flex justify-between text-[12px]"><span class="font-medium text-ink">${x.l}</span><span class="text-ink-faint">${x.p}٪</span></div><div class="progress-track"><div class="progress-fill" style="--w:${x.p}%;--c:${x.c}"></div></div></div>`,
            )
            .join("")}
        </div>
      </article>
    </section>
    <section class="panel mt-4 p-5 anim-fade-up">
      <h3 class="relative z-[1] mb-3 text-base font-bold text-ink">خلاصه ماه</h3>
      <div class="relative z-[1] grid grid-cols-2 gap-3 sm:grid-cols-4">
        ${[
          { n: "۱۲.۴M", l: "درآمد", i: "revenue" },
          { n: "۳,۸۴۲", l: "سفارش", i: "orders" },
          { n: "۲۸K", l: "کاربر", i: "customers" },
          { n: "۴.۷٪", l: "تبدیل", i: "growth" },
        ]
          .map(
            (x, i) =>
              `<div class="mini-stat anim-pop" style="animation-delay:${i * 0.08}s"><span data-icon="${x.i}" data-icon-size="md"></span><p class="mt-2 text-lg font-bold text-ink">${x.n}</p><p class="text-[11px] text-ink-faint">${x.l}</p></div>`,
          )
          .join("")}
      </div>
    </section>
  `,

  settings: `
    <section class="grid grid-cols-1 gap-4 lg:grid-cols-2 anim-stagger">
      <article class="panel p-5 anim-fade-up">
        <h3 class="relative z-[1] mb-4 text-base font-bold text-ink">حساب کاربری</h3>
        <div class="relative z-[1] space-y-3">
          <label class="block"><span class="mb-1 block text-[12px] text-ink-faint">نام</span><input class="input-field" value="علی محمدی" /></label>
          <label class="block"><span class="mb-1 block text-[12px] text-ink-faint">ایمیل</span><input class="input-field" value="admin@example.com" dir="ltr" /></label>
          <button type="button" class="btn-fill w-full justify-center" id="btn-save-settings">ذخیره تغییرات</button>
        </div>
      </article>
      <article class="panel p-5 anim-fade-up" style="animation-delay:.08s">
        <h3 class="relative z-[1] mb-4 text-base font-bold text-ink">اعلان‌ها</h3>
        <div class="relative z-[1] space-y-3">
          ${[
            { l: "ایمیل تراکنش", on: true },
            { l: "پیامک امنیتی", on: true },
            { l: "خبرنامه", on: false },
            { l: "گزارش هفتگی", on: true },
          ]
            .map(
              (t, i) =>
                `<label class="toggle-row anim-pop" style="animation-delay:${i * 0.06}s"><span class="text-[13px] font-medium text-ink">${t.l}</span><input type="checkbox" class="toggle-input" ${t.on ? "checked" : ""} /><span class="toggle-ui"></span></label>`,
            )
            .join("")}
        </div>
      </article>
      <article class="panel p-5 lg:col-span-2 anim-fade-up" style="animation-delay:.12s">
        <h3 class="relative z-[1] mb-4 text-base font-bold text-ink">ظاهر</h3>
        <div class="relative z-[1] flex flex-wrap gap-2">
          <button type="button" class="theme-chip theme-chip-on" data-theme="light">لایت</button>
          <button type="button" class="theme-chip" data-theme="dark">تاریک</button>
          <button type="button" class="theme-chip" data-theme="auto">خودکار</button>
        </div>
      </article>
    </section>
  `,
};

function userCards() {
  const users = [
    ["س", "سارا احمدی", "مدیر", "blue"],
    ["م", "محمد رضایی", "ویرایشگر", "purple"],
    ["ن", "نیما کریمی", "کاربر", "green"],
    ["ز", "زهرا موسوی", "پشتیبان", "rose"],
    ["ا", "امیر حسینی", "مدیر", "amber"],
    ["ف", "فاطمه نوری", "کاربر", "sky"],
    ["ر", "رضا اکبری", "تحلیلگر", "blue"],
    ["ل", "لیلا صادقی", "کاربر", "purple"],
  ];
  const bg = {
    blue: "bg-blue-100 text-brand-blue",
    purple: "bg-violet-100 text-brand-purple",
    green: "bg-emerald-100 text-emerald-600",
    rose: "bg-rose-100 text-rose-600",
    amber: "bg-amber-100 text-amber-600",
    sky: "bg-sky-100 text-sky-600",
  };
  return users
    .map(
      ([a, n, r, c], i) => `
    <div class="user-card anim-pop" data-searchable style="animation-delay:${i * 0.05}s">
      <div class="flex items-center gap-3">
        <span class="user-dot ${bg[c]}">${a}</span>
        <div><p class="font-semibold text-ink">${n}</p><p class="text-[11px] text-ink-faint">${r}</p></div>
      </div>
      <button type="button" class="row-btn mt-3 w-full justify-center" data-action="view-user"><span data-icon="eye" data-icon-size="sm"></span></button>
    </div>
  `,
    )
    .join("");
}

function transactionsTable(full = false) {
  const rows = [
    [
      "#TX-9821",
      "س",
      "سارا احمدی",
      "blue",
      "۲,۴۵۰,۰۰۰",
      "۱۴۰۴/۰۳/۱۵ — ۱۰:۳۲",
      "success",
      "موفق",
      "chip-ok",
    ],
    [
      "#TX-9820",
      "م",
      "محمد رضایی",
      "purple",
      "۸۹۰,۰۰۰",
      "۱۴۰۴/۰۳/۱۵ — ۰۹:۱۵",
      "pending",
      "در انتظار",
      "chip-wait",
    ],
    [
      "#TX-9819",
      "ن",
      "نیما کریمی",
      "green",
      "۵,۱۲۰,۰۰۰",
      "۱۴۰۴/۰۳/۱۴ — ۱۸:۴۴",
      "success",
      "موفق",
      "chip-ok",
    ],
    [
      "#TX-9818",
      "ز",
      "زهرا موسوی",
      "rose",
      "۱,۲۰۰,۰۰۰",
      "۱۴۰۴/۰۳/۱۴ — ۱۴:۰۲",
      "failed",
      "ناموفق",
      "chip-fail",
    ],
    [
      "#TX-9817",
      "ا",
      "امیر حسینی",
      "amber",
      "۳,۷۵۰,۰۰۰",
      "۱۴۰۴/۰۳/۱۳ — ۱۱:۲۰",
      "success",
      "موفق",
      "chip-ok",
    ],
    [
      "#TX-9816",
      "ف",
      "فاطمه نوری",
      "sky",
      "۶۴۰,۰۰۰",
      "۱۴۰۴/۰۳/۱۳ — ۰۸:۵۵",
      "pending",
      "بررسی",
      "chip-info",
    ],
  ];
  const bg = {
    blue: "bg-blue-100 text-brand-blue",
    purple: "bg-violet-100 text-brand-purple",
    green: "bg-emerald-100 text-emerald-600",
    rose: "bg-rose-100 text-rose-600",
    amber: "bg-amber-100 text-amber-600",
    sky: "bg-sky-100 text-sky-600",
  };
  const extra = full ? rows : rows;
  const cell = (label, html, extra = "") =>
    `<td class="data-cell px-4 py-3.5 ${extra}" data-label="${label}">${html}</td>`;
  return `
    <div class="table-toolbar relative z-[1] mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
      <div class="flex min-w-0 items-center gap-3">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-blue/10 text-brand-blue anim-pop sm:h-11 sm:w-11"><span data-icon="transactions" data-icon-size="md"></span></div>
        <div class="min-w-0"><h2 class="text-base font-bold text-ink sm:text-lg">آخرین تراکنش‌ها</h2><p class="text-[11px] text-ink-faint sm:text-[12px]">به‌روزرسانی لحظه‌ای</p></div>
      </div>
      <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
        <div id="tabs" class="tabs tabs-scroll w-full sm:w-auto" role="tablist">
          <button type="button" role="tab" data-tab="all" data-tab-icon class="tab tab-on" aria-selected="true"><span class="tab-icon"></span>همه</button>
          <button type="button" role="tab" data-tab="success" data-tab-icon class="tab" aria-selected="false"><span class="tab-icon"></span>موفق</button>
          <button type="button" role="tab" data-tab="pending" data-tab-icon class="tab" aria-selected="false"><span class="tab-icon"></span>انتظار</button>
          <button type="button" role="tab" data-tab="failed" data-tab-icon class="tab" aria-selected="false"><span class="tab-icon"></span>ناموفق</button>
        </div>
        <button type="button" class="btn-ghost w-full justify-center sm:w-auto" id="btn-download" aria-label="دانلود"><span data-icon="download" data-icon-size="sm"></span><span class="ms-2 text-[12px] sm:hidden">دانلود</span></button>
      </div>
    </div>
    <div class="table-scroll relative z-[1] -mx-1 px-1 sm:mx-0 sm:px-0">
      <table class="data-table data-table--responsive" id="table">
        <thead><tr><th>شناسه</th><th>کاربر</th><th>مبلغ</th><th>تاریخ</th><th>وضعیت</th><th class="col-actions"></th></tr></thead>
        <tbody id="rows">${extra
          .map(
            (
              r,
              i,
            ) => `<tr class="data-row" data-searchable data-status="${r[6]}" style="animation-delay:${0.35 + i * 0.06}s">
          ${cell("شناسه", `<span class="font-mono text-[12px] text-ink-faint">${r[0]}</span>`)}
          ${cell("کاربر", `<div class="flex items-center gap-2"><span class="user-dot ${bg[r[3]]}">${r[1]}</span><span class="font-semibold">${r[2]}</span></div>`)}
          ${cell("مبلغ", `<span class="font-semibold">${r[4]} <span class="text-[11px] font-normal text-ink-faint">تومان</span></span>`)}
          ${cell("تاریخ", `<span class="text-ink-faint">${r[5]}</span>`)}
          ${cell("وضعیت", `<span class="chip ${r[8]}">${r[7]}</span>`)}
          ${cell("عملیات", `<div class="flex gap-1"><button class="row-btn" type="button" data-action="view-tx"><span data-icon="eye" data-icon-size="sm"></span></button><button class="row-btn" type="button"><span data-icon="more" data-icon-size="sm"></span></button></div>`, "col-actions")}
        </tr>`,
          )
          .join("")}</tbody>
      </table>
    </div>
    <p id="empty" class="relative z-[1] hidden py-10 text-center text-[13px] text-ink-faint">موردی یافت نشد.</p>
  `;
}
