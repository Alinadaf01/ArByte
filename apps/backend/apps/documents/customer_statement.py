from apps.orders.models import ORDER_STATUS_CHOICES, Order
from apps.users.models import User

from .context import base_context
from .persian import format_jalali_date, format_toman
from .tasks import render_pdf_async

_STATUS_LABELS = dict(ORDER_STATUS_CHOICES)


def build_customer_statement_context(user: User, *, generated_by_name: str) -> dict:
    """Purchase history for one customer — repeat/wholesale buyers
    (BACKEND-TASK.md §3.6-ب: 'صورتحساب مشتری ... برای خریداران تکراری و عمده')."""
    orders = Order.objects.filter(user=user).order_by("-created_at")
    paid_orders = orders.filter(paid_at__isnull=False)
    total_spent = sum(order.total for order in paid_orders)

    ctx = base_context(
        doc_title="صورتحساب مشتری",
        generated_by_name=generated_by_name,
        filter_summary=f"مشتری: {user.get_full_name()} ({user.phone})",
    )
    ctx.update(
        {
            "customer_name": user.get_full_name(),
            "customer_phone": user.phone,
            "order_count": orders.count(),
            "paid_order_count": paid_orders.count(),
            "total_spent": format_toman(total_spent),
            "rows": [
                {
                    "number": order.number,
                    "date": format_jalali_date(order.created_at),
                    "status": _STATUS_LABELS.get(order.status, order.status),
                    "item_count": sum(item.quantity for item in order.items.all()),
                    "total": format_toman(order.total),
                }
                for order in orders
            ],
        }
    )
    return ctx


def render_customer_statement_pdf(user: User, *, generated_by_name: str) -> bytes:
    context = build_customer_statement_context(user, generated_by_name=generated_by_name)
    return render_pdf_async("documents/customer_statement.html", context)
