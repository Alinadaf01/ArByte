# Handoff: ArByte — فروشگاه پریمیوم سخت‌افزار (ArByte premium hardware storefront)

## Overview

ArByte is a Persian-language (RTL) e-commerce storefront for premium computer hardware — laptops, monitors, phones, audio, gaming gear and accessories. This bundle contains the complete front-end design: 19 screens plus 3 shared shell components, covering the whole customer journey (browse → product → cart → checkout → order status), the account area (login, profile, wishlist, order tracking), and content pages (blog, about, support, legal, 404).

The design is finished at high fidelity, is fully responsive (375px → 1440px+), and includes a complete interaction/micro-animation layer.

## About the Design Files

**The files in `pages/` are design references created in HTML — prototypes that show intended look and behavior. They are not production code to copy directly.**

Each file is a self-contained HTML document that opens in a browser. It uses a small in-house runtime (`support.js`) that renders a template with `{{ }}` holes from a logic class, and all styling is written as **inline styles** — a deliberate constraint of the prototyping environment, not a recommendation for production.

The task is to **recreate these designs in the target codebase's existing environment** (React, Vue, Svelte, Next.js, native — whatever is in use) following its established component patterns, styling approach, and libraries. If there is no front-end environment yet, pick the framework that best fits the project and implement the designs there. Read the HTML for exact values (hex codes, sizes, spacing, copy, animation timings); do not port the runtime or the inline-style approach.

## Fidelity

**High-fidelity.** Final colors, typography, spacing, radii, shadows, copy, responsive behavior, and interaction states are all decided. Recreate the UI faithfully using the codebase's existing libraries. All Persian copy in the files is final and should be used verbatim — do not paraphrase or re-translate it.

## Direction & Language

- **Direction: RTL.** Every page root carries `dir="rtl"`. Layouts mirror: primary nav sits right, logical properties (`margin-inline-start`, `padding-inline-end`) are used where mirroring matters.
- **Numbers are Persian digits** (`۰۱۲۳۴۵۶۷۸۹`) in all UI text. Every page has a helper: `fa(n)` maps ASCII digits to Persian; `money(m)` formats a number with `٫` as the thousands separator and appends `تومان`. Prices are stored as millions of Toman (e.g. `12.8` → `۱۲٫۸۰۰٫۰۰۰ تومان`).
- **Latin runs inside RTL text** (product model names, order codes, `01 / 04` counters) are wrapped in `dir="ltr"` elements so they don't reorder.
- Product names stay Latin (`MSI Titan 18 HX A2XWJG`); category and UI labels are Persian.

## Design Tokens

### Color

| Token              | Hex                                           | Use                                                        |
| ------------------ | --------------------------------------------- | ---------------------------------------------------------- |
| Paper              | `#F6F4FC`                                     | Page background                                            |
| Surface            | `#FFFFFF`                                     | Cards, panels, inputs                                      |
| Ink                | `#17151F`                                     | Primary text, dark sections, primary buttons               |
| Ink-2              | `#3D3950`                                     | Secondary/medium text, icon strokes                        |
| Muted              | `#5F5B6B`                                     | Body-secondary text                                        |
| Muted-2            | `#6E6880`                                     | Captions, inactive nav                                     |
| Line               | `#EAE6F4`                                     | Card borders, dividers                                     |
| Line-2             | `#E0DBF0`                                     | Input borders, chip borders                                |
| Line-3             | `#F0EDF8`                                     | Inner dividers on white                                    |
| Violet             | `#6C4DFF`                                     | Brand accent, focus ring, hover                            |
| Violet-deep        | `#4B32C3`                                     | Active link/state, accent text                             |
| Violet-light       | `#8B6BFF` / `#A88CFF`                         | On dark backgrounds                                        |
| Violet-tint        | `#EDE9FA` / `#F4F1FD` / `#F2EFFB` / `#ECE8F9` | Selected chips, hover fills, success-after-action fills    |
| Violet-tint-border | `#D6CCF7`                                     | Border of a "done" state                                   |
| Cyan               | `#22D3EE`                                     | Secondary accent, badges, live dots                        |
| Cyan-deep          | `#0E7490`                                     | Cyan-family text on light                                  |
| Cyan-badge-ink     | `#0B3B45`                                     | Text on cyan badge                                         |
| Danger             | `#B42318`                                     | Error text                                                 |
| Danger-border      | `#E0A3A3`                                     | Invalid input border                                       |
| Danger-tint        | `#FBEEEE`                                     | Destructive hover fill                                     |
| Warn-text          | `#B4530A`                                     | Low-stock label                                            |
| On-dark text       | `#FFFFFF` / `#B9B4C9` / `#A8A3BA`             | Dark-section primary / secondary / tertiary                |
| Login canvas       | `#07060B`                                     | Login page background (only page with a near-black canvas) |

