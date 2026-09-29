from django.utils import timezone

from apps.orders.models import Order, OrderItem, OrderItemUnit
from apps.settings.models import SiteSettings

from .arbyte_context import arbyte_base_context
from .arbyte_formatting import add_months, format_jalali_date_fa, to_persian_digits
from .pdf import brand_logo_uri, render_pdf
from .qr_barcode import qr_code_svg

# E-05 — صفحه‌ی واقعی پیگیری (apps/web/src/app/track-order) فقط `?code=` را
# می‌خواند و فیلد شماره سفارش را از آن پر می‌کند؛ `?order=` قبلی نادیده
# گرفته می‌شد و QR مشتری را به فرم خالی می‌برد.
TRACK_ORDER_URL = "https://arbyte.ir/track-order"
TRACK_ORDER_DISPLAY = "arbyte.ir/track-order"

# بریف اصلاح ۶ — برچسب‌های enum-labels پروژه (packages/contracts
# messages/product.ts's `condition`)، نه get_condition_display() که
# املای متفاوت («اپن‌باکس»، «درحدنو») دارد.
CONDITION_LABELS = {
    "NEW": "آکبند",
    "OPEN_BOX": "اپن باکس",
    "STOCK": "استوک",
    "LIKE_NEW": "در حد نو",
}

MAX_KEY_SPECS = 6

# A4 با حاشیه‌ی امن چاپ؛ ارتفاع مفید (۲۹۷ − ۲×۱۲ = ۲۷۳mm) در
# _warranty_card_style.html برای چسباندن فوتر به پایین صفحه استفاده می‌شود.
PAGE_MARGIN = "12mm"


def _period_dates(start, days: int | None = None, months: int | None = None) -> dict:
    """`start` می‌تواند None باشد (هنوز DELIVERED نشده) -- بریف اصلاح ۹:
    «قبل از تحویل: از تاریخ تحویل»."""
    if start is None:
        return {"start_label": "از تاریخ تحویل", "end_label": "از تاریخ تحویل", "known": False}
    end = start + timezone.timedelta(days=days) if days is not None else add_months(start, months)
    return {"start_label": format_jalali_date_fa(start), "end_label": format_jalali_date_fa(end), "known": True}


def _key_specs(item: OrderItem) -> list[dict]:
    """مشخصات کلیدی: `spec_snapshot` اگر پر باشد (dict یا لیست {label, value})،
    وگرنه پیکربندی واریانت (`variant_name_snapshot`، مثلاً «32GB/1TB»)."""
    snapshot = item.spec_snapshot
    specs: list[dict] = []
    if isinstance(snapshot, dict):
        specs = [{"label": str(k), "value": str(v)} for k, v in snapshot.items() if v not in (None, "")]
    elif isinstance(snapshot, list):
        specs = [
            {"label": str(s.get("label", "")), "value": str(s.get("value", ""))}
            for s in snapshot
            if isinstance(s, dict) and s.get("value") not in (None, "")
        ]
    if not specs and item.variant_name_snapshot:
        specs = [{"label": "پیکربندی", "value": item.variant_name_snapshot}]
    return specs[:MAX_KEY_SPECS]


def build_warranty_card(unit: OrderItemUnit) -> dict:
    """یک کارت به ازای هر واحد (E-03 §۳'س OrderItemUnit) -- سریال و
    certificate_id از همان‌جا. مهلت تست/گارانتی هر دو از DELIVERED شروع
    می‌شوند (docs/QUESTIONS.md، تصمیم مدیر پروژه)."""
    order = unit.order_item.order
    item = unit.order_item
    variant = item.variant
    product = variant.product if variant else None
    settings_obj = SiteSettings.load()
    shipment = getattr(order, "shipment", None)

    test_period = _period_dates(order.delivered_at, days=settings_obj.test_period_days)
    has_warranty = bool(product and product.warranty_months)
    warranty = _period_dates(order.delivered_at, months=product.warranty_months) if has_warranty else None
    has_shipping = bool(shipment and (shipment.provider or shipment.tracking_number))
    shipped_at = (shipment.shipped_at if shipment else None) or order.shipped_at

    return {
        "certificate_id": unit.certificate_id,
        "order_number": order.order_number,
        "issue_date": format_jalali_date_fa(timezone.localtime(timezone.now())),
        "customer_name": order.shipping_recipient_name,
        "customer_phone": to_persian_digits(order.shipping_mobile or ""),
        "product_name": item.product_name_snapshot,
        "product_brand": product.brand.name if product else "",
        "product_model": (product.model_number or "") if product else "",
        "product_condition": CONDITION_LABELS.get(product.condition, "") if product else "",
        "key_specs": _key_specs(item),
        "serial_number": unit.serial_number or "",
        "purchase_date": format_jalali_date_fa(order.paid_at or order.created_at),
        "test_period_days": settings_obj.test_period_days,
        "test_period_days_fa": to_persian_digits(str(settings_obj.test_period_days)),
        "test_period": test_period,
        "has_warranty": has_warranty,
        "warranty_months": product.warranty_months if has_warranty else None,
        "warranty_months_fa": to_persian_digits(str(product.warranty_months)) if has_warranty else "",
        "warranty_provider": (product.warranty_provider or "") if has_warranty else "",
        "warranty": warranty,
        "has_shipping": has_shipping,
        "carrier_name": shipment.provider if shipment else "",
        "tracking_number": (shipment.tracking_number or "") if shipment else "",
        "shipped_date": format_jalali_date_fa(timezone.localtime(shipped_at)) if shipped_at else "",
        "terms": settings_obj.warranty_terms.strip(),
        "track_url_display": TRACK_ORDER_DISPLAY,
        "qr_svg": qr_code_svg(f"{TRACK_ORDER_URL}?code={order.order_number}"),
    }


def _warranty_base_context(*, doc_title: str, doc_number: str) -> dict:
    ctx = arbyte_base_context(doc_title=doc_title, doc_number=doc_number)
    ctx["logo_mono_uri"] = brand_logo_uri("logo-mono-black.png")
    return ctx


def build_single_warranty_context(unit: OrderItemUnit) -> dict:
    ctx = _warranty_base_context(doc_title="کارت گارانتی و مهلت تست", doc_number=unit.certificate_id)
    ctx["card"] = build_warranty_card(unit)
    return ctx


def render_warranty_card_pdf(unit: OrderItemUnit) -> bytes:
    context = build_single_warranty_context(unit)
    return render_pdf("arbyte/warranty_card.html", context, margin=PAGE_MARGIN, footer_html="")


def render_warranty_cards_pdf(order: Order) -> bytes:
    """ادمین -- همه‌ی واحدهای سفارش در یک فایل، هر کدام از صفحه‌ی جدید."""
    ctx = _warranty_base_context(doc_title="کارت‌های گارانتی و مهلت تست", doc_number=order.order_number)
    units = OrderItemUnit.objects.filter(order_item__order=order).select_related(
        "order_item__order__shipment", "order_item__variant__product__brand"
    )
    ctx["cards"] = [build_warranty_card(unit) for unit in units]
    return render_pdf("arbyte/warranty_cards_bulk.html", ctx, margin=PAGE_MARGIN, footer_html="")
