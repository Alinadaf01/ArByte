import datetime

from django.db.models import Count, Sum

from apps.orders.models import Order, Payment

from .context import base_context
from .persian import format_jalali_date, format_toman
from .tasks import render_pdf_async

GATEWAY_LABELS = {
    "ZARINPAL": "زرین‌پال",
    "IDPAY": "آیدی‌پی",
    "SNAPPPAY": "اسنپ‌پی",
    "DIGIPAY": "دیجی‌پی",
}


def build_sales_report_context(
    *, date_from: datetime.date | None, date_to: datetime.date | None, generated_by_name: str
) -> dict:
    """For the accountant — sales/discount/tax totals plus a gateway
    breakdown (BACKEND-TASK.md §3.6-ب: 'گزارش فروش دوره‌ای ... فروش، تخفیف،
    مالیات، تفکیک درگاه')."""
    bits = []
    if date_from:
        bits.append(f"از {format_jalali_date(date_from)}")
    if date_to:
        bits.append(f"تا {format_jalali_date(date_to)}")
    filter_summary = " ".join(bits) or "همه بازه‌ها"

    orders = Order.objects.filter(paid_at__isnull=False)
    if date_from:
        orders = orders.filter(paid_at__date__gte=date_from)
    if date_to:
        orders = orders.filter(paid_at__date__lte=date_to)
    totals = orders.aggregate(
        subtotal=Sum("subtotal"), discount=Sum("discount"), shipping_cost=Sum("shipping_cost"),
        tax=Sum("tax"), total=Sum("total"), order_count=Count("id"),
    )

    payments = Payment.objects.filter(status="success")
    if date_from:
        payments = payments.filter(verified_at__date__gte=date_from)
    if date_to:
        payments = payments.filter(verified_at__date__lte=date_to)
    gateway_rows = (
        payments.values("gateway").annotate(total=Sum("amount"), order_count=Count("order_id", distinct=True)).order_by("-total")
    )

    ctx = base_context(doc_title="گزارش فروش دوره‌ای", generated_by_name=generated_by_name, filter_summary=filter_summary)
    ctx.update(
        {
            "order_count": totals["order_count"] or 0,
            "subtotal": format_toman(totals["subtotal"] or 0),
            "discount": format_toman(totals["discount"] or 0),
            "shipping_cost": format_toman(totals["shipping_cost"] or 0),
            "tax": format_toman(totals["tax"] or 0),
            "total": format_toman(totals["total"] or 0),
            "gateway_rows": [
                {
                    "gateway": GATEWAY_LABELS.get(row["gateway"], row["gateway"]),
                    "total": format_toman(row["total"]),
                    "order_count": row["order_count"],
                }
                for row in gateway_rows
            ],
        }
    )
    return ctx


def render_sales_report_pdf(*, date_from: datetime.date | None, date_to: datetime.date | None, generated_by_name: str) -> bytes:
    context = build_sales_report_context(date_from=date_from, date_to=date_to, generated_by_name=generated_by_name)
    return render_pdf_async("documents/sales_report.html", context)