Rules: **max two background colors per page** (paper + one dark or white section). Dark sections use `#17151F` with radial violet/cyan glows at low alpha.

### Typography

- **Family:** `'Estedad', Tahoma, sans-serif` — self-hosted via `@font-face` from jsDelivr fontsource (`estedad@latest`, `arabic-400/500/600/700-normal.woff2`, `font-display: swap`). In production, self-host the four weights.
- **Weights:** 400 body, 500 secondary/labels, 600 emphasis and buttons, 700 headings.
- **Scale (desktop):** hero `clamp(30px, 4.4vw, 60px)` · section h2 `clamp(26px, 3vw, 40px)` · sub-head `clamp(20px, 2.4vw, 28px)` · card title 19px · body 14–15.5px · caption 12.5–13px · micro 12px.
- **Scale (mobile ≤767px):** body 15px · label/caption 13px · **inputs 16px** (prevents iOS focus zoom) · main headline max 28px.
- **Line-height:** 1.5 headings · 1.8–1.95 body/paragraphs (Persian needs generous leading).
- **Letter-spacing:** `-.02em`/`-.03em` on large headings; `.04em–.07em` on Latin counter/label runs.
- `text-wrap: pretty` on headings and paragraph blocks.

### Radius

Card 22px · large card/section 26px · panel 18–20px · inner tile 12–16px · chip 10px · pill/button 999px · icon button 12–13px.

### Spacing & layout

- Content column: `max-width: 1240px; margin: 0 auto;` with `padding-inline: 5vw`.
- Section rhythm: `clamp(20px, 3vh, 32px)` top, `clamp(48px, 7vh, 80px)` bottom; stack gaps `clamp(14px, 2vh, 24px)`.
- Card padding: 16px mobile / 18–26px desktop (`clamp(18px, 3vw, 26px)`).
- Grids use `repeat(auto-fit, minmax(Xpx, 1fr))` with X = 150–290 depending on content; every grid child that holds text has `min-width: 0`.
- **Always flex/grid + `gap`**, never margin-spaced inline siblings.

### Shadow

- Card lift: `0 12px 34px rgba(23,21,31,.08)`
- Popover/mega menu: `0 22px 50px rgba(23,21,31,.14)`
- Drawer: `-18px 0 44px rgba(23,21,31,.18)`
- Bottom sheet: `0 -18px 48px rgba(23,21,31,.18)`
- Bottom nav: `0 -6px 24px rgba(23,21,31,.06)`
- Accent button: `0 10px 34px rgba(108,77,255,.34)`

## Responsive System

Breakpoints: **mobile ≤767px · tablet 768–1023px · desktop ≥1024px**. 90% of traffic is expected on mobile; mobile is the primary case.

In the prototypes responsive behavior is implemented in JS (`window.matchMedia("(max-width: 767px)")` → `state.mobile`, sizes returned from the logic class) because the prototyping runtime allows only inline styles. **In production, use ordinary CSS media queries / container queries.** The JS approach carries no design intent.

Mobile rules:

