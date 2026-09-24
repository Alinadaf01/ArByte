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

from functools import lru_cache
from pathlib import Path

from django.template.loader import render_to_string
from django.utils.html import escape
from playwright.sync_api import sync_playwright

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


def peyda_font_uri(weight_filename: str) -> str:
    return (PUBLIC_FONTS_DIR / "peyda" / weight_filename).as_uri()


def jetbrains_mono_font_uri(weight_filename: str) -> str:
    return (PUBLIC_FONTS_DIR / "jetbrains-mono" / weight_filename).as_uri()


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


def render_pdf(template_name: str, context: dict, *, landscape: bool = False) -> bytes:
    html = render_to_string(template_name, context)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        try:
            page = browser.new_page()
            page.set_content(html, wait_until="load")
            pdf_bytes = page.pdf(
                format="A4",
                landscape=landscape,
                print_background=True,
                margin={"top": "18mm", "bottom": "18mm", "left": "18mm", "right": "18mm"},
                display_header_footer=True,
                header_template="<div></div>",
                footer_template=_footer_template(generated_at=context.get("generated_at", "")),
            )
        finally:
            browser.close()
    return pdf_bytes
