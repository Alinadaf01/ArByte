/** آیکون‌های Inline — سبک iOS / Duotone — بدون CDN */

const sizes = { sm: 18, md: 22, lg: 28, xl: 34 };

function sz(name) {
  return sizes[name] ?? sizes.md;
}

function svg(size, body, viewBox = "0 0 24 24") {
  const s = sz(size);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="${viewBox}" fill="none" class="icon-svg shrink-0" aria-hidden="true">${body}</svg>`;
}

export const icons = {
  dashboard: svg(
    "md",
    `<rect x="3" y="3" width="8" height="10" rx="2" fill="currentColor" fill-opacity="0.18"/>
     <rect x="13" y="3" width="8" height="6" rx="2" fill="currentColor" fill-opacity="0.12"/>
     <rect x="13" y="13" width="8" height="8" rx="2" fill="currentColor" fill-opacity="0.18"/>
     <rect x="3" y="15" width="8" height="6" rx="2" stroke="currentColor" stroke-width="1.5"/>
     <rect x="13" y="3" width="8" height="6" rx="2" stroke="currentColor" stroke-width="1.5"/>
     <rect x="13" y="13" width="8" height="8" rx="2" stroke="currentColor" stroke-width="1.5"/>
     <rect x="3" y="3" width="8" height="10" rx="2" stroke="currentColor" stroke-width="1.5"/>`,
  ),

  users: svg(
    "md",
    `<circle cx="9" cy="8" r="3.5" fill="currentColor" fill-opacity="0.2"/>
     <path d="M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1" fill="currentColor" fill-opacity="0.15"/>
     <circle cx="9" cy="8" r="3.5" stroke="currentColor" stroke-width="1.5"/>
     <path d="M3 20v-1a5 5 0 0 1 5-5h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
     <circle cx="17.5" cy="9" r="2.5" stroke="currentColor" stroke-width="1.5"/>
     <path d="M15 20v-.5a3.5 3.5 0 0 1 5 0V20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
  ),

  transactions: svg(
    "md",
    `<rect x="2" y="5" width="20" height="14" rx="3" fill="currentColor" fill-opacity="0.12"/>
     <path d="M2 10h20" stroke="currentColor" stroke-width="1.5"/>
     <path d="M6 15h4M14 15h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
     <circle cx="7" cy="15" r="0" fill="currentColor"/>
     <rect x="2" y="5" width="20" height="14" rx="3" stroke="currentColor" stroke-width="1.5"/>
     <path d="M6 8h3M15 8h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.7"/>`,
  ),

  analytics: svg(
    "md",
    `<path d="M4 20V10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
     <path d="M10 20V4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
     <path d="M16 20v-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
     <path d="M22 20v-9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
     <rect x="3" y="9" width="4" height="11" rx="1" fill="currentColor" fill-opacity="0.2"/>
     <rect x="9" y="3" width="4" height="17" rx="1" fill="currentColor" fill-opacity="0.25"/>
     <rect x="15" y="14" width="4" height="6" rx="1" fill="currentColor" fill-opacity="0.18"/>
     <rect x="21" y="11" width="4" height="9" rx="1" fill="currentColor" fill-opacity="0.15" transform="translate(-3 0)"/>`,
  ),

  settings: svg(
    "md",
    `<circle cx="12" cy="12" r="3" fill="currentColor" fill-opacity="0.2"/>
     <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
     <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.5"/>`,
  ),

  menu: svg(
    "md",
    `<path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
  ),

  close: svg(
    "md",
    `<path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
  ),

  search: svg(
    "sm",
    `<circle cx="11" cy="11" r="7" fill="currentColor" fill-opacity="0.1"/>
     <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.5"/>
     <path d="m20 20-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
  ),

  bell: svg(
    "sm",
    `<path d="M18 8a6 6 0 1 0-12 0c0 6-2 8-2 8h16s-2-2-2-8" fill="currentColor" fill-opacity="0.12"/>
     <path d="M18 8a6 6 0 1 0-12 0c0 6-2 8-2 8h16s-2-2-2-8" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
     <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
  ),

  revenue: svg(
    "xl",
    `<circle cx="12" cy="12" r="9" fill="currentColor" fill-opacity="0.12"/>
     <path d="M12 6v12M15 9H10a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H9" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>`,
  ),

  orders: svg(
    "xl",
    `<path d="M6 3 3 7v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7l-3-4Z" fill="currentColor" fill-opacity="0.15"/>
     <path d="M3 7h18" stroke="currentColor" stroke-width="1.75"/>
     <path d="M6 3 3 7h18l-3-4" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round"/>
     <path d="M16 11a4 4 0 0 1-8 0" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>`,
  ),

  customers: svg(
    "xl",
    `<circle cx="10" cy="9" r="3.5" fill="currentColor" fill-opacity="0.2"/>
     <path d="M4 20v-1.5a4.5 4.5 0 0 1 4.5-4.5H11" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
     <circle cx="17" cy="10" r="2.5" stroke="currentColor" stroke-width="1.75"/>
     <path d="M14.5 20v-1a3 3 0 0 1 5 0V20" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
     <circle cx="10" cy="9" r="3.5" stroke="currentColor" stroke-width="1.75"/>`,
  ),

  growth: svg(
    "xl",
    `<path d="M3 17l6-8 5 5 7-11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
     <path d="M14 3h7v7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
     <circle cx="9" cy="9" r="2" fill="currentColor" fill-opacity="0.25"/>`,
  ),

  trendUp: svg(
    "sm",
    `<path d="M18 15 12 9 6 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
     <path d="M12 9v10" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.5"/>`,
  ),

  trendDown: svg(
    "sm",
    `<path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
  ),

  server: svg(
    "sm",
    `<rect x="4" y="3" width="16" height="6" rx="1.5" fill="currentColor" fill-opacity="0.15"/>
     <rect x="4" y="11" width="16" height="6" rx="1.5" fill="currentColor" fill-opacity="0.1"/>
     <rect x="4" y="3" width="16" height="6" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
     <rect x="4" y="11" width="16" height="6" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
     <circle cx="7" cy="6" r="1" fill="currentColor"/><circle cx="7" cy="14" r="1" fill="currentColor"/>`,
  ),

  logo: svg(
    "md",
    `<path d="M12 2 4 6.5 12 11l8-4.5L12 2z" fill="currentColor" fill-opacity="0.25"/>
     <path d="M4 6.5 12 11v10.5L4 17V6.5z" fill="currentColor" fill-opacity="0.15"/>
     <path d="M20 6.5 12 11v10.5l8-4V6.5z" fill="currentColor" fill-opacity="0.12"/>
     <path d="M12 2 4 6.5 12 11l8-4.5L12 2zM4 6.5 12 11v10.5L4 17V6.5M20 6.5 12 11v10.5l8-4V6.5" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round"/>`,
  ),

  filterAll: svg(
    "sm",
    `<path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>`,
  ),

  filterSuccess: svg(
    "sm",
    `<circle cx="12" cy="12" r="9" fill="currentColor" fill-opacity="0.12"/>
     <path d="M8 12.5 10.5 15 16 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
  ),

  filterPending: svg(
    "sm",
    `<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/>
     <path d="M12 7v5l3 2" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>`,
  ),

  filterFailed: svg(
    "sm",
    `<circle cx="12" cy="12" r="9" fill="currentColor" fill-opacity="0.1"/>
     <path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
  ),

  eye: svg(
    "sm",
    `<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" stroke="currentColor" stroke-width="1.5"/>
     <circle cx="12" cy="12" r="2.5" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="1.5"/>`,
  ),

  more: svg(
    "sm",
    `<circle cx="12" cy="6" r="1.25" fill="currentColor"/><circle cx="12" cy="12" r="1.25" fill="currentColor"/><circle cx="12" cy="18" r="1.25" fill="currentColor"/>`,
  ),

  download: svg(
    "sm",
    `<path d="M12 3v12M8 11l4 4 4-4" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
     <path d="M4 19h16" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>`,
  ),

  plus: svg(
    "sm",
    `<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
  ),
};

/** برای تب‌ها: آیکون + متن */
export const tabIcons = {
  all: "filterAll",
  success: "filterSuccess",
  pending: "filterPending",
  failed: "filterFailed",
};