- Header collapses to **56px**: hamburger · centered logo · search · cart (with badge). Desktop header is **72px**: logo · nav with products mega-menu · search/wishlist/account icon buttons · dark cart pill.
- **Fixed bottom nav, 5 items** (خانه · دسته‌ها · جستجو · سبد · حساب), 52px min item height, `padding-bottom: calc(6px + env(safe-area-inset-bottom))`, plus a spacer div so page content clears it.
- All multi-column grids become one column; summary/sidebar columns stop being sticky and flow inline.
- Product filters move into a **bottom sheet** (`translateY(103%) → 0`, `max-height: 86vh`, sticky header + sticky action footer, scrim behind, body scroll locked, Escape closes).
- Footer becomes accordion sections with a call/chat button.
- Horizontal scroll (not grids) for category chips, blog cards, tab bars, and the legal section list.
- Touch targets ≥44×44 with ≥8px separation.
- No horizontal page scroll at 375px.

## Interaction & Motion System

Shared base, present on every page:

- `-webkit-tap-highlight-color: transparent` on links and buttons.
- Buttons: `transition: background-color .2s ease, color .2s ease, border-color .2s ease, transform .16s cubic-bezier(.3,1,.4,1)`.
- Press: `:active { transform: scale(.96) }` (nav links `.95`, large buttons `.97`, drawer rows `.98`).
- Focus: `:focus-visible { outline: 2px solid #6C4DFF; outline-offset: 2px }` (Login uses `#8B6BFF` on its dark canvas).
- `@media (prefers-reduced-motion: reduce)` neutralizes animation and transition durations on every page.

Named animations (keyframes defined per page):

| Name                                                                   | Shape                      | Used for                                                                      |
| ---------------------------------------------------------------------- | -------------------------- | ----------------------------------------------------------------------------- |
| `arbPop`                                                               | `.88 → 1.05 → 1`, 340ms    | Success button confirmation (save, add-all, submit)                           |
| `arbPopA` / `arbPopB`                                                  | `.72 → 1.16 → 1`, 300ms    | Quantity number change (two identical names alternated so repeats retrigger)  |
| `arbShake` / `arbShakeB`                                               | ±6px, 420ms                | Invalid input (two identical names alternated on `shake % 2`)                 |
| `arbToastIn`                                                           | rise 14px + fade, 320ms    | Add-to-cart toast                                                             |
| `arbBadgePop`                                                          | `.55 → 1.14 → 1`, 400ms    | Cart badge on bottom nav                                                      |
| `arbRise`                                                              | rise 10–12px + fade, 360ms | Result/empty panels appearing                                                 |
| `arbFadeIn`                                                            | opacity 0→1, 260ms         | Scrims behind sheet/drawer                                                    |
| `arbSpin`                                                              | 360° linear, 700–750ms     | Button spinners                                                               |
| `arbStepIn`                                                            | rise 12px + fade, 450ms    | Login step change                                                             |
| `arbShakeA/B`, `arbRing`, `arbHalo`, `arbDraw`, `arbOrb1-3`, `arbMesh` | —                          | Login page only (ambient background orbs, OTP ring pulse, success check draw) |

**Retrigger pattern (important):** CSS does not restart an animation when the same `animation-name` is re-applied. Where an animation must fire on every repeated event (failed validation, quantity change), two identical keyframe blocks with different names are defined and selected by a counter parity (`shake % 2`, `tick % 2`). In a React/Vue implementation the idiomatic equivalent is a changing `key` or an explicit `animation` restart — either is fine, but the behavior must survive repeats.

Standing transitions: mega-menu `opacity .22s ease, transform .22s cubic-bezier(.3,1,.4,1)`; drawer `transform .3s cubic-bezier(.3,1,.4,1)`; sheet `transform .3s cubic-bezier(.3,1,.4,1)`; scrim `opacity .28s ease`; hover fills `.2s ease`; accordion `grid-template-rows: 0fr ↔ 1fr` with opacity.

Overlay behavior: opening the mobile drawer or the filter sheet sets `document.body.style.overflow = "hidden"`; closing, unmounting, or crossing the breakpoint releases it. Escape closes both.

## Shared Shell Components

### SiteHeader

