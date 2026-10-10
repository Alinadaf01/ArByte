import { productDetailPage } from "@arbyte/contracts";

/**
 * اقلام رایگان همراه دستگاه (مثلاً کیف اشانتیون روی برخی لپ‌تاپ‌های
 * آکبند) — بالای پنل خرید، همان اول قابل دیدن باشد.
 */
export function IncludedAccessories({ items }: { items: string[] }) {
  if (items.length === 0) return null;

  return (
    <div className="border-border bg-surface flex flex-col gap-2 rounded-tile border p-3.5">
      <p className="text-caption text-primary font-emphasis">
        {productDetailPage.includedAccessoriesHeading}
      </p>
      <ul className="flex flex-col gap-1.5">
        {items.map((item) => (
          <li
            key={item}
            className="text-caption text-secondary flex items-center gap-2"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-brand shrink-0"
              aria-hidden="true"
            >
              <path d="m5 12.5 4.5 4.5L19 7.5" />
            </svg>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
