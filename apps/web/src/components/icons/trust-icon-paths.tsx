/**
 * T-201/T-214 — آیکون‌های خطی مشترک بین بخش Guarantees صفحه اصلی
 * (`BenefitsSection.tsx`) و کاشی‌های اعتماد صفحه محصول (`TrustTiles.tsx`)،
 * عیناً از مسیر SVG `Home.dc.html`/`Product.dc.html`. یک‌بار این‌جا، هر دو
 * مصرف‌کننده از همین import می‌گیرند — کپی نشود.
 */
export const TRUST_ICON_PATHS: Record<string, React.ReactNode> = {
  warranty: (
    <>
      <path d="M12 3.2 5 6v5.5c0 4.2 2.9 7.6 7 9.3 4.1-1.7 7-5.1 7-9.3V6Z" />
      <path d="m9.2 12.1 2 2 3.6-3.9" />
    </>
  ),
  freeShipping: (
    <>
      <path d="M2.5 7.5h10v9h-10z" />
      <path d="M12.5 10.5h4l3 3v3h-7z" />
      <circle cx="6.5" cy="17.5" r="1.8" />
      <circle cx="16.5" cy="17.5" r="1.8" />
    </>
  ),
  sevenDayReturn: (
    <>
      <path d="M4 11a8 8 0 1 1 2.3 5.7" />
      <path d="M4 20v-5h5" />
    </>
  ),
  testedBeforeShipping: (
    <>
      <rect x="3" y="4.5" width="18" height="12" rx="2" />
      <path d="M8 20h8" />
      <path d="m9.5 10.3 1.8 1.8 3.2-3.4" />
    </>
  ),
};
