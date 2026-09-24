import datetime
from itertools import groupby

from django.db.models import QuerySet

from .context import base_context
from .persian import format_jalali_date
from .tasks import render_pdf_async

TYPE_LABELS = {
    "STOCK_IN": "ورود به انبار",
    "STOCK_OUT": "خروج از انبار",
    "ADJUSTMENT": "اصلاح موجودی",
    "RESERVATION": "رزرو",
    "RELEASE": "آزادسازی رزرو",
}


def build_stock_ledger_context(
    transactions: QuerySet, *, date_from: datetime.date | None, date_to: datetime.date | None, generated_by_name: str
) -> dict:
    """Per-variant opening balance / in / out / closing balance — a warehouse
    audit document (BACKEND-TASK.md §3.6-ب: 'گردش کالا در بازه ... سند
    حسابرسی انبار'). D-02 §۲ — روی InventoryTransaction (کاردکس واریانت)،
    نه StockMovement قدیمی. Opening balance is derived from the first
    in-range transaction's own quantity_before, so no extra query against
    transactions before date_from is needed."""
    bits = []
    if date_from:
        bits.append(f"از {format_jalali_date(date_from)}")
    if date_to:
        bits.append(f"تا {format_jalali_date(date_to)}")
    filter_summary = " ".join(bits) or "همه بازه‌ها"

    ctx = base_context(doc_title="گردش کالا در بازه", generated_by_name=generated_by_name, filter_summary=filter_summary)

    ordered = list(transactions.select_related("variant__product").order_by("variant__product__name", "created_at"))
    sections = []
    for variant_id, group in groupby(ordered, key=lambda t: t.variant_id):
        rows = list(group)
        variant_obj = rows[0].variant
        opening_balance = rows[0].quantity_before
        total_in = sum(t.quantity_change for t in rows if t.quantity_change > 0)
        total_out = sum(-t.quantity_change for t in rows if t.quantity_change < 0)
        sections.append(
            {
                "product_name": variant_obj.product.name + (f" ({variant_obj.name})" if variant_obj.name else ""),
                "sku": variant_obj.sku,
                "opening_balance": opening_balance,
                "total_in": total_in,
                "total_out": total_out,
                "closing_balance": rows[-1].quantity_after,
                "rows": [
                    {
                        "date": format_jalali_date(t.created_at),
                        "type": TYPE_LABELS.get(t.type, t.type),
                        "quantity": t.quantity_change,
                        "balance_after": t.quantity_after,
                        "reference": t.reference,
                    }
                    for t in rows
                ],
            }
        )
    ctx["sections"] = sections
    return ctx


def render_stock_ledger_pdf(
    transactions: QuerySet, *, date_from: datetime.date | None, date_to: datetime.date | None, generated_by_name: str
) -> bytes:
    context = build_stock_ledger_context(
        transactions, date_from=date_from, date_to=date_to, generated_by_name=generated_by_name
    )
    return render_pdf_async("documents/stock_ledger.html", context)
