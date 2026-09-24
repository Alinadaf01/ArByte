import datetime
from itertools import groupby

from django.db.models import QuerySet

from .context import base_context
from .persian import format_jalali_date
from .tasks import render_pdf_async

TYPE_LABELS = {
    "purchase": "خرید",
    "production": "تولید",
    "sale": "فروش",
    "return_in": "مرجوعی",
    "adjustment": "اصلاح",
    "scrap": "ضایعات",
}


def build_stock_ledger_context(
    movements: QuerySet, *, date_from: datetime.date | None, date_to: datetime.date | None, generated_by_name: str
) -> dict:
    """Per-product opening balance / in / out / closing balance — a warehouse
    audit document (BACKEND-TASK.md §3.6-ب: 'گردش کالا در بازه ... سند
    حسابرسی انبار'). Opening balance is derived from the first in-range
    movement's own balance_after minus its quantity, so no extra query
    against movements before date_from is needed."""
    bits = []
    if date_from:
        bits.append(f"از {format_jalali_date(date_from)}")
    if date_to:
        bits.append(f"تا {format_jalali_date(date_to)}")
    filter_summary = " ".join(bits) or "همه بازه‌ها"

    ctx = base_context(doc_title="گردش کالا در بازه", generated_by_name=generated_by_name, filter_summary=filter_summary)

    ordered = list(movements.select_related("product").order_by("product__name", "created_at"))
    sections = []
    for product, group in groupby(ordered, key=lambda m: m.product_id):
        rows = list(group)
        product_obj = rows[0].product
        opening_balance = rows[0].balance_after - rows[0].quantity
        total_in = sum(m.quantity for m in rows if m.quantity > 0)
        total_out = sum(-m.quantity for m in rows if m.quantity < 0)
        sections.append(
            {
                "product_name": product_obj.name,
                "sku": product_obj.sku,
                "opening_balance": opening_balance,
                "total_in": total_in,
                "total_out": total_out,
                "closing_balance": rows[-1].balance_after,
                "rows": [
                    {
                        "date": format_jalali_date(m.created_at),
                        "type": TYPE_LABELS.get(m.type, m.type),
                        "quantity": m.quantity,
                        "balance_after": m.balance_after,
                        "reference": m.reference,
                    }
                    for m in rows
                ],
            }
        )
    ctx["sections"] = sections
    return ctx


def render_stock_ledger_pdf(
    movements: QuerySet, *, date_from: datetime.date | None, date_to: datetime.date | None, generated_by_name: str
) -> bytes:
    context = build_stock_ledger_context(
        movements, date_from=date_from, date_to=date_to, generated_by_name=generated_by_name
    )
    return render_pdf_async("documents/stock_ledger.html", context)
