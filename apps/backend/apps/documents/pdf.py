"""HTML -> PDF via headless Chromium (Playwright), per BACKEND-TASK.md §3.6 —
ReportLab/FPDF-style PDF libraries don't shape Arabic-script text or run the
bidi algorithm, so they mangle Persian. A real browser engine renders RTL and
Persian ligatures correctly because it's the same code path as an actual
browser tab.

A fresh browser instance is launched per call rather than kept warm across
requests — simpler and safe under Django's multi-process/multi-thread WSGI
workers, at the cost of ~300-500ms of Chromium startup per document. Fine for
per-order documents; list-style admin exports that could be slow run through
Celery (see apps/documents/tasks.py) so that cost never blocks a web worker.
"""

import base64
from functools import lru_cache
from pathlib import Path

from decouple import config as env_config
from django.template.loader import render_to_string
from django.utils.html import escape
from playwright.sync_api import sync_playwright

# D-01 §۴ — cdn.playwright.dev از IP این کشور ۴۰۳/timeout می‌دهد، پس
# `playwright install chromium` روی ماشین dev کامل نمی‌شود (Dockerfile
# پروداکشن، از سروری که مسدود نیست، مستقل از این تنظیم است). اگر ست شده،
# مستقیم یک Chrome/Chromium نصب‌شده‌ی دیگر روی ماشین را اجرا می‌کند --
# فقط برای رندر دستی/دمو محلی، نه چیزی که تست‌های خودکار به آن وابسته باشند
# (آن‌ها sync_playwright را mock می‌کنند، همان الگوی D-01).
PLAYWRIGHT_CHROMIUM_EXECUTABLE = env_config("PLAYWRIGHT_CHROMIUM_EXECUTABLE", default="")

# NOTE: these assets are duplicated from the repo-root public/ (the
# storefront's own static assets) rather than referenced there directly.
# The Docker build context for this backend is just backend/ (see
# .github/workflows/build-backend-image.yml) since the storefront and
# backend deploy completely independently (storefront on Vercel, backend
# on the VPS) -- a path reaching outside backend/ can never resolve
# inside the container. Confirmed live: this was never actually run
# inside a real container until stage 8 verification, and every PDF
# generation failed with FileNotFoundError.
PUBLIC_FONTS_DIR = Path(__file__).resolve().parent.parent.parent / "public" / "fonts"
BRAND_DIR = Path(__file__).resolve().parent.parent.parent / "public" / "brand"

# The footer template renders in an isolated Playwright document that can't
# inherit the page's <style> (see _footer_template below), so this one color
# it needs is duplicated from the palette in base.html rather than shared.
TITANIUM = "#7A7D82"


_MIME_TYPES = {".woff2": "font/woff2", ".png": "image/png", ".svg": "image/svg+xml"}


@lru_cache(maxsize=32)
def _data_uri(path: Path) -> str:
    """`page.set_content()` سند را روی about:blank باز می‌کند و Chromium از
    آنجا هیچ زیرمنبع `file://` را بار نمی‌کند -- با `as_uri()` لوگو شکسته و
    فونت به fallback سیستم برمی‌گشت (رندر واقعی: `naturalWidth == 0`،
    `document.fonts` → error). پس دارایی‌ها inline به‌صورت data URI می‌آیند؛
    هر فایل چند ده کیلوبایت است و یک بار در هر پروسه خوانده می‌شود."""
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{_MIME_TYPES[path.suffix]};base64,{encoded}"


def peyda_font_uri(weight_filename: str) -> str:
    return _data_uri(PUBLIC_FONTS_DIR / "peyda" / weight_filename)


def jetbrains_mono_font_uri(weight_filename: str) -> str:
    return _data_uri(PUBLIC_FONTS_DIR / "jetbrains-mono" / weight_filename)


def estedad_font_uri(weight_filename: str) -> str:
    """E-04 §۰ — سه سند مشتری‌محور (فاکتور/بسته‌بندی/گارانتی) از فونت واقعی
    برند (Estedad) استفاده می‌کنند، نه Peyda's میراث وایب. خودمیزبان از
    apps/backend/public/fonts/estedad (کپی از apps/web، همان دلیل کپی
    فونت‌های Peyda بالا -- Docker build context فقط backend/ است)."""
    return _data_uri(PUBLIC_FONTS_DIR / "estedad" / weight_filename)


def brand_logo_uri(filename: str) -> str:
    """`logo-horizontal-light.png`/`logo-full-light.png`/`logo-mono-black.png`
    -- کپی واقعی و تأییدشده‌ی E-01 (apps/web/public/brand)، نه وردمارک
    جای‌گذاری‌شده‌ی `store_wordmark_svg` پایین (که هنوز خالی است)."""
    return _data_uri(BRAND_DIR / filename)


