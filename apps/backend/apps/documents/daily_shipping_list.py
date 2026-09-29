import datetime

from django.db.models import QuerySet

from .arbyte_context import arbyte_base_context
from .arbyte_formatting import format_jalali_date_fa
from .pdf import arbyte_footer_template, render_pdf


def build_daily_shipping_list_context(orders: QuerySet, *, target_date: datetime.date) -> dict:
    """E-04 §۲ — بازسازی با هویت آربایت. سفارش‌های آماده ارسال یک روز، برای
    بردن به باجه پست -- کد رهگیری آن‌جا دستی نوشته می‌شود."""
    doc_date = format_jalali_date_fa(target_date)
    ctx = arbyte_base_context(doc_title="لیست ارسال روزانه", doc_date=doc_date)
    ctx["rows"] = [
        {
            "number": order.order_number,
            "receiver_name": order.shipping_recipient_name,
            "receiver_phone": order.shipping_mobile,
            "address_line": "، ".join(
                part
                for part in [order.shipping_province, order.shipping_city, order.shipping_address_line]
                if part
            ),
            "item_count": sum(item.quantity for item in order.items.all()),
        }
        for order in orders
    ]
    return ctx


def render_daily_shipping_list_pdf(orders: QuerySet, *, target_date: datetime.date) -> bytes:
    context = build_daily_shipping_list_context(orders, target_date=target_date)
    return render_pdf(
        "arbyte/daily_shipping_list.html", context, margin="12mm", footer_html=arbyte_footer_template(generated_at=context["generated_at"])
    )