Props: `active` (`"" | products | categories | blog | about | support`), `cartCount` (string, Persian digits).
Desktop 72px: logo (SVG lockup) · nav links with a products mega-menu (6 tiles: gaming, pro, monitors, parts/upgrades, accessories, compare) opening on hover with a rotating chevron · right cluster of 44px icon buttons (search, wishlist, account) · dark 44px cart pill with cyan count badge. Background `rgba(246,244,252,.9)` + `backdrop-filter: blur(14px)`, `border-bottom: 1px solid rgba(23,21,31,.06)`. Sticky, `z-index: 30`.
Mobile 56px + right-side drawer (`min(320px, 86vw)`, z-index 61 over a scrim at 60): login CTA card, three grouped link lists (خرید / پشتیبانی / آربایت) with 48px rows, footer block with online-support dot and phone number.

### MobileNav

Props: `active` (`"" | home | categories | search | cart | account`), `cartCount`. Renders only below 768px. 5 equal columns, 21px stroke icons that gain a violet tint fill and heavier stroke when active, 10.5px labels, cyan cart badge with `arbBadgePop`. `position: fixed; bottom: 0; z-index: 50`, blurred white background.

### SiteFooter

Dark `#17151F` footer. Desktop: four link columns + brand block + placeholder tiles for trust badges (e-Namad / enamad-style seals — real assets to be supplied). Mobile: accordion sections (shop / support / contact), the contact section open by default, plus a call button; bottom padding clears the fixed bottom nav.

## Screens

Order below is the customer journey. Every page mounts `SiteHeader` (sticky) at top, `MobileNav`, then `SiteFooter`.

### 1. Home — `Home.dc.html`

The most elaborate page; a scroll-driven landing experience.

- **Hero** "تکنولوژی با ظرافت" — full-bleed image slot behind an offset text block, a "new" pill with cyan dot, expert-pick strip with model name and two CTAs.
- **Scroll-driven feature sequence** (4 cards: اصالت / عملکرد / نمایشگر / خرید) cross-fading with progress bars, driven by the page's own scroll container (~320vh of scroll on mobile). A loading veil with a percentage counter covers it until eager images resolve; the image sequence preloads 28 frames on mobile, 60 on desktop.
- **Category grid** (لپ‌تاپ، گوشی موبایل، صدا و هدفون، گیمینگ، لوازم جانبی) — image tiles with dark scrim, count pill, title, subtitle, CTA; hover-reveals on desktop, expanded/vertical on mobile.
- **"دو پرچم‌دار، یک انتخاب"** — dark comparison section, two configurations with animated spec bars (توان کل، روشنایی), tag chips, CTAs, and a switcher.
- **"محصولات منتخب"** — product cards (image slot, category label, title, spec chips, price, stock badge).
- **"پیش از خرید، بخوانید"** — 9 journal cards in a horizontally scrolling row on mobile; each card flips/reveals read-time + "خواندن مقاله ←".
- **Support CTA** and **testimonials** sections.
- State: `{ pct, ready, act, started, cat, flip, mobile }`.
- Note: the scroll choreography is the design's signature. If the target stack has a scroll/animation library (GSAP ScrollTrigger, Framer Motion), use it; the intent is a scrubbed sequence tied to scroll position, not autoplay.

### 2. Products — `Products.dc.html`

Catalog. Header band with title "فروشگاه آربایت", result count, sort control. Filter panel: category chips (همه/گیمینگ/حرفه‌ای/اولترابوک/مانیتور), brand chips (MSI, ASUS, Lenovo, Apple, Dell) with counts, max-price range input (`accent-color: #6C4DFF`, up to 300 = ۳۰۰ میلیون), in-stock toggle, reset. Desktop: panel is a 3-up grid above the product grid. Mobile: a 52px "فیلترها" button showing active-filter summary opens the bottom sheet. Product grid cards: image slot, badges, title, spec chips, price, add-to-cart. Empty state when filters match nothing.
State: `{ cat, brands[], max, stock, sort, cart[], sheet, mobile }`.

### 3. Product — `Product.dc.html`

