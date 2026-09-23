/**
 * T-210 §۶ — زیرساخت مشترک سه store سمت کاربر (سبد/علاقه‌مندی/مقایسه).
 * الگوی `useSyncExternalStore` (نه یک کتابخانه‌ی state جدا) چون همین دقیقاً
 * مسئله‌ای است که React برایش ساخته: یک store بیرونی (localStorage) که
 * باید بین چند مشترک (تب‌های باز، کامپوننت‌های مختلف) هم‌گام بماند و در
 * SSR بدون خطای hydration رندر شود.
 *
 * ⚠️ مقدار اولیه‌ی سرور همیشه آرایه‌ی خالی است؛ localStorage فقط بعد از
 * mount (در subscribe، که React تنها در کلاینت صدا می‌زند) خوانده می‌شود —
 * برای همین سرور و کلاینت در اولین رندر همیشه یکی‌اند.
 */
export function createLocalArrayStore<T>(key: string) {
  let items: readonly T[] = [];
  let hydrated = false;
  const listeners = new Set<() => void>();
  const EMPTY: readonly T[] = [];

  function readFromStorage(): readonly T[] {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      // JSON خراب یا localStorage در دسترس نیست (حالت خصوصی/quota) — خالی
      // شروع کن، خطا صفحه را پایین نکشد.
      return [];
    }
  }

  function writeToStorage(next: readonly T[]) {
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // نوشتن شکست خورد (quota/خصوصی) — state درون‌حافظه‌ای همچنان کار
      // می‌کند، فقط بین رفرش‌ها ماندگار نمی‌ماند.
    }
  }

  function hydrateOnce() {
    if (hydrated) return;
    hydrated = true;
    items = readFromStorage();
  }

  function notify() {
    for (const listener of listeners) listener();
  }

  function setItems(next: readonly T[]) {
    // یعنی الان state درون‌حافظه‌ای معتبر است، حتی اگر subscribe (mount یک
    // کامپوننت) هنوز صدا زده نشده باشد — مثلاً وقتی addItem مستقیم از یک
    // اکشن غیر-React یا تست صدا زده می‌شود.
    hydrated = true;
    items = next;
    writeToStorage(next);
    notify();
  }

  function subscribe(listener: () => void) {
    const wasHydrated = hydrated;
    hydrateOnce();
    listeners.add(listener);
    // اگر همین subscribe اولین hydrate واقعی بود، یک نوتیفای می‌فرستیم تا
    // React دوباره getSnapshot را بخواند و داده‌ی واقعی localStorage
    // (نه EMPTY سرور) را رندر کند — در غیر این صورت تا اولین تغییر واقعی
    // کاربر، UI روی حالت خالی می‌ماند.
    if (!wasHydrated) queueMicrotask(notify);

    const onStorage = (event: StorageEvent) => {
      if (event.key !== key) return;
      items = readFromStorage();
      notify();
    };
    window.addEventListener("storage", onStorage);

    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }

  function getSnapshot(): readonly T[] {
    return hydrated ? items : EMPTY;
  }

  function getServerSnapshot(): readonly T[] {
    return EMPTY;
  }

  function getItems(): readonly T[] {
    // برخلاف getSnapshot (که React در رندر صدا می‌زند و نباید عوارض
    // جانبی داشته باشد)، این متد را کد دامنه (addItem/removeItem/...) صدا
    // می‌زند — همیشه باید داده‌ی واقعی بدهد، حتی قبل از mount هر کامپوننتی.
    hydrateOnce();
    return items;
  }

  return { subscribe, getSnapshot, getServerSnapshot, setItems, getItems };
}
