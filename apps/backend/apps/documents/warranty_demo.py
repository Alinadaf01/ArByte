"""DEMO — داده‌ی نمونه‌ی کارت گارانتی (بریف اصلاح ۱۱). فقط برای پیش‌نمایش
طراحی در docs/design/documents/warranty-demo.*؛ هیچ کد تولیدی این ماژول را
import نمی‌کند و قالب تولید هیچ متن نمونه‌ای ندارد. بدون دیتابیس: کارت‌ها
مستقیم به همان شکل خروجی `build_warranty_card` ساخته می‌شوند، پس پنج حالت
بریف بدون ساخت سفارش/محصول ساختگی در دیتابیس رندر می‌شوند.

    python manage.py render_warranty_demo
"""

from django.template.loader import render_to_string

from .arbyte_context import arbyte_base_context
from .pdf import brand_logo_uri, render_pdf
from .qr_barcode import qr_code_svg
from .warranty_card import PAGE_MARGIN, TRACK_ORDER_DISPLAY, TRACK_ORDER_URL

DEMO_TERMS = (
    "(DEMO) این متن فقط نمونه‌ی نمایشی است؛ در سند واقعی، متن شرایط از تنظیمات سایت "
    "(SiteSettings.warranty_terms) خوانده می‌شود و اگر خالی باشد این بخش نمایش داده نمی‌شود.\n"
    "(DEMO) بند دوم نمونه برای نمایش شکست خط و فاصله‌گذاری چندبندی."
)

_BASE = {
    "issue_date": "۷ مهر ۱۴۰۵",
    "customer_name": "مشتری نمونه (DEMO)",
    "customer_phone": "۰۹۱۲۰۰۰۰۰۰۰",
    "purchase_date": "۲ مهر ۱۴۰۵",
    "test_period_days": 7,
    "test_period_days_fa": "۷",
    "terms": DEMO_TERMS,
    "track_url_display": TRACK_ORDER_DISPLAY,
}

_PENDING = {"start_label": "از تاریخ تحویل", "end_label": "از تاریخ تحویل", "known": False}
_DELIVERED_TEST = {"start_label": "۵ مهر ۱۴۰۵", "end_label": "۱۲ مهر ۱۴۰۵", "known": True}
_DELIVERED_WARRANTY = {"start_label": "۵ مهر ۱۴۰۵", "end_label": "۵ مهر ۱۴۰۷", "known": True}
_LAPTOP_SPECS = [
    {"label": "پردازنده", "value": "Intel Core Ultra 9 275HX"},
    {"label": "گرافیک", "value": "RTX 5080 16GB"},
    {"label": "حافظه / ذخیره‌سازی", "value": "32GB / 2TB SSD"},
    {"label": "نمایشگر", "value": "18\" QHD+ 240Hz"},
    {"label": "وزن", "value": "۳٫۱ کیلوگرم"},
]


def _card(order_number: str, certificate_id: str, **overrides) -> dict:
    card = {
        **_BASE,
        "order_number": order_number,
        "certificate_id": certificate_id,
        "qr_svg": qr_code_svg(f"{TRACK_ORDER_URL}?code={order_number}"),
        "has_warranty": False,
        "warranty": None,
        "has_shipping": False,
        "carrier_name": "",
        "tracking_number": "",
        "shipped_date": "",
    }
    card.update(overrides)
    return card