@lru_cache(maxsize=1)
def store_wordmark_svg() -> str:
    """Inline, single-path `fill="currentColor"` markup — used instead of the
    uploaded SiteSettings logo image, whose colors we don't control and could
    violate the fixed five-color palette. Colored via CSS `color:` on the
    wrapping element.

    ArByte's own wordmark asset hasn't been supplied yet (imported from
    vybeshop@a6b5927, D-01) — the vybeshop wordmark was real vybeshop
    trademark artwork and was deleted rather than kept as a placeholder.
    Returns "" until `public/brand/arbyte-wordmark.svg` exists; PDF
    templates must tolerate an empty wordmark (see base.html)."""
    path = BRAND_DIR / "arbyte-wordmark.svg"
    return path.read_text(encoding="utf-8") if path.exists() else ""


def _footer_template(*, generated_at: str) -> str:
    """Runs in its own isolated document (Playwright header/footer templates
    don't inherit the page's <style>), so fonts are re-declared here from the
    same local font files. `.pageNumber`/`.totalPages` are Chromium-provided
    classes it fills in per printed page — this is the only reliable way to
    get a *repeating* footer with live page numbers; plain HTML content only
    renders once, at its position in the flow."""
    return f"""
    <style>
      @font-face {{ font-family: "Peyda"; src: url("{peyda_font_uri('Peyda-Regular.woff2')}") format("woff2"); font-weight: 400; }}
      @font-face {{ font-family: "JetBrains Mono"; src: url("{jetbrains_mono_font_uri('JetBrainsMono-Regular.woff2')}") format("woff2"); font-weight: 400; }}
    </style>
    <div style="width:100%; margin:0 18mm; display:grid; grid-template-columns:1fr 1fr 1fr;
                font-family:'Peyda',sans-serif; font-size:8pt; color:{TITANIUM}; direction:rtl;">
      <span style="text-align:start;">arbyte.ir</span>
      <span style="text-align:center; font-family:'JetBrains Mono',monospace; direction:ltr;">
        صفحه <span class="pageNumber"></span> از <span class="totalPages"></span>
      </span>
      <span style="text-align:end;">{escape(generated_at)}</span>
    </div>
    """


def arbyte_footer_template(*, generated_at: str) -> str:
    """E-04 §۰ — همان الگوی سه‌ستونیِ صفحه‌شمار بالا، فقط با فونت Estedad
    خودمیزبان و رنگ متن نقره‌ای پروژه (`--palette-ink-2`) به‌جای پالت
    گرافیت/سیان وایب."""
    return f"""
    <style>
      @font-face {{ font-family: "Estedad"; src: url("{estedad_font_uri('Estedad-400.woff2')}") format("woff2"); font-weight: 400; }}
    </style>
    <div style="width:100%; margin:0 12mm; display:grid; grid-template-columns:1fr 1fr 1fr;
                font-family:'Estedad',sans-serif; font-size:8pt; color:#3d3950; direction:rtl;">
      <span style="text-align:start;">arbyte.ir</span>
      <span style="text-align:center; direction:ltr;">
        صفحه <span class="pageNumber"></span> از <span class="totalPages"></span>
      </span>
      <span style="text-align:end;">{escape(generated_at)}</span>
    </div>
    """


def render_pdf(
    template_name: str,
    context: dict,
    *,
    landscape: bool = False,
    page_format: str = "A4",
    width: str | None = None,
    height: str | None = None,
    margin: str = "18mm",
    footer_html: str | None = None,
) -> bytes:
    """`footer_html`: `None` (پیش‌فرض) یعنی همان فوتر قدیمی سه‌ستونیِ Peyda
    (گزارش‌های ادمین وایب، بدون تغییر رفتار)؛ رشته‌ی خالی `""` یعنی بدون
    فوتر (برچسب حرارتی ۱۰×۱۵ جا برای فوتر ندارد)؛ هر رشته‌ی دیگر مستقیم
    به‌عنوان `footer_template` پلی‌رایت استفاده می‌شود (اسناد آربایت،
    `arbyte_footer_template`). `width`/`height` اگر پر باشند به‌جای
    `page_format` استفاده می‌شوند (برچسب ارسال ۱۰۰mm×۱۵۰mm)."""
    html = render_to_string(template_name, context)
    pdf_kwargs = {
        "landscape": landscape,
        "print_background": True,
        "margin": {"top": margin, "bottom": margin, "left": margin, "right": margin},
    }
    if width and height:
        pdf_kwargs["width"] = width
        pdf_kwargs["height"] = height
    else:
        pdf_kwargs["format"] = page_format

    if footer_html == "":
        pdf_kwargs["display_header_footer"] = False
    else:
        pdf_kwargs["display_header_footer"] = True
        pdf_kwargs["header_template"] = "<div></div>"
        pdf_kwargs["footer_template"] = (
            footer_html if footer_html is not None else _footer_template(generated_at=context.get("generated_at", ""))
        )

    with sync_playwright() as playwright:
        launch_kwargs = {"executable_path": PLAYWRIGHT_CHROMIUM_EXECUTABLE} if PLAYWRIGHT_CHROMIUM_EXECUTABLE else {}
        browser = playwright.chromium.launch(**launch_kwargs)
        try:
            page = browser.new_page()
            page.set_content(html, wait_until="load")
            pdf_bytes = page.pdf(**pdf_kwargs)
        finally:
            browser.close()
    return pdf_bytes