Single product (`MSI Titan 18 HX A2XWJG`). Gallery with thumbnail selector; buy box with three configurations (radio cards), quantity stepper (1–5, 38px round buttons, number pops on change), full-width add-to-cart (turns to `در سبد خرید` with violet-tint fill), 48px round wishlist toggle (fills on active). Four trust tiles (۲۴ ماه گارانتی، ارسال رایگان، …). Spec tabs (scrollable on mobile). "گزینه‌های هم‌رده" related row.
**Add-to-cart toast:** fixed, centered, max 420px, dark `#17151F`, cyan check in a tinted circle, "{n} دستگاه به سبد اضافه شد" + total price + white "دیدن سبد" pill; enters with `arbToastIn`, auto-dismisses after 2800ms, sits at `calc(80px + env(safe-area-inset-bottom))` on mobile / 26px on desktop.
State: `{ shot, cfg, qty, tab, added, fav, toast, mobile }`.

### 4. Cart — `Cart.dc.html`

Line items (96px thumb desktop / 76px mobile): title, config line, 44px remove button (hover → danger tint), quantity stepper with pop animation, line total + unit price. Summary column (sticky desktop, inline mobile): subtotal, coupon field (valid code `ARB10` → 10% off, invalid → row shakes and note turns danger), three shipping options, total, installment estimate, checkout CTA. Empty state with "رفتن به فروشگاه" and "برگرداندن سبد قبلی".
State: `{ lines[], ship, code, applied, bad, shake, ticks{}, mobile }`.

### 5. Checkout — `Checkout.dc.html`

Four blocks: آدرس تحویل (address cards + expandable new-address form), روش پرداخت, فاکتور (personal/corporate), سفارش شما summary. Place-order button: 50px pill, shows an inline spinner and "در حال انتقال به درگاه…", is disabled with `cursor: progress` while submitting (1600ms in the prototype — replace with the real gateway call). Legal note below with link to Legal.
State: `{ addr, pay, inv, newAddr, placing, mobile }`.

### 6. OrderStatus — `OrderStatus.dc.html`

Post-order page with two modes (online paid / bank transfer): headline varies, bank-account block with copy buttons (copied state per field), receipt upload with reference number and send action, order step timeline, order summary, delivery and invoice blocks.
State: `{ mode, file, ref, sent, copied, mobile }`.

### 7. TrackOrder — `TrackOrder.dc.html`

Guest order lookup. Form: order code + phone (demo pair `ARB-14042738` / `09123456789`), submit, "نمونه" filler. Empty fields → row shakes, both borders turn danger. Found → timeline (مسیر سفارش, current step pulses via `arbNow`), items, delivery address, documents, support prompt. Not found → centered panel rising in with `arbRise`.
State: `{ code, phone, status: idle|found|missing, bad, shake, mobile }`.

### 8. Login — `Login.dc.html`

The only dark-canvas page (`#07060B`), with an animated ambient background (three blurred orbs, mesh gradient, grid overlay) and a glass card. Two steps: phone entry (`+۹۸` prefix, 10-digit numeric input, 54px send button that lights up when valid) → 4-digit OTP (four 62px boxes, demo code in the logic class, 2:00 resend countdown, edit/back links). Wrong code: boxes shake (alternating keyframes), error line fades in, code clears. Verify button shows a spinner and "در حال بررسی…". Success step draws a check. Focus ring `#8B6BFF`.
State: `{ step, phone, code, err, busy, left, shake, mobile }`.

### 9. Account — `Account.dc.html`

Profile with four tabs (سفارش‌ها / آدرس‌ها / دستگاه‌های من / اطلاعات حساب) — vertical menu on desktop, horizontally scrolling tab row on mobile. Orders list with status chips; addresses; registered devices with serial + warranty dates; account form (name, SMS and newsletter toggles) with a save button that becomes "ذخیره شد ✓" with `arbPop` for 2200ms.
State: `{ tab, saved, name, sms, news, mobile }`.

### 10. Wishlist — `Wishlist.dc.html`

Saved products with price-change tracking (was/now, drop count in the header note). Per card: remove, and add-to-cart that becomes "در سبد خرید"; out-of-stock items show "اطلاع از موجودی". Bulk actions: "افزودن همه موجودها به سبد" (pops to "به سبد اضافه شد ✓") and "پاک کردن همه"; empty state offers restore.
State: `{ ids[], cart[], allAdded, mobile }`.

### 11. Categories — `Categories.dc.html`

