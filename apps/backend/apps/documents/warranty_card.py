from django.utils import timezone

from apps.orders.models import Order, OrderItemUnit
from apps.settings.models import SiteSettings

from .arbyte_context import arbyte_base_context
from .arbyte_formatting import add_months, format_jalali_date_fa
from .pdf import render_pdf
from .qr_barcode import qr_code_svg

TRACK_ORDER_URL = "https://arbyte.ir/track-order"


def _period_dates(start, days: int | None = None, months: int | None = None) -> dict:
    """`start` می‌تواند None باشد (هنوز DELIVERED نشده) -- بریف اصلاح ۹:
    «قبل از تحویل: از تاریخ تحویل»."""
    if start is None:
        return {"start_label": "از تاریخ تحویل", "end_label": "از تاریخ تحویل", "known": False}
    end = start + timezone.timedelta(days=days) if days is not None else add_months(start, months)
    return {"start_label": format_jalali_date_fa(start), "end_label": format_jalali_date_fa(end), "known": True}


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
    has_shipping = bool(shipment and shipment.tracking_number)

    return {
        "certificate_id": unit.certificate_id,
        "order_number": order.order_number,
        "issue_date": format_jalali_date_fa(timezone.localtime(timezone.now())),
        "customer_name": order.shipping_recipient_name,
        "customer_phone": order.shipping_mobile,
        "product_name": item.product_name_snapshot,
        "product_brand": product.brand.name if product else "",
        "product_model": product.model_number if product else "",
        "product_condition": product.get_condition_display() if product else "",
        "product_specs": item.variant_name_snapshot,
        "serial_number": unit.serial_number,
        "purchase_date": format_jalali_date_fa(order.paid_at or order.created_at),
        "test_period_days": settings_obj.test_period_days,
        "test_period": test_period,
        "has_warranty": has_warranty,
        "warranty_months": product.warranty_months if has_warranty else None,
        "warranty_provider": product.warranty_provider if has_warranty else "",
        "warranty": warranty,
        "has_shipping": has_shipping,
        "carrier_name": shipment.provider if shipment else "",
        "tracking_number": shipment.tracking_number if shipment else "",
        "terms": settings_obj.warranty_terms,
        "qr_svg": qr_code_svg(f"{TRACK_ORDER_URL}?order={order.order_number}"),
    }


def build_single_warranty_context(unit: OrderItemUnit) -> dict:
    ctx = arbyte_base_context(doc_title="کارت گارانتی", doc_number=unit.certificate_id)
    ctx["card"] = build_warranty_card(unit)
    return ctx


def render_warranty_card_pdf(unit: OrderItemUnit) -> bytes:
    context = build_single_warranty_context(unit)
    return render_pdf("arbyte/warranty_card.html", context, margin="10mm", footer_html="")


def render_warranty_cards_pdf(order: Order) -> bytes:
    """ادمین -- همه‌ی واحدهای سفارش در یک فایل، هر کدام یک صفحه."""
    ctx = arbyte_base_context(doc_title="کارت‌های گارانتی", doc_number=order.order_number)
    units = OrderItemUnit.objects.filter(order_item__order=order).select_related(
        "order_item__order", "order_item__variant__product__brand"
    )
    ctx["cards"] = [build_warranty_card(unit) for unit in units]
    return render_pdf("arbyte/warranty_cards_bulk.html", ctx, margin="10mm", footer_html="")
