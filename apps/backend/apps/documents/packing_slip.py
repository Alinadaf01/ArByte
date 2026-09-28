from apps.orders.models import Order

from .context import base_context
from .pdf import render_pdf


def build_packing_slip_context(order: Order, *, generated_by_name: str) -> dict:
    """No prices — this rides inside the box for the customer to open, and is
    read by warehouse staff while packing, not for billing (BACKEND-TASK.md
    §3.6-ب: 'برگه بسته‌بندی — پرینت می‌شود و داخل جعبه می‌رود'). D-05 §۱ —
    آدرس دیگر JSON blob نیست، فیلدهای شناخته‌شده روی خودِ Order."""
    ctx = base_context(
        doc_title="برگه بسته‌بندی",
        generated_by_name=generated_by_name,
        doc_number=order.order_number,
    )
    ctx.update(
        {
            "order": order,
            "buyer_name": order.shipping_recipient_name,
            "buyer_phone": order.shipping_mobile,
            "shipping_address_line": ", ".join(
                part for part in [order.shipping_province, order.shipping_city, order.shipping_address_line] if part
            ),
            "postal_code": order.shipping_postal_code or "",
            "items": [
                {
                    "name": item.product_name_snapshot
                    + (f" ({item.variant_name_snapshot})" if item.variant_name_snapshot else ""),
                    "sku": item.sku_snapshot,
                    "quantity": item.quantity,
                }
                for item in order.items.all()
            ],
            "item_count": sum(item.quantity for item in order.items.all()),
        }
    )
    return ctx


def render_packing_slip_pdf(order: Order, *, generated_by_name: str) -> bytes:
    context = build_packing_slip_context(order, generated_by_name=generated_by_name)
    return render_pdf("documents/packing_slip.html", context)
