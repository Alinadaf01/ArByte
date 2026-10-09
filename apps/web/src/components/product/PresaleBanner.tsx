import { productDetailPage } from "@arbyte/contracts";

/**
 * بنر پیش‌فروش — همان لحظه‌ی ورود به صفحه‌ی محصول، بالای گالری/پنل خرید،
 * نه زیر یک تب که ممکن است دیده نشود (بازخورد کاربر: مشتری باید همان اول
 * بفهمد این دستگاه در تهران موجود نیست و ۲ تا ۴ هفته طول می‌کشد).
 */
export function PresaleBanner() {
  return (
    <div
      role="status"
      className="bg-info/8 border-info/20 flex items-start gap-3 rounded-card border p-4"
    >
      <span className="bg-info/18 flex h-9 w-9 flex-none items-center justify-center rounded-full">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-info"
          aria-hidden="true"
        >
          <path d="M3 11.5 20 4l-4.5 17-5-7.5Z" />
          <path d="m10.5 13.5 9.5-9.5" />
        </svg>
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-caption text-primary font-emphasis">
          {productDetailPage.presaleBanner.title}
        </p>
        <p className="text-caption text-secondary leading-loose">
          {productDetailPage.presaleBanner.body}
        </p>
      </div>
    </div>
  );
}
