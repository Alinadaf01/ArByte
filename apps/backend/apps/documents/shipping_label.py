from apps.orders.models import Order

from .arbyte_context import arbyte_base_context
from .pdf import render_pdf
from .qr_barcode import code128_barcode_svg


def build_shipping_label_context(order: Order) -> dict:
    """برچسب ۱۰×۱۵ روی بسته -- فرستنده/گیرنده/کد پستی درشت/بارکد شماره
    سفارش، برای چاپگر حرارتی (سیاه‌وسفید، بدون وابستگی به رنگ)."""
    shipment = getattr(order, "shipment", None)
    ctx = arbyte_base_context(doc_title="برچسب ارسال", logo_variant="mono-black")
    ctx.update(
        {
            "order": order,
            "receiver_name": order.shipping_recipient_name,
            "receiver_phone": order.shipping_mobile,
            "receiver_address": "، ".join(
                part for part in [order.shipping_province, order.shipping_city, order.shipping_address_line] if part
            ),
            "postal_code": order.shipping_postal_code or "",
            "carrier_name": shipment.provider if shipment else "",
            "barcode_svg": code128_barcode_svg(order.order_number, module_height=12.0),
        }
    )
    return ctx


def render_shipping_label_pdf(order: Order) -> bytes:
    context = build_shipping_label_context(order)
    return render_pdf(
        "arbyte/shipping_label.html", context, width="100mm", height="150mm", margin="5mm", footer_html=""
    )
