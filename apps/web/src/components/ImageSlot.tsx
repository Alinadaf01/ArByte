/**
 * جایگزین `<image-slot>` طراحی (`docs/design/storefront/pages/image-slot.js`)
 * — عکس واقعی هنوز تأمین نشده (README «Assets»). والد باید نسبت تصویر،
 * radius و overflow:hidden را بدهد؛ این فقط پرکننده‌ی مرکز است.
 */
export function ImageSlot({ label }: { label: string }) {
  return (
    <div className="bg-brand-tint-3 text-secondary flex h-full w-full items-center justify-center p-4 text-center text-caption">
      {label}
    </div>
  );
}
