from apps.orders.models import Order

from .context import base_context
from .pdf import render_pdf


def build_packing_slip_context(order: Order, *, generated_by_name: str) -> dict:
    """No prices — this rides inside the box for the customer to open, and is
    read by warehouse staff while packing, not for billing (BACKEND-TASK.md
    §3.6-ب: 'برگه بسته‌بندی — پرینت می‌شود و داخل جعبه می‌رود')."""
    address = order.shipping_address or {}
    ctx = base_context(
        doc_title="برگه بسته‌بندی",
        generated_by_name=generated_by_name,
        doc_number=order.number,
    )
    ctx.update(
        {
            "order": order,
            "buyer_name": address.get("receiverName", ""),
            "buyer_phone": address.get("receiverPhone", ""),
            "shipping_address_line": ", ".join(
                part for part in [address.get("province", ""), address.get("city", ""), address.get("line", "")] if part
            ),
            "postal_code": address.get("postalCode", ""),
            "items": [
                {
                    "name": item.product_name + (f" ({item.color_name})" if item.color_name else ""),
                    "sku": item.sku,
                    "quantity": item.quantity,
                }
                for item in order.items.all()
            ],
            "item_count": sum(item.quantity for item in order.items.all()),
            "note": order.note,
        }
    )
    return ctx


def render_packing_slip_pdf(order: Order, *, generated_by_name: str) -> bytes:
    context = build_packing_slip_context(order, generated_by_name=generated_by_name)
    return render_pdf("documents/packing_slip.html", context)