Category directory with a use-case switcher ("از کجا شروع کنیم؟" — gaming / creative / office / study), category cards with image slots and subcategory chips, and a closing "نمی‌دانید کدام دسته؟" support CTA.
State: `{ use, mobile }`.

### 12. Search — `Search.dc.html`

Results page; reads `?q=` from the URL. Search field, result-kind tabs (products / articles / categories), result rows, popular-search chips ("جستجوهای پرتکرار"), and a suggestion block when the query is empty.
State: `{ q, kind, mobile }`.

### 13. Compare — `Compare.dc.html`

Up to three devices side by side; add/remove columns, and a "فقط تفاوت‌ها" toggle that filters spec rows to differing values. Horizontally scrolling table on mobile with a sticky spec-label column.
State: `{ ids[], diff, mobile }`.

### 14. Blog — `Blog.dc.html`

Article index: category chips, search field, a featured post, article cards, and a newsletter form ("راهنمای خرید تازه منتشر شد؟") with validation and sent state.
State: `{ cat, q, email, sent, bad, mobile }`.

### 15. BlogPost — `BlogPost.dc.html`

Long-form article. A 3px sticky reading-progress bar sits directly under the header (`top: 72px`, filled violet by scroll percentage). Body sections (زیر بار کامل…, نمایشگر, کیبورد…, برای چه کسی), pull quotes, image slots, share/copy-link button (copied state), save button, and a "خواندن ادامه بدهید" related row.
State: `{ pct, copied, saved, mobile }`.

### 16. About — `About.dc.html`

Dark hero "ما دستگاه را پیش از شما روشن می‌کنیم" with radial glows and a 1600×1200 image slot; stats band (8 / …); "چطور شروع شد"; four principles; timeline "مسیری که آمده‌ایم"; team grid with 800×800 slots; dark closing CTA.
State: `{ mobile }`.

### 17. Support — `Support.dc.html`

Contact page: channel cards (phone, chat, in-person), a request form with a topic selector that changes the hint and textarea placeholder (pre-sale advice / warranty / order issue / corporate), validation (name required, `^0?9\d{9}$` phone, message ≥10 chars) — invalid shakes the form, valid pops the submit button to "درخواست ثبت شد ✓" — plus response hours and a 1600×1000 map slot.
State: `{ topic, name, phone, msg, sent, bad, shake, mobile }`.

### 18. Legal — `Legal.dc.html`

Section switcher (FAQ + policy documents; horizontally scrolling on mobile). FAQ: search field filtering questions and an accordion (one open at a time, animated with `grid-template-rows: 0fr ↔ 1fr`), numbered `01…`; no-results state. Documents: prose pages with headings.
State: `{ sec, open, q, mobile }`.

### 19. NotFound — `NotFound.dc.html`

Centered 404 "این صفحه را پیدا نکردیم" with a search field and links back to store, categories, and support.
State: `{ q, mobile }`.

## State Management

All state in the prototypes is component-local and all data is hard-coded as arrays/objects in each page's logic class (`BASE`, `CFG`, `BRANDS`, `CATS`, `FAQ`, `DOCS`, `ORDERS`, `DEVICES`, `STEPS`, `ITEMS`, `TOPICS`). These are the API seams:

- **Cross-page state that must become global/server state:** cart lines (quantity, coupon, shipping choice), wishlist ids, auth session, cart count shown in header and bottom nav (currently a `cartCount` prop with a literal default of `۲`).
- **Server data:** product catalog + filters + sort, single product configurations and gallery, order list and order detail/tracking, account profile and devices, blog index and post bodies, FAQ and legal documents, search results.
- **Actions to wire:** send OTP / verify OTP (demo code is in the logic class), place order (gateway redirect), upload payment receipt, apply coupon (`ARB10` is a stub), submit support request, newsletter subscribe, add/remove wishlist, add to cart.
- **Purely local UI state that should stay local:** open tab/section/accordion index, sheet and drawer open flags, gallery index, quantity stepper value, toast visibility, copied flags, animation retrigger counters, `mobile` (replace with CSS).

## Validation Rules

