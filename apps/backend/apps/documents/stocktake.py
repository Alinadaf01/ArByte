from django.db.models import QuerySet

from .context import base_context
from .tasks import render_pdf_async


def build_stocktake_context(products: QuerySet, *, generated_by_name: str) -> dict:
    """Physical inventory count sheet — system stock plus a blank column for
    the manual count (BACKEND-TASK.md §3.6-ب: 'صورت موجودی انبار ... ستون
    خالی برای شمارش دستی')."""
    ctx = base_context(doc_title="صورت موجودی انبار", generated_by_name=generated_by_name)
    ctx["rows"] = [
        {"sku": product.sku, "name": product.name, "category": product.category.name if product.category_id else "", "system_stock": product.stock_count}
        for product in products
    ]
    return ctx


def render_stocktake_pdf(products: QuerySet, *, generated_by_name: str) -> bytes:
    context = build_stocktake_context(products, generated_by_name=generated_by_name)
    return render_pdf_async("documents/stocktake.html", context)
