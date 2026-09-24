import datetime

from django.db.models import QuerySet

from .context import base_context
from .pdf import render_pdf
from .persian import format_jalali_date


def build_daily_shipping_list_context(orders: QuerySet, *, target_date: datetime.date, generated_by_name: str) -> dict:
    """Orders ready to ship on a given day — taken to the post office counter,
    tracking codes are written in by hand there (BACKEND-TASK.md §3.6-ب:
    'فهرست سفارش‌های آماده ارسال ... برای بردن به باجه پست')."""
    ctx = base_context(
        doc_title="لیست ارسال روزانه",
        generated_by_name=generated_by_name,
        doc_date=format_jalali_date(target_date),
    )
    ctx["rows"] = [
        {
            "number": order.number,
            "receiver_name": (order.shipping_address or {}).get("receiverName", ""),
            "receiver_phone": (order.shipping_address or {}).get("receiverPhone", ""),
            "address_line": ", ".join(
                part
                for part in [
                    (order.shipping_address or {}).get("province", ""),
                    (order.shipping_address or {}).get("city", ""),
                    (order.shipping_address or {}).get("line", ""),
                ]
                if part
            ),
            "item_count": sum(item.quantity for item in order.items.all()),
        }
        for order in orders
    ]
    return ctx


def render_daily_shipping_list_pdf(orders: QuerySet, *, target_date: datetime.date, generated_by_name: str) -> bytes:
    context = build_daily_shipping_list_context(orders, target_date=target_date, generated_by_name=generated_by_name)
    return render_pdf("documents/daily_shipping_list.html", context)