- Phone: `^0?9\d{9}$` after stripping non-digits (Login normalizes to 10 digits after `+۹۸`).
- OTP: exactly 4 digits before the verify button enables.
- Support message: ≥10 characters; name non-empty.
- Coupon: exact match `ARB10` (case-insensitive, trimmed) → 10% discount.
- Track order: both fields required; match against order code + phone.
- Quantity: clamped 1–5.
- Error presentation is always the same triad: border → `#E0A3A3`, note text → `#B42318`, container shakes once per attempt.

## Assets

- **Logo:** `brand/logo/` — complete SVG set. Pages reference `brand/logo/lockup/lockup-horizontal-light-bg.svg` (header 30px desktop / 26px mobile / 26px drawer). A dark-background lockup exists in the same folder for the footer. All logo files are SVG; no raster sizes needed.
- **Icons:** inline SVG, 24×24 viewBox, `stroke="currentColor"`, `stroke-width` 1.7–1.9 (2.1 when a nav item is active), round caps and joins. No icon font, no icon library dependency. Replace with the codebase's icon set if it matches this weight; otherwise keep these paths.
- **Photography: none supplied.** Every image position is an `<image-slot>` placeholder (`image-slot.js`) with an id and a Persian description of what belongs there. Required real assets and their intended pixel sizes:
  - Product photography 1200×900 (catalog cards, product gallery, cart/wishlist thumbs)
  - Home hero and category tiles (full-bleed, 16/11 and taller tile crops)
  - About header 1600×1200, team portraits 800×800
  - Support location map 1600×1000
  - Blog article covers
  - Trust badges in the footer (e-Namad-style seals) — currently dashed placeholder tiles
- **Fonts:** Estedad 400/500/600/700 — currently loaded from jsDelivr fontsource; self-host in production.

## Accessibility Notes

- `:focus-visible` rings on every interactive element; drawer and filter sheet close on Escape.
- `aria-label` on all icon-only buttons; `aria-current="page"` on the active bottom-nav item; `aria-expanded` on the drawer trigger; `role="status"` on the add-to-cart toast; `aria-hidden` on decorative glows, spacers, and scroll indicators.
- Body scroll is locked while an overlay is open.
- Text contrast targets ≥4.5:1 (≥3:1 for headline-scale type); the smallest text used in real content is 13px on mobile / 12px desktop captions.
- Not yet done and worth doing in implementation: focus trapping inside the drawer and filter sheet, and a skip-to-content link.

## Files

```
design_handoff_arbyte_storefront/
├── README.md              ← this document
├── WORKFLOW.md            ← design log: page order, phase 2 (responsive) and phase 3 (motion) decisions
├── pages/                 ← the 19 screens + 3 shared components (HTML design references)
│   ├── Home.dc.html            Products.dc.html      Product.dc.html
│   ├── Cart.dc.html            Checkout.dc.html      OrderStatus.dc.html
│   ├── TrackOrder.dc.html      Login.dc.html         Account.dc.html
│   ├── Wishlist.dc.html        Categories.dc.html    Search.dc.html
│   ├── Compare.dc.html         Blog.dc.html          BlogPost.dc.html
│   ├── About.dc.html           Support.dc.html       Legal.dc.html
│   ├── NotFound.dc.html
│   ├── SiteHeader.dc.html      MobileNav.dc.html     SiteFooter.dc.html
│   ├── support.js         ← prototyping runtime (do NOT port)
│   └── image-slot.js      ← image placeholder component (do NOT port; replace with real images)
└── brand/logo/            ← SVG logo set
```

Note on the logo path: inside the original project the pages reference the logo as `../../brand/logo/…` (project root). In this bundle the logo set sits at `brand/logo/` next to `pages/`, so if you open a page from the bundle the header logo may not resolve — point it at `../brand/logo/lockup/lockup-horizontal-light-bg.svg` or view the pages in the original project. Nothing else depends on paths outside `pages/`.

Open any `pages/*.dc.html` directly in a browser to see the design. Resize below 768px to see the mobile layout. Each file's template is the markup between `<x-dc>` and `</x-dc>`; the logic class at the bottom holds data, state, and the computed values the template reads.
