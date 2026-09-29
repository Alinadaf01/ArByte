from apps.orders.models import Order

from .arbyte_context import arbyte_base_context
from .pdf import render_pdf

# E-04 §۲ — چک‌لیست ثابت محتویات بسته (متن سند تسک، نه چیزی که ادمین
# تنظیم کند).
_PACKING_CHECKLIST = ["دستگاه", "شارژر", "کارت گارانتی", "فاکتور"]


def build_packing_slip_context(order: Order) -> dict:
    """A5، داخل جعبه -- بدون قیمت (کارکنان انبار/مشتری هر دو می‌بینند)،
    با سریال هر واحد (E-03's OrderItemUnit)."""
    ctx = arbyte_base_context(doc_title="برگه بسته‌بندی", doc_number=order.order_number, logo_variant="mono-black")
    rows = []
    for item in order.items.select_related("variant__product").prefetch_related("units").all():
        units = list(item.units.all())
        if units:
            for unit in units:
                rows.append(
                    {
                        "name": item.product_name_snapshot,
                        "variant_label": item.variant_name_snapshot,
                        "sku": item.sku_snapshot,
                        "serial": unit.serial_number or "",
                    }
                )
        else:
            rows.append(
                {
                    "name": item.product_name_snapshot,
                    "variant_label": item.variant_name_snapshot,
                    "sku": item.sku_snapshot,
                    "quantity": item.quantity,
                    "serial": None,
                }
            )
    ctx.update(
        {
            "order": order,
            "buyer_name": order.shipping_recipient_name,
            "buyer_phone": order.shipping_mobile,
            "rows": rows,
            "checklist": _PACKING_CHECKLIST,
        }
    )
    return ctx


def render_packing_slip_pdf(order: Order) -> bytes:
    context = build_packing_slip_context(order)
    return render_pdf("arbyte/packing_slip.html", context, page_format="A5", margin="10mm", footer_html="")