def demo_cards() -> list[tuple[str, dict]]:
    """(نام حالت، کارت) — پنج حالت بریف + حالت داده‌ی بلند."""
    return [
        ("۱. فقط مهلت تست (اپن باکس، ارسال‌شده)", _card(
            "ARB-DEMO0001", "ARB-W-DEMO0001",
            product_name="لپ‌تاپ ایسوس Zenbook 14 OLED (DEMO)",
            product_brand="ASUS", product_model="UX3405MA", product_condition="اپن باکس",
            key_specs=[{"label": "پیکربندی", "value": "16GB / 1TB"}],
            serial_number="DEMO-SN-0001",
            test_period=_DELIVERED_TEST,
            has_shipping=True, carrier_name="پست پیشتاز", tracking_number="DEMO-TRK-0001", shipped_date="۳ مهر ۱۴۰۵",
        )),
        ("۲. گارانتی + مهلت تست (آکبند، تحویل‌شده)", _card(
            "ARB-DEMO0002", "ARB-W-DEMO0002",
            product_name="لپ‌تاپ گیمینگ MSI Titan 18 HX AI (DEMO)",
            product_brand="MSI", product_model="A2XWJG", product_condition="آکبند",
            key_specs=_LAPTOP_SPECS, serial_number="DEMO-K2410N0012345",
            test_period=_DELIVERED_TEST,
            has_warranty=True, warranty_months=24, warranty_months_fa="۲۴", warranty_provider="گارانتی شرکتی (DEMO)",
            warranty=_DELIVERED_WARRANTY,
            has_shipping=True, carrier_name="تیپاکس", tracking_number="DEMO-TPX-88213", shipped_date="۳ مهر ۱۴۰۵",
        )),
        ("۳. بدون گارانتی (استوک)", _card(
            "ARB-DEMO0003", "ARB-W-DEMO0003",
            product_name="سرفیس پرو ۹ استوک (DEMO)",
            product_brand="Microsoft", product_model="Surface Pro 9", product_condition="استوک",
            key_specs=[{"label": "پیکربندی", "value": "i7 / 16GB / 256GB"}],
            serial_number="DEMO-SN-0003",
            test_period=_PENDING,
            has_shipping=True, carrier_name="پست پیشتاز", tracking_number="DEMO-TRK-0003", shipped_date="۶ مهر ۱۴۰۵",
        )),
        ("۴. با اطلاعات ارسال، گارانتی قبل از تحویل (در حد نو)", _card(
            "ARB-DEMO0004", "ARB-W-DEMO0004",
            product_name="کیس گیمینگ آربایت RTX 5070 Ti (DEMO)",
            product_brand="ArByte", product_model="AB-G5070TI", product_condition="در حد نو",
            key_specs=[
                {"label": "پردازنده", "value": "Ryzen 7 9800X3D"},
                {"label": "گرافیک", "value": "RTX 5070 Ti 16GB"},
                {"label": "حافظه", "value": "32GB DDR5"},
            ],
            serial_number="DEMO-SN-0004",
            test_period=_PENDING,
            has_warranty=True, warranty_months=12, warranty_months_fa="۱۲", warranty_provider="گارانتی آربایت (DEMO)",
            warranty=_PENDING,
            has_shipping=True, carrier_name="باربری نمونه (DEMO)", tracking_number="", shipped_date="۶ مهر ۱۴۰۵",
        )),
        ("۵. در انتظار ارسال (آکبند، گارانتی)", _card(
            "ARB-DEMO0005", "ARB-W-DEMO0005",
            product_name="لپ‌تاپ لنوو Legion Pro 7 (DEMO)",
            product_brand="Lenovo", product_model="16IAX10H", product_condition="آکبند",
            key_specs=_LAPTOP_SPECS[:3], serial_number="DEMO-PF5XK2A1",
            test_period=_PENDING,
            has_warranty=True, warranty_months=18, warranty_months_fa="۱۸", warranty_provider="گارانتی شرکتی (DEMO)",
            warranty=_PENDING,
        )),
        ("۶. داده‌ی بلند (نام ۱۲۰ نویسه، شرایط طولانی)", _card(
            "ARB-DEMO0006", "ARB-W-DEMO0006",
            customer_name="مشتری نمونه با نام و نام خانوادگی بسیار طولانی برای آزمون شکست خط (DEMO)",
            product_name=(
                "لپ‌تاپ گیمینگ ایسوس ROG Strix SCAR 18 نسل جدید با پردازنده‌ی Core Ultra 9 "
                "و کارت گرافیک RTX 5090 نسخه‌ی ویژه (DEMO)"
            ),
            product_brand="ASUS", product_model="G835LX-SA123W", product_condition="آکبند",
            key_specs=_LAPTOP_SPECS + [{"label": "سیستم‌عامل", "value": "Windows 11 Home"}],
            serial_number="DEMO-S9N0CV12345678901",
            test_period=_DELIVERED_TEST,
            has_warranty=True, warranty_months=24, warranty_months_fa="۲۴", warranty_provider="گارانتی شرکتی (DEMO)",
            warranty=_DELIVERED_WARRANTY,
            has_shipping=True, carrier_name="تیپاکس", tracking_number="DEMO-TPX-000000123456", shipped_date="۳ مهر ۱۴۰۵",
            terms="\n".join(f"(DEMO) بند {i} — " + "متن نمونه‌ی طولانی برای آزمون جریان شرایط در صفحه. " * 6 for i in range(1, 13)),
        )),
    ]


def demo_context() -> dict:
    ctx = arbyte_base_context(doc_title="کارت گارانتی — DEMO", doc_number="DEMO")
    ctx["logo_mono_uri"] = brand_logo_uri("logo-mono-black.png")
    ctx["seller_phone"] = ctx["seller_phone"] or "۰۲۱-۰۰۰۰۰۰۰۰ (DEMO)"
    ctx["seller_address"] = ctx["seller_address"] or "نشانی نمونه‌ی فروشگاه (DEMO)"
    ctx["cards"] = [card for _, card in demo_cards()]
    return ctx


def render_demo_html() -> str:
    return render_to_string("arbyte/warranty_cards_bulk.html", demo_context())


def render_demo_pdf() -> bytes:
    return render_pdf("arbyte/warranty_cards_bulk.html", demo_context(), margin=PAGE_MARGIN, footer_html="")
